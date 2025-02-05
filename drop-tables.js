const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database');
});

const tables = [
    'Users',
    'Files',
    'Transactions',
    'Events',
    'Notes'
];

db.serialize(() => {
    // First, turn off foreign key constraints
    db.run('PRAGMA foreign_keys = OFF;');

    // Drop each table
    tables.forEach(table => {
        db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
            if (err) {
                console.error(`Error dropping table ${table}:`, err);
            } else {
                console.log(`Successfully dropped table ${table}`);
            }
        });
    });

    // Turn foreign key constraints back on
    db.run('PRAGMA foreign_keys = ON;');

    console.log('All tables dropped successfully');
    
    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
    });
});