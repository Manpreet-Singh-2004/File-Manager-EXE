const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

async function createAdminUser() {
    const db = new sqlite3.Database(path.join(__dirname, 'database.db'));
    
    try {
        // Admin credentials
        const username = 'admin';
        const password = 'admin123'; // You should change this
        const email = 'admin@example.com';

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert admin user
        const query = 'INSERT INTO Users (username, password_hash, email) VALUES (?, ?, ?)';
        db.run(query, [username, password_hash, email], function(err) {
            if (err) {
                console.error('Error creating admin user:', err);
            } else {
                console.log('Admin user created successfully!');
                console.log('Username:', username);
                console.log('Password:', password);
            }
            
            // Close database connection
            db.close();
        });
    } catch (error) {
        console.error('Error:', error);
        db.close();
    }
}

createAdminUser();