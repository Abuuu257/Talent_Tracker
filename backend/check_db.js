require('dotenv').config();
const db = require('./db');

async function check() {
    try {
        const [users] = await db.query('SELECT * FROM users');
        console.log('Users:', users);
        const [coaches] = await db.query('SELECT * FROM coaches');
        console.log('Coaches:', coaches);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
