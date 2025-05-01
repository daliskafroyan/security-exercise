const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
async function initializeDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password'
    });
    try {
        const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
        const statements = schema.split(';').filter(stmt => stmt.trim());
        for (let statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
            }
        }
        console.log('Database initialized successfully!');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        await connection.end();
    }
}
if (require.main === module) {
    initializeDatabase();
}
module.exports = initializeDatabase; 