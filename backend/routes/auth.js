const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_super_secret_key_change_this';

// REGISTER
router.post('/register', async (req, res) => {
    const { email, password, username, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    try {
        // Check if user exists (email or username)
        const [existing] = await db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email or Username already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (email, password_hash, username, role) VALUES (?, ?, ?, ?)',
            [email, passwordHash, username, role]
        );

        const userId = result.insertId;
        const token = jwt.sign({ id: userId, email, role }, SECRET_KEY, { expiresIn: '24h' });

        res.json({ message: 'User registered successfully', token, user: { uid: userId, email, username, role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email: identifier, password, role } = req.body;

    try {
        let query = 'SELECT * FROM users WHERE (email = ? OR username = ?)';
        let params = [identifier, identifier];

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
