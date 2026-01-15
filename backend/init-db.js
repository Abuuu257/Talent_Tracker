const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function init() {
    const dbConfig = {
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
        port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
        multipleStatements: true
    };

    const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'talent_tracker';

    // If we are on Railway or have a specific DB, try connecting to it directly
    if (process.env.MYSQLDATABASE || process.env.DB_NAME) {
        dbConfig.database = dbName;
    }

    let connection;
    try {
        console.log(`Connecting to MySQL at ${dbConfig.host}...`);
        connection = await mysql.createConnection(dbConfig);

        // If we didn't connect to a specific DB (e.g. localhost root), verify/create it
        if (!dbConfig.database) {
            console.log(`Checking database '${dbName}'...`);
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
            await connection.query(`USE \`${dbName}\`;`);
        } else {
            console.log(`Connected directly to database: ${dbConfig.database}`);
        }

        console.log(`Reading schema.sql...`);
        const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

        console.log(`Executing schema...`);
        // Remove CREATE DATABASE or USE commands if they still exist in the file to avoid errors
        const sqlCleaned = sql
            .replace(/CREATE DATABASE\s.*?;/gi, '')
            .replace(/USE\s.*?;/gi, '');

        await connection.query(sqlCleaned);
        console.log('Database schema updated.');

        // Create default admin if not exists
        const [existingAdmin] = await connection.query('SELECT * FROM users WHERE role = "federation"');
        if (existingAdmin.length === 0) {
            console.log('Creating default federation admin...');
            const bcrypt = require('bcrypt');
            const hashedPw = await bcrypt.hash('admin123', 10);
            await connection.query(
                'INSERT INTO users (email, password_hash, username, role) VALUES (?, ?, ?, ?)',
                ['federation@talenttracker.com', hashedPw, 'admin', 'federation']
            );
            console.log('Admin account created: admin / admin123');
        }

        console.log('Database initialized successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error initializing database:', err);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

init();
