const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Verify email configuration on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ EMAIL SERVER ERROR:", error.message);
        console.log("Check if EMAIL_USER and EMAIL_PASS are correct in your .env file.");
    } else {
        console.log("✅ Email server is ready to send notifications.");
    }
});

// Get all events
router.get('/', async (req, res) => {
    try {
        const [events] = await db.query('SELECT * FROM events ORDER BY event_date DESC');
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching events' });
    }
});

// Get single event
router.get('/:id', async (req, res) => {
    try {
        const [events] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(events[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching event' });
    }
});

// Create event (Admin only)
router.post('/', async (req, res) => {
    const {
        title, description, event_date, event_time, venue, city, category,
        eligibility, rules, requirements, registration_deadline, max_participants,
        contact_email, contact_phone, image_url, created_by
    } = req.body;

    try {
        const [result] = await db.query(
            `INSERT INTO events (title, description, event_date, event_time, venue, city, category,
             eligibility, rules, requirements, registration_deadline, max_participants,
             contact_email, contact_phone, image_url, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, event_date, event_time, venue, city, category,
                eligibility, rules, requirements, registration_deadline, max_participants,
                contact_email, contact_phone, image_url, created_by]
        );

        // Check if email is configured
        if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your-email')) {
            console.warn("⚠️ Email not sent: EMAIL_USER is not configured in .env");
            return res.json({ message: 'Event created, but email service not configured', eventId: result.insertId });
        }

        // Send email to all athletes (in background to prevent timeout)
        db.query('SELECT email, full_name FROM athletes WHERE email IS NOT NULL')
            .then(([athleteList]) => {
                if (athleteList.length > 0) {
                    console.log(`Starting background email delivery to ${athleteList.length} athletes...`);
                    const emailPromises = athleteList.map(athlete => {
                        const mailOptions = {
                            from: process.env.EMAIL_USER || 'your-email@gmail.com',
                            to: athlete.email,
                            subject: `New Event: ${title}`,
                            html: `
                                <h2>New Event Announcement</h2>
                                <p>Dear ${athlete.full_name || 'Athlete'},</p>
                                <p>A new event has been posted on Talent Tracker!</p>
                                <h3>${title}</h3>
                                <p><strong>Date:</strong> ${event_date}</p>
                                <p><strong>Venue:</strong> ${venue}, ${city}</p>
                                <p><strong>Category:</strong> ${category}</p>
                                <p>${description}</p>
                                <p><strong>Registration Deadline:</strong> ${registration_deadline}</p>
                                <p>Login to Talent Tracker to view full details and register!</p>
                                <p>Best regards,<br>Talent Tracker Team</p>
                            `
                        };
                        return transporter.sendMail(mailOptions).catch(err => {
                            console.error(`Failed to send email to ${athlete.email}:`, err);
                        });
                    });
                    return Promise.all(emailPromises);
                }
            })
            .then((results) => {
                if (results) console.log("Background email delivery process finished.");
            })
            .catch(err => console.error("Background email process error:", err));

        // Respond immediately so the UI doesn't hang
        res.json({ message: 'Event created successfully', eventId: result.insertId });
    } catch (error) {
        console.error("CREATE EVENT ERROR:", error);
        res.status(500).json({ error: 'Error creating event: ' + error.message });
    }
});

// Update event (Admin only)
router.put('/:id', async (req, res) => {
    const {
        title, description, event_date, event_time, venue, city, category,
        eligibility, rules, requirements, registration_deadline, max_participants,
        contact_email, contact_phone, image_url, status
    } = req.body;

    try {
        await db.query(
            `UPDATE events SET title = ?, description = ?, event_date = ?, event_time = ?,
             venue = ?, city = ?, category = ?, eligibility = ?, rules = ?, requirements = ?,
             registration_deadline = ?, max_participants = ?, contact_email = ?, contact_phone = ?,
             image_url = ?, status = ? WHERE id = ?`,
            [title, description, event_date, event_time, venue, city, category,
                eligibility, rules, requirements, registration_deadline, max_participants,
                contact_email, contact_phone, image_url, status, req.params.id]
        );

        res.json({ message: 'Event updated successfully' });
    } catch (error) {
        console.error("UPDATE EVENT ERROR:", error);
        res.status(500).json({ error: 'Error updating event: ' + error.message });
    }
});

// Delete event (Admin only)
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting event' });
    }
});

// Register for event (Athletes only)
router.post('/:id/register', async (req, res) => {
    const { athlete_id } = req.body;

    try {
        await db.query(
            'INSERT INTO event_registrations (event_id, athlete_id) VALUES (?, ?)',
            [req.params.id, athlete_id]
        );

        // Send registration confirmation email (in background)
        Promise.all([
            db.query('SELECT * FROM events WHERE id = ?', [req.params.id]),
            db.query('SELECT email, full_name FROM athletes WHERE user_id = ?', [athlete_id])
        ]).then(([[eventRes], [athleteRes]]) => {
            if (eventRes.length > 0 && athleteRes.length > 0) {
                const event = eventRes[0];
                const athlete = athleteRes[0];
                const mailOptions = {
                    from: process.env.EMAIL_USER || 'your-email@gmail.com',
                    to: athlete.email,
                    subject: `Registration Confirmed: ${event.title}`,
                    html: `
                        <h2>Registration Successful!</h2>
                        <p>Dear ${athlete.full_name},</p>
                        <p>You have successfully registered for the following event:</p>
                        <div style="background: #f4f4f4; padding: 20px; border-radius: 10px;">
                            <h3 style="margin-top:0;">${event.title}</h3>
                            <p><strong>Date:</strong> ${event.event_date}</p>
                            <p><strong>Venue:</strong> ${event.venue}, ${event.city}</p>
                        </div>
                        <p>Please ensure you arrive at least 30 minutes before the event starts.</p>
                        <p>Best regards,<br>Talent Tracker Team</p>
                    `
                };
                return transporter.sendMail(mailOptions);
            }
        }).catch(err => {
            console.error("❌ REGISTRATION EMAIL FAILED:", err.message);
        });

        res.json({ message: 'Successfully registered for event' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Already registered for this event' });
        }
        console.error("REGISTER EVENT ERROR:", error);
        res.status(500).json({ error: 'Error registering for event: ' + error.message });
    }
});

// Get athlete's registered events
router.get('/athlete/:athleteId/registrations', async (req, res) => {
    try {
        const [registrations] = await db.query(
            `SELECT e.*, er.registered_at, er.status as registration_status
             FROM event_registrations er
             JOIN events e ON er.event_id = e.id
             WHERE er.athlete_id = ?
             ORDER BY e.event_date DESC`,
            [req.params.athleteId]
        );
        res.json(registrations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching registrations' });
    }
});

module.exports = router;
