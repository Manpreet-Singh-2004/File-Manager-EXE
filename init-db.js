const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create and initialize the database
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to database');
        initializeTables();
    }
});

function initializeTables() {
    // Create Users table
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS Users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            email TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Create Files table
    const createFilesTable = `
        CREATE TABLE IF NOT EXISTS Files (
            file_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            file_name TEXT NOT NULL,
            alias_name TEXT,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            file_type TEXT,
            is_synced BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id)
        )
    `;

    // Create Transactions table
    const createTransactionsTable = `
        CREATE TABLE IF NOT EXISTS Transactions (
            transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            transaction_type TEXT CHECK (transaction_type IN ('income', 'expense')) NOT NULL,
            category TEXT,
            description TEXT,
            receipt_id TEXT UNIQUE,
            transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id)
        )
    `;

    // Create Events table
    const createEventsTable = `
        CREATE TABLE IF NOT EXISTS Events (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            event_name TEXT NOT NULL,
            event_description TEXT,
            start_date DATE NOT NULL,
            start_time TIME,
            end_date DATE,
            end_time TIME,
            alarm_date DATE,
            alarm_time TIME,
            is_recurring BOOLEAN DEFAULT 0,
            recurrence_pattern TEXT,
            notification_sent BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id)
        )
    `;

    // Create Notes table
    const createNotesTable = `
    CREATE TABLE IF NOT EXISTS Notes (
        note_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        is_todo BOOLEAN DEFAULT 0,
        is_completed BOOLEAN DEFAULT 0,
        due_date DATE,
        priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(user_id)
    )
`;
    // Execute all create table queries
    db.serialize(() => {
        db.run(createUsersTable, (err) => {
            if (err) console.error('Error creating Users table:', err);
            else console.log('Users table created successfully');
        });

        db.run(createFilesTable, (err) => {
            if (err) console.error('Error creating Files table:', err);
            else console.log('Files table created successfully');
        });

        db.run(createTransactionsTable, (err) => {
            if (err) console.error('Error creating Transactions table:', err);
            else console.log('Transactions table created successfully');
        });

        db.run(createEventsTable, (err) => {
            if (err) console.error('Error creating Events table:', err);
            else console.log('Events table created successfully');
        });

        db.run(createNotesTable, (err) => {
            if (err) console.error('Error creating Notes table:', err);
            else console.log('Notes table created successfully');
        });

        // Close the database connection after all tables are created
        db.close((err) => {
            if (err) console.error('Error closing database:', err);
            else console.log('Database initialization completed successfully');
        });
    });
}