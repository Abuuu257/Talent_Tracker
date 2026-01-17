const express = require('express');
const router = express.Router();
const db = require('../db');

// Get All Coaches
router.get('/', async (req, res) => {
    try {
        const [coaches] = await db.query('SELECT * FROM coaches');
        const results = coaches.map(c => ({
            id: c.user_id,
            fullName: c.full_name,
            email: c.email,
            personalInfo: { fullName: c.full_name, specialization: c.sports }, // Approximate
            coachingBio: { specialization: c.sports },
            status: c.status,
            profilePic: c.profile_pic_url,
            federationApproval: { status: c.status ? c.status.toLowerCase() : 'pending' }
        }));
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching coaches' });
    }
});

// Get Coach Profile
router.get('/:id', async (req, res) => {
    try {
        const [coaches] = await db.query('SELECT * FROM coaches WHERE user_id = ?', [req.params.id]);
        if (coaches.length === 0) {
            return res.json({ exists: false });
        }

        const c = coaches[0];

        // Fetch Favorites
        const [favs] = await db.query('SELECT athlete_id FROM coach_favorites WHERE coach_id = ?', [req.params.id]);
        const favorites = favs.map(f => f.athlete_id);

        // Fetch Squads
        const [squads] = await db.query('SELECT * FROM squads WHERE coach_id = ?', [req.params.id]);

        // Fetch Squad Assignments
        const [assignments] = await db.query(
            `SELECT sa.athlete_id, s.name as squad_name, s.id as squad_id
             FROM squad_athletes sa
             JOIN squads s ON sa.squad_id = s.id
             WHERE s.coach_id = ?`,
            [req.params.id]
        );

        const data = {
            exists: true,
            username: c.full_name,
            fullName: c.full_name,
            email: c.email,
            phone: c.phone,
            dob: c.dob,
            gender: c.gender,
            nationality: c.nationality,
            nic: c.nic,
            street: c.street,
            city: c.city,
            district: c.district,
            province: c.province,
            sports: c.sports,
            coachingLevel: c.coaching_level,
            coachingRole: c.coaching_role,
            experience: c.experience_years,
            organization: c.organization,
            highestQual: c.highest_qualification,
            issuingAuthority: c.issuing_authority,
            certId: c.certificate_id,
            availDays: c.available_days,
            timeSlots: c.time_slots,
            locationPref: c.location_preference,
            profilePic: c.profile_pic_url,
            certDoc: c.certificate_url,
            status: c.status,
            favorites: favorites,
            squads: squads,
            assignments: assignments
        };
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching coach profile' });
    }
});

// Update Coach Profile
router.post('/:id', async (req, res) => {
    const userId = req.params.id;
    const d = req.body;

    try {
        const query = `
            INSERT INTO coaches (
                user_id, full_name, gender, dob, nationality, nic, phone, email,
                street, city, district, province, sports, coaching_level,
                coaching_role, experience_years, organization, highest_qualification,
                issuing_authority, certificate_id, certificate_url, available_days,
                time_slots, location_preference, status, profile_pic_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                full_name=VALUES(full_name), gender=VALUES(gender), dob=VALUES(dob), nationality=VALUES(nationality),
                nic=VALUES(nic), phone=VALUES(phone), email=VALUES(email), street=VALUES(street),
                city=VALUES(city), district=VALUES(district), province=VALUES(province), sports=VALUES(sports),
                coaching_level=VALUES(coaching_level), coaching_role=VALUES(coaching_role), experience_years=VALUES(experience_years),
                organization=VALUES(organization), highest_qualification=VALUES(highest_qualification),
                issuing_authority=VALUES(issuing_authority), certificate_id=VALUES(certificate_id),
                certificate_url=VALUES(certificate_url), available_days=VALUES(available_days),
                time_slots=VALUES(time_slots), location_preference=VALUES(location_preference),
                status=VALUES(status), profile_pic_url=VALUES(profile_pic_url)
        `;

        const params = [
            userId, d.fullName, d.gender, d.dob, d.nationality, d.nic, d.phone, d.email,
            d.street, d.city, d.district, d.province, d.sports, d.coachingLevel,
            d.coachingRole, d.experience, d.organization, d.highestQual,
            d.issuingAuthority, d.certId, d.certDoc, d.availDays,
            d.timeSlots, d.locationPref, d.status || 'Pending', d.profilePic
        ];

        await db.query(query, params);
        res.json({ message: 'Coach profile saved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error saving coach profile' });
    }
});

// Add Favorite
router.post('/:id/favorite', async (req, res) => {
    const { athleteId } = req.body;
    try {
        await db.query('INSERT IGNORE INTO coach_favorites (coach_id, athlete_id) VALUES (?, ?)', [req.params.id, athleteId]);
        res.json({ message: 'Added to favorites' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error adding favorite' });
    }
});

// Remove Favorite
router.delete('/:id/favorite/:athleteId', async (req, res) => {
    try {
        await db.query('DELETE FROM coach_favorites WHERE coach_id = ? AND athlete_id = ?', [req.params.id, req.params.athleteId]);
        res.json({ message: 'Removed from favorites' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error removing favorite' });
    }
});

// Create Squad
router.post('/:id/squad', async (req, res) => {
    const { name } = req.body;
    try {
        const [result] = await db.query('INSERT INTO squads (coach_id, name) VALUES (?, ?)', [req.params.id, name]);
        res.json({ id: result.insertId, message: 'Squad created' });
    } catch (error) {
        console.error(error);
        if (error.errno === 1452) {
            return res.status(400).json({ error: 'Coach profile not found. Please complete your profile first.' });
        }
        res.status(500).json({ error: 'Error creating squad' });
    }
});

router.post('/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await db.query('UPDATE coaches SET status = ? WHERE user_id = ?', [status, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating status' });
    }
});

router.post('/:id/squad/:squadId/assign', async (req, res) => {
    const { athleteId } = req.body;
    try {
        // Check if already assigned to another squad of this coach?
        // First remove from any other squad of this coach
        // Get all squads of coach
        const [mySquads] = await db.query('SELECT id FROM squads WHERE coach_id = ?', [req.params.id]);
        const squadIds = mySquads.map(s => s.id);

        if (squadIds.length > 0) {
            await db.query(
                'DELETE FROM squad_athletes WHERE athlete_id = ? AND squad_id IN (?)',
                [athleteId, squadIds]
            );
        }

        await db.query('INSERT INTO squad_athletes (squad_id, athlete_id) VALUES (?, ?)', [req.params.squadId, athleteId]);
        res.json({ message: 'Assigned to squad' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error assigning to squad' });
    }
});

router.delete('/:id/squad/:squadId/athlete/:athleteId', async (req, res) => {
    try {
        await db.query('DELETE FROM squad_athletes WHERE squad_id = ? AND athlete_id = ?', [req.params.squadId, req.params.athleteId]);
        res.json({ message: 'Removed from squad' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error removing from squad' });
    }
});

// Update Squad (Plan/Name)
router.put('/:id/squad/:squadId', async (req, res) => {
    const { name, workoutPlan } = req.body;
    try {
        // Build dynamic query based on what's provided
        let fields = [];
        let params = [];

        if (name !== undefined) {
            fields.push('name = ?');
            params.push(name);
        }
        if (workoutPlan !== undefined) {
            fields.push('workout_plan = ?');
            params.push(workoutPlan);
        }

        if (fields.length === 0) {
            return res.json({ message: 'No changes provided' });
        }

        params.push(req.params.squadId);
        params.push(req.params.id);

        const sql = `UPDATE squads SET ${fields.join(', ')} WHERE id = ? AND coach_id = ?`;

        await db.query(sql, params);
        res.json({ message: 'Squad updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating squad' });
    }
});

// Delete Squad
router.delete('/:id/squad/:squadId', async (req, res) => {
    try {
        // First delete all athlete assignments for this squad
        await db.query('DELETE FROM squad_athletes WHERE squad_id = ?', [req.params.squadId]);

        // Then delete the squad itself
        await db.query('DELETE FROM squads WHERE id = ? AND coach_id = ?', [req.params.squadId, req.params.id]);

        res.json({ message: 'Squad deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting squad' });
    }
});

// Save Admin Note
router.post('/:id/admin-note', async (req, res) => {
    const { note } = req.body;
    try {
        await db.query(
            'UPDATE coaches SET admin_notes = ? WHERE user_id = ?',
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
        const [coaches] = await db.query(
            'SELECT admin_notes FROM coaches WHERE user_id = ?',
            [req.params.id]
        );
        if (coaches.length === 0) {
            return res.status(404).json({ error: 'Coach not found' });
        }
        res.json({ note: coaches[0].admin_notes || '' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching admin note' });
    }
});

// Add Favorite
router.post('/:id/favorite', async (req, res) => {
    const { athleteId } = req.body;
    const coachId = req.params.id;

    try {
        // Check if already favorited
        const [existing] = await db.query(
            'SELECT * FROM coach_favorites WHERE coach_id = ? AND athlete_id = ?',
            [coachId, athleteId]
        );

        if (existing.length > 0) {
            return res.json({ message: 'Already favorited' });
        }

        // Add to favorites
        await db.query(
            'INSERT INTO coach_favorites (coach_id, athlete_id) VALUES (?, ?)',
            [coachId, athleteId]
        );

        res.json({ message: 'Favorite added successfully' });
    } catch (error) {
        console.error('Error adding favorite:', error);
        res.status(500).json({ error: 'Error adding favorite' });
    }
});

// Remove Favorite
router.delete('/:id/favorite/:athleteId', async (req, res) => {
    const { id: coachId, athleteId } = req.params;

    try {
        await db.query(
            'DELETE FROM coach_favorites WHERE coach_id = ? AND athlete_id = ?',
            [coachId, athleteId]
        );

        res.json({ message: 'Favorite removed successfully' });
    } catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({ error: 'Error removing favorite' });
    }
});

// Save Coach Note about an Athlete
router.post('/:id/note/:athleteId', async (req, res) => {
    const { note } = req.body;
    const userId = req.params.id; // MySQL user ID
    const athleteId = parseInt(req.params.athleteId);

    console.log('Saving coach note:', { userId, athleteId, noteLength: note?.length });

    try {
        // Check if user exists and is a coach
        const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            console.error('User not found:', userId);
            return res.status(404).json({ error: 'User not found. Please log in again.' });
        }

        if (users[0].role !== 'coach') {
            console.error('User is not a coach:', userId, users[0].role);
            return res.status(403).json({ error: 'Only coaches can save notes.' });
        }

        console.log('User verified as coach:', userId);

        // Check if coach profile exists
        const [coaches] = await db.query('SELECT user_id FROM coaches WHERE user_id = ?', [userId]);
        if (coaches.length === 0) {
            console.error('Coach profile not found for user_id:', userId);
            return res.status(404).json({ error: 'Coach profile not found. Please complete your profile first.' });
        }

        // Check if athlete exists
        const [athletes] = await db.query('SELECT user_id FROM athletes WHERE user_id = ?', [athleteId]);
        if (athletes.length === 0) {
            console.error('Athlete not found:', athleteId);
            return res.status(404).json({ error: 'Athlete not found' });
        }

        // Check if note already exists
        const [existing] = await db.query(
            'SELECT * FROM coach_notes WHERE coach_id = ? AND athlete_id = ?',
            [userId, athleteId]
        );

        if (existing.length > 0) {
            // Update existing note
            await db.query(
                'UPDATE coach_notes SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE coach_id = ? AND athlete_id = ?',
                [note, userId, athleteId]
            );
            console.log('Note updated successfully');
        } else {
            // Insert new note
            await db.query(
                'INSERT INTO coach_notes (coach_id, athlete_id, note) VALUES (?, ?, ?)',
                [userId, athleteId, note]
            );
            console.log('Note created successfully');
        }

        res.json({ message: 'Coach note saved successfully' });
    } catch (error) {
        console.error('Error saving coach note:', error);
        res.status(500).json({ error: 'Error saving coach note', details: error.message });
    }
});

// Get Coach Note about an Athlete
router.get('/:id/note/:athleteId', async (req, res) => {
    const userId = req.params.id; // MySQL user ID
    const athleteId = parseInt(req.params.athleteId);

    try {
        const [notes] = await db.query(
            'SELECT note FROM coach_notes WHERE coach_id = ? AND athlete_id = ?',
            [userId, athleteId]
        );

        if (notes.length === 0) {
            return res.status(404).json({ note: '' });
        }

        res.json({ note: notes[0].note || '' });
    } catch (error) {
        console.error('Error fetching coach note:', error);
        res.status(500).json({ error: 'Error fetching coach note' });
    }
});

module.exports = router;
