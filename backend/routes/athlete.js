const express = require('express');
const router = express.Router();
const db = require('../db');

// Get All Athletes
router.get('/', async (req, res) => {
    try {
        const [athletes] = await db.query('SELECT * FROM athletes');
        const [events] = await db.query('SELECT * FROM athlete_events');

        // Map events to athlete_id
        const eventsMap = {};
        events.forEach(e => {
            if (!eventsMap[e.athlete_id]) eventsMap[e.athlete_id] = [];
            eventsMap[e.athlete_id].push({ event: e.event_name, pb: e.personal_best }); // Changed pb_seconds to personal_best based on schema
        });

        const results = athletes.map(a => ({
            id: a.user_id,
            username: a.full_name,
            personal: {
                fullName: a.full_name,
                address: { city: a.city },
                city: a.city
            },
            email: a.email,
            athletic: {
                category: a.category,
                events: eventsMap[a.user_id] || []
            },
            documents: { profilePic: a.profile_pic_url },
            status: a.status
        }));

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching athletes' });
    }
});

// Get Athlete Profile (Full)
router.get('/:id', async (req, res) => {
    try {
        const [athletes] = await db.query('SELECT * FROM athletes WHERE user_id = ?', [req.params.id]);
        if (athletes.length === 0) {
            return res.json({ exists: false });
        }

        let athlete = athletes[0];

        // Parallel Fetch
        const [events] = await db.query('SELECT * FROM athlete_events WHERE athlete_id = ?', [req.params.id]);
        const [achievements] = await db.query('SELECT * FROM athlete_achievements WHERE athlete_id = ?', [req.params.id]);
        const [performances] = await db.query('SELECT * FROM athlete_performance_results WHERE athlete_id = ?', [req.params.id]);

        // Fetch Squad (Fetch user's assigned squad)
        const [squads] = await db.query(
            `SELECT s.id, s.name, s.workout_plan, s.coach_id, c.full_name as coach_name 
             FROM squad_athletes sa 
             JOIN squads s ON sa.squad_id = s.id 
             LEFT JOIN coaches c ON s.coach_id = c.user_id 
             WHERE sa.athlete_id = ?`,
            [req.params.id]
        );
        const squadData = squads.length > 0 ? squads[0] : null;

        // Group performances by event
        const perfMap = {};
        performances.forEach(p => {
            if (!perfMap[p.event_name]) perfMap[p.event_name] = [];
            perfMap[p.event_name].push({ date: p.date, time: p.time, createdAt: p.created_at });
        });

        // Verifications mapping (achievements)
        const verifications = {};
        achievements.forEach(ach => {
            if (ach.verified) {
                verifications[ach.id] = { verified: true, by: ach.verified_by, coachId: ach.verifier_id, notes: ach.verifier_notes, at: ach.verified_at };
            }
        });

        const profileData = {
            exists: true,
            username: athlete.full_name,
            personal: {
                fullName: athlete.full_name,
                dob: athlete.dob,
                gender: athlete.gender,
                phone: athlete.phone,
                email: athlete.email,
                address: {
                    street: athlete.street,
                    city: athlete.city
                }
            },
            athletic: {
                category: athlete.category,
                coach: athlete.coach_name,
                trainingDays: athlete.training_days,
                events: events.map(e => ({
                    event: e.event_name,
                    pb: e.personal_best,
                    experience: e.experience,
                    bestCompetition: e.best_competition
                }))
            },
            medicalPhysical: {
                height: athlete.height,
                weight: athlete.weight,
                blood: athlete.blood_type,
                allergies: athlete.allergies,
                medical: athlete.medical_conditions,
                mealPlan: athlete.meal_plan
            },
            playingLevel: {
                school: athlete.school,
                club: athlete.club
            },
            documents: {
                profilePic: athlete.profile_pic_url,
                idDoc: athlete.id_doc_url,
                consentDoc: athlete.consent_doc_url,
                clubIDDoc: athlete.club_id_doc_url
            },
            status: athlete.status,
            achievementsList: achievements.map(a => ({
                id: a.id,
                event: a.event,
                meet: a.meet,
                place: a.place,
                age: a.age_category,
                url: a.proof_url,
                date: a.date
            })),
            performanceResults: perfMap,
            verifications: verifications,
            squad: squadData
        };

        res.json(profileData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching profile' });
    }
});

// Update/Create Athlete Profile (Main Info)
router.post('/:id', async (req, res) => {
    // ... (Keep existing logic mostly, but handle performance/achievements separately or ignore here)
    // The previous logic for athletes table + athlete_events table is fine.
    // I will include the existing POST implementation below.
    const userId = req.params.id;
    const data = req.body;

    const p = data.personal || {};
    const a = data.athletic || {};
    const m = data.medicalPhysical || {};
    const l = data.playingLevel || {};
    const d = data.documents || {};

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const athleteQuery = `
            INSERT INTO athletes (
                user_id, full_name, dob, gender, phone, email, street, city,
                category, coach_name, training_days,
                height, weight, blood_type, allergies, medical_conditions, meal_plan,
                school, club, status,
                profile_pic_url, id_doc_url, consent_doc_url, club_id_doc_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                full_name=VALUES(full_name), dob=VALUES(dob), gender=VALUES(gender), phone=VALUES(phone),
                email=VALUES(email), street=VALUES(street), city=VALUES(city), category=VALUES(category), coach_name=VALUES(coach_name),
                training_days=VALUES(training_days), height=VALUES(height), weight=VALUES(weight),
                blood_type=VALUES(blood_type), allergies=VALUES(allergies), medical_conditions=VALUES(medical_conditions),
                meal_plan=VALUES(meal_plan), school=VALUES(school), club=VALUES(club), status=VALUES(status),
                profile_pic_url=VALUES(profile_pic_url), id_doc_url=VALUES(id_doc_url),
                consent_doc_url=VALUES(consent_doc_url), club_id_doc_url=VALUES(club_id_doc_url)
        `;

        const athleteParams = [
            userId, p.fullName, p.dob, p.gender, p.phone, p.email, p.address?.street, p.address?.city,
            a.category, a.coach, a.trainingDays,
            m.height, m.weight, m.blood, m.allergies, m.medical, m.mealPlan,
            l.school, l.club, data.status || 'Pending',
            d.profilePic || null, d.idDoc || null, d.consentDoc || null, d.clubIDDoc || null
        ];

        // Only update if not null? No, full update is fine.
        // Wait, if d.profilePic is missing (e.g. from Dashboard updating achievements), I might overwrite with null?
        // But dashboard.js doesn't call this endpoint for achievements. Using separate endpoints now.
        // createprofile.js calls this. It sends full data.
        await connection.query(athleteQuery, athleteParams);

        // Events
        if (a.events !== undefined) {
            await connection.query('DELETE FROM athlete_events WHERE athlete_id = ?', [userId]);
            if (a.events.length > 0) {
                for (const evt of a.events) {
                    await connection.query(
                        'INSERT INTO athlete_events (athlete_id, event_name, personal_best, experience, best_competition) VALUES (?, ?, ?, ?, ?)',
                        [userId, evt.event, evt.pb, evt.experience, evt.bestCompetition]
                    );
                }
            }
        }

        // If "documents" key is present but only has partial data, we need to be careful with replacing all URLs.
        // The SQL query handles updating specific fields based on VALUES provided.
        // If I send null for profile_pic_url, it updates to NULL.
        // createprofile.js sends merged docs, so it's safe.

        await connection.commit();
        res.json({ message: 'Profile saved successfully' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error saving profile' });
    } finally {
        connection.release();
    }
});

// Add Achievement
router.post('/:id/achievement', async (req, res) => {
    const userId = req.params.id;
    const { event, meet, place, age, url, date } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO athlete_achievements (athlete_id, event, meet, place, age_category, proof_url, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, event, meet, place, age, url, date]
        );
        res.json({ id: result.insertId, message: 'Achievement added' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error adding achievement' });
    }
});

// Remove Achievement
router.delete('/:id/achievement/:achId', async (req, res) => {
    try {
        await db.query('DELETE FROM athlete_achievements WHERE id = ? AND athlete_id = ?', [req.params.achId, req.params.id]);
        res.json({ message: 'Achievement removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error removing achievement' });
    }
});

// Add Performance
router.post('/:id/performance', async (req, res) => {
    const userId = req.params.id;
    const { event, date, time } = req.body;
    try {
        await db.query(
            'INSERT INTO athlete_performance_results (athlete_id, event_name, date, time) VALUES (?, ?, ?, ?)',
            [userId, event, date, time]
        );
        res.json({ message: 'Performance added' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error adding performance' });
    }
});

router.post('/:id/achievement/:achId/verify', async (req, res) => {
    const { by, coachId, notes, at } = req.body;
    try {
        await db.query(
            'UPDATE athlete_achievements SET verified=?, verified_by=?, verifier_id=?, verifier_notes=?, verified_at=? WHERE id=? AND athlete_id=?',
            [true, by, coachId, notes, at, req.params.achId, req.params.id]
        );
        res.json({ message: 'Achievement verified' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error verifying achievement' });
    }
});

router.post('/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await db.query('UPDATE athletes SET status = ? WHERE user_id = ?', [status, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating status' });
    }
});

// Save Admin Note
router.post('/:id/admin-note', async (req, res) => {
    const { note } = req.body;
    try {
        await db.query(
            'UPDATE athletes SET admin_notes = ? WHERE user_id = ?',
            [note, req.params.id]
        );
        res.json({ message: 'Admin note saved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error saving admin note' });
    }
});

// Get Admin Note
router.get('/:id/admin-note', async (req, res) => {
    try {
        const [athletes] = await db.query(
            'SELECT admin_notes FROM athletes WHERE user_id = ?',
            [req.params.id]
        );
        if (athletes.length === 0) {
            return res.status(404).json({ error: 'Athlete not found' });
        }
        res.json({ note: athletes[0].admin_notes || '' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching admin note' });
    }
});

module.exports = router;
