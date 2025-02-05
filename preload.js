const { contextBridge } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

console.log('Preload script started');

// Database connection
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to database');
    }
});

db.serialize(() => {
    // Check if Notes table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Notes'", (err, row) => {
        if (err) {
            console.error('Error checking Notes table:', err);
            return;
        }

        if (!row) {
            console.log('Creating Notes table...');
            db.run(`
                CREATE TABLE Notes (
                    note_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT,
                    is_todo INTEGER DEFAULT 0,
                    is_completed INTEGER DEFAULT 0,
                    due_date TEXT,
                    priority TEXT DEFAULT 'low',
                    created_at TEXT NOT NULL,
                    last_modified TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES Users(user_id)
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating Notes table:', err);
                } else {
                    console.log('Notes table created successfully');
                }
            });
        } else {
            console.log('Notes table already exists');
        }
    });
});

// Expose APIs
searchAll: async (userId, searchTerm) => {
    return new Promise((resolve, reject) => {
        const searchResults = [];
        const searchPromises = [];

        // Search in Files
        searchPromises.push(new Promise((resolve, reject) => {
            const fileQuery = `
                SELECT *, 'file' as type FROM Files 
                WHERE user_id = ? AND (
                    file_name LIKE ? OR 
                    alias_name LIKE ? OR 
                    file_type LIKE ?
                )
            `;
            const searchPattern = `%${searchTerm}%`;
            
            db.all(fileQuery, [userId, searchPattern, searchPattern, searchPattern], (err, rows) => {
                if (err) {
                    console.error('Error searching files:', err);
                    resolve([]); // Don't reject, just return empty results
                } else {
                    resolve(rows);
                }
            });
        }));

        // Search in Notes
        searchPromises.push(new Promise((resolve, reject) => {
            const noteQuery = `
                SELECT *, 'note' as type FROM Notes 
                WHERE user_id = ? AND (
                    title LIKE ? OR 
                    content LIKE ?
                )
            `;
            const searchPattern = `%${searchTerm}%`;
            
            db.all(noteQuery, [userId, searchPattern, searchPattern], (err, rows) => {
                if (err) {
                    console.error('Error searching notes:', err);
                    resolve([]); // Don't reject, just return empty results
                } else {
                    resolve(rows);
                }
            });
        }));

        // Combine all search results
        Promise.all(searchPromises)
            .then(results => {
                const allResults = results.flat().sort((a, b) => {
                    return new Date(b.created_at) - new Date(a.created_at);
                });
                resolve(allResults);
            })
            .catch(error => {
                console.error('Search error:', error);
                reject(new Error('Search failed'));
            });
    });
}
contextBridge.exposeInMainWorld(
    'api',
    {
        // Test connection
        testConnection: () => {
            return 'API is connected';
        },

        // Login user
        loginUser: async (userData) => {
            console.log('Login attempt:', userData.username);
            return new Promise((resolve, reject) => {
                const { username, password } = userData;
                
                db.get('SELECT * FROM Users WHERE username = ?', [username], async (err, user) => {
                    if (err) {
                        console.error('Database error:', err);
                        reject(new Error('Database error'));
                        return;
                    }
                    
                    if (!user) {
                        reject(new Error('User not found'));
                        return;
                    }

                    try {
                        const match = await bcrypt.compare(password, user.password_hash);
                        if (match) {
                            resolve({
                                userId: user.user_id,
                                username: user.username
                            });
                        } else {
                            reject(new Error('Invalid password'));
                        }
                    } catch (error) {
                        console.error('Password comparison error:', error);
                        reject(new Error('Authentication error'));
                    }
                });
            });
        },

        // Register user
        registerUser: async (userData) => {
            console.log('Registration attempt:', userData.username);
            return new Promise(async (resolve, reject) => {
                try {
                    const { username, password, email } = userData;

                    // Check if username exists
                    db.get('SELECT username FROM Users WHERE username = ?', [username], async (err, row) => {
                        if (err) {
                            reject(new Error('Database error'));
                            return;
                        }

                        if (row) {
                            reject(new Error('Username already exists'));
                            return;
                        }

                        try {
                            // Hash password
                            const salt = await bcrypt.genSalt(10);
                            const password_hash = await bcrypt.hash(password, salt);

                            // Insert new user
                            db.run(
                                'INSERT INTO Users (username, password_hash, email) VALUES (?, ?, ?)',
                                [username, password_hash, email],
                                function(err) {
                                    if (err) {
                                        console.error('Registration error:', err);
                                        reject(new Error('Registration failed'));
                                        return;
                                    }
                                    
                                    resolve({
                                        userId: this.lastID,
                                        username: username
                                    });
                                }
                            );
                        } catch (error) {
                            console.error('Password hashing error:', error);
                            reject(new Error('Registration failed'));
                        }
                    });
                } catch (error) {
                    console.error('Registration error:', error);
                    reject(new Error('Registration failed'));
                }
            });
        },

        // Get files
        getFiles: async (userId) => {
            return new Promise((resolve, reject) => {
                const query = `
                    SELECT * FROM Files 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC
                `;
                
                db.all(query, [userId], (err, rows) => {
                    if (err) {
                        console.error('Error fetching files:', err);
                        reject(new Error('Failed to fetch files'));
                        return;
                    }
                    resolve(rows);
                });
            });
        },

        // Upload file
        uploadFile: async (fileData) => {
            return new Promise((resolve, reject) => {
                try {
                    const {
                        userId,
                        fileName,
                        aliasName,
                        fileSize,
                        fileType,
                        fileContent
                    } = fileData;

                    // Generate unique file path
                    const timestamp = Date.now();
                    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const uploadsDir = path.join(__dirname, 'uploads');
                    const filePath = path.join(uploadsDir, `${timestamp}_${safeName}`);

                    console.log('Uploading file:', {
                        fileName,
                        filePath,
                        fileSize
                    });

                    // Ensure uploads directory exists
                    if (!fs.existsSync(uploadsDir)) {
                        fs.mkdirSync(uploadsDir, { recursive: true });
                    }

                    // Convert ArrayBuffer to Buffer and write file
                    const buffer = Buffer.from(fileContent);
                    fs.writeFileSync(filePath, buffer);

                    console.log('File written successfully');

                    const query = `
                        INSERT INTO Files (
                            user_id, file_name, alias_name, file_path, 
                            file_size, file_type, is_synced, created_at, last_modified
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    `;

                    db.run(
                        query,
                        [userId, fileName, aliasName, filePath, fileSize, fileType, 1],
                        function(err) {
                            if (err) {
                                console.error('Database error:', err);
                                reject(new Error('Failed to save file information'));
                                return;
                            }

                            resolve({
                                fileId: this.lastID,
                                fileName,
                                aliasName,
                                filePath,
                                fileSize,
                                fileType,
                                createdAt: new Date().toISOString()
                            });
                        }
                    );
                } catch (error) {
                    console.error('Upload error:', error);
                    reject(error);
                }
            });
        },

        // Delete file
        deleteFile: async (fileId, userId) => {
            return new Promise((resolve, reject) => {
                db.get(
                    'SELECT file_path FROM Files WHERE file_id = ? AND user_id = ?',
                    [fileId, userId],
                    (err, file) => {
                        if (err) {
                            reject(new Error('Failed to find file'));
                            return;
                        }

                        if (!file) {
                            reject(new Error('File not found'));
                            return;
                        }

                        // Delete the actual file if it exists
                        if (fs.existsSync(file.file_path)) {
                            try {
                                fs.unlinkSync(file.file_path);
                                console.log('File deleted from disk:', file.file_path);
                            } catch (error) {
                                console.error('Error deleting file from disk:', error);
                            }
                        }

                        // Delete the database entry
                        db.run(
                            'DELETE FROM Files WHERE file_id = ? AND user_id = ?',
                            [fileId, userId],
                            (err) => {
                                if (err) {
                                    reject(new Error('Failed to delete file record'));
                                    return;
                                }
                                resolve({ success: true });
                            }
                        );
                    }
                );
            });
        },

        // Download file
        downloadFile: async (fileId, userId) => {
            return new Promise((resolve, reject) => {
                // First get the file details from database
                db.get(
                    'SELECT file_path, file_name FROM Files WHERE file_id = ? AND user_id = ?',
                    [fileId, userId],
                    (err, file) => {
                        if (err) {
                            console.error('Database error:', err);
                            reject(new Error('Failed to fetch file information'));
                            return;
                        }

                        if (!file) {
                            reject(new Error('File not found'));
                            return;
                        }

                        try {
                            console.log('Downloading file:', file.file_path);

                            if (!fs.existsSync(file.file_path)) {
                                reject(new Error('File not found on disk'));
                                return;
                            }

                            // Read the file content
                            const fileContent = fs.readFileSync(file.file_path);
                            
                            // Get downloads folder path
                            const downloadsPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads');
                            const targetPath = path.join(downloadsPath, file.file_name);
                            
                            // Write to downloads folder
                            fs.writeFileSync(targetPath, fileContent);
                            
                            console.log('File downloaded to:', targetPath);
                            resolve({ 
                                success: true, 
                                path: targetPath,
                                fileName: file.file_name 
                            });
                        } catch (error) {
                            console.error('Download error:', error);
                            reject(new Error('Failed to download file'));
                        }
                    }
                );
            });
        },
    

    // Notes

    getNotes: async (userId) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM Notes 
                WHERE user_id = ? 
                ORDER BY 
                    CASE 
                        WHEN priority = 'high' THEN 1
                        WHEN priority = 'medium' THEN 2
                        WHEN priority = 'low' THEN 3
                    END,
                    created_at DESC
            `;
            
            db.all(query, [userId], (err, rows) => {
                if (err) {
                    console.error('Error fetching notes:', err);
                    reject(new Error('Failed to fetch notes'));
                    return;
                }
                resolve(rows);
            });
        });
    },
    
    // Create note
    createNote: async (noteData) => {
        return new Promise((resolve, reject) => {
            console.log('Creating note with data:', noteData); // Debug log
    
            const query = `
                INSERT INTO Notes (
                    user_id, title, content, is_todo, is_completed,
                    due_date, priority, created_at, last_modified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `;
            
            const params = [
                noteData.userId,
                noteData.title,
                noteData.content,
                noteData.isTodo ? 1 : 0,
                noteData.isCompleted ? 1 : 0,
                noteData.dueDate || null,
                noteData.priority
            ];
    
            console.log('SQL Query:', query); // Debug log
            console.log('Parameters:', params); // Debug log
    
            db.run(query, params, function(err) {
                if (err) {
                    console.error('Detailed error creating note:', err); // Detailed error log
                    reject(new Error(`Failed to create note: ${err.message}`));
                    return;
                }
                
                // Log success
                console.log('Note created successfully with ID:', this.lastID);
                
                resolve({
                    noteId: this.lastID,
                    ...noteData
                });
            });
        });
    },

    updateNote: async (noteData) => {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE Notes 
                SET 
                    title = ?,
                    content = ?,
                    is_todo = ?,
                    is_completed = ?,
                    due_date = ?,
                    priority = ?,
                    last_modified = datetime('now')
                WHERE note_id = ? AND user_id = ?
            `;
            
            const params = [
                noteData.title,
                noteData.content,
                noteData.isTodo ? 1 : 0,
                noteData.isCompleted ? 1 : 0,
                noteData.dueDate || null,
                noteData.priority,
                noteData.noteId,
                noteData.userId
            ];
    
            db.run(query, params, function(err) {
                if (err) {
                    console.error('Error updating note:', err);
                    reject(new Error('Failed to update note'));
                    return;
                }
    
                if (this.changes === 0) {
                    reject(new Error('Note not found or unauthorized'));
                    return;
                }
                
                resolve({
                    ...noteData,
                    updated: true
                });
            });
        });
    },
    
    // Delete note
    deleteNote: async (noteId, userId) => {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM Notes WHERE note_id = ? AND user_id = ?';
            
            db.run(query, [noteId, userId], function(err) {
                if (err) {
                    console.error('Error deleting note:', err);
                    reject(new Error('Failed to delete note'));
                    return;
                }
    
                if (this.changes === 0) {
                    reject(new Error('Note not found or unauthorized'));
                    return;
                }
                
                resolve({ success: true });
            });
        });
    }
}
);

console.log('Preload script completed');