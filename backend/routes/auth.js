const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_super_secret_key_change_this';

// REGISTER
router.post('/register', async (req, res) => {
    const { email, password, username, role, phone } = req.body;

    if (!password || !role || !phone) {
        return res.status(400).json({ error: 'Password, role, and phone are required' });
    }

    try {
        // Check if user exists (phone, username, or email if provided)
        let query = 'SELECT * FROM users WHERE phone = ? OR username = ?';
        let params = [phone, username];

        if (email) {
            query += ' OR email = ?';
            params.push(email);
        }

        const [existing] = await db.query(query, params);
        if (existing.length > 0) {
            if (email && existing[0].email === email) return res.status(400).json({ error: 'Email already exists' });
            if (existing[0].username === username) return res.status(400).json({ error: 'Username already exists' });
            if (existing[0].phone === phone) return res.status(400).json({ error: 'Phone number already exists' });
            return res.status(400).json({ error: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (email, password_hash, username, role, phone) VALUES (?, ?, ?, ?, ?)',
            [email || null, passwordHash, username, role, phone]
        );

        const userId = result.insertId;
        const token = jwt.sign({ id: userId, email, role }, SECRET_KEY, { expiresIn: '24h' });

        res.json({ message: 'User registered successfully', token, user: { uid: userId, email, username, role, phone } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email: identifier, password, role } = req.body;

    try {
        let query = 'SELECT * FROM users WHERE (email = ? OR phone = ? OR username = ?)';
        let params = [identifier, identifier, identifier];

        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }

        const [users] = await db.query(query, params);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '24h' });

        res.json({
            message: 'Login successful',
            token,
            user: {
                uid: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// GET USER BY USERNAME
router.get('/user/:username', async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [req.params.username]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = users[0];
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching user' });
    }
});

module.exports = router;
