const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db/connection');
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const [existingUsers] = await db.query(`SELECT * FROM users WHERE username = '${username}' OR email = '${email}'`);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            `INSERT INTO users (username, email, password) VALUES ('${username}', '${email}', '${hashedPassword}')`
        );
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
        if (users.length === 0) {
            return res.status(401).render('login', {
                title: 'Login',
                error: 'Invalid credentials'
            });
        }
        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).render('login', {
                title: 'Login',
                error: 'Invalid credentials'
            });
        }
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };
        res.redirect('/products');
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).render('login', {
            title: 'Login',
            error: 'An error occurred during login. Please try again.'
        });
    }
});
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.redirect('/');
    });
});
router.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    res.json({ user: req.session.user });
});
router.get('/test-bcrypt', async (req, res) => {
    try {
        const testPassword = 'admin123';
        const hashedPassword = '$2b$10$nq924gUtUwdsCw91OHT2u.BZWB5L5g6/9pRQiKCUlHIXMsNUwjNj.';
        const isMatch = await bcrypt.compare(testPassword, hashedPassword);
        res.json({
            password: testPassword,
            hash: hashedPassword,
            isMatch: isMatch
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/reset-admin', async (req, res) => {
    try {
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(`UPDATE users SET password = '${hashedPassword}' WHERE username = 'admin'`);
        res.json({
            message: 'Admin password reset',
            newHash: hashedPassword
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/users/search', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        const sqlQuery = `SELECT id, username, email, role FROM users WHERE username LIKE '%${query}%' OR email LIKE '%${query}%'`;
        console.log('Executing user search query:', sqlQuery);
        const [users] = await db.query(sqlQuery);
        res.json({
            users,
            query: sqlQuery 
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({
            message: 'Error searching users',
            error: error.message,
            query: req.query.query 
        });
    }
});
module.exports = router; 