const mysql = require('mysql2');
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ecommerce',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Database connected successfully');
        connection.release();
    }
});
module.exports = pool.promise(); 