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

// Expose APIs
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
        downloadFile: async (filePath, fileName) => {
            return new Promise((resolve, reject) => {
                try {
                    console.log('Downloading file:', filePath);

                    if (!fs.existsSync(filePath)) {
                        reject(new Error('File not found'));
                        return;
                    }

                    // Read the file
                    const fileContent = fs.readFileSync(filePath);
                    
                    // Get downloads folder path
                    const downloadsPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads', fileName);
                    
                    // Write to downloads folder
                    fs.writeFileSync(downloadsPath, fileContent);
                    
                    console.log('File downloaded to:', downloadsPath);
                    resolve({ success: true, path: downloadsPath });
                } catch (error) {
                    console.error('Download error:', error);
                    reject(new Error('Failed to download file'));
                }
            });
        }
    }
);

console.log('Preload script completed');