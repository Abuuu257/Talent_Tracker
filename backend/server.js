require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const athleteRoutes = require('./routes/athlete');
const coachRoutes = require('./routes/coach');
const uploadRoutes = require('./routes/upload');
const eventsRoutes = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, '../'))); // Serve root folder

// Serve Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/athlete', athleteRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/events', eventsRoutes);

// Fallback to index.html for SPA-like navigation (if needed)
app.get('*', (req, res) => {
    // Exclude API routes
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
