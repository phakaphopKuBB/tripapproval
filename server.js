const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    maxHttpBufferSize: 50 * 1024 * 1024 // 50MB
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 📦 Database Setup (ใช้ .data สำหรับ Glitch)
const dbPath = process.env.PROJECT_DOMAIN ? './.data/trip_v2.db' : './trip_v2.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Database Error:", err.message);
    else console.log(`✨ Connected to database at ${dbPath}`);
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        place TEXT,
        start_time TEXT,
        end_time TEXT,
        duration TEXT,
        budget TEXT,
        reason TEXT,
        status TEXT DEFAULT 'pending', 
        rejection_reason TEXT,
        proof_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS profiles (
        username TEXT PRIMARY KEY,
        avatar TEXT
    )`);
});

// Routes
app.get('/', (req, res) => res.redirect('/boy'));
app.get('/boy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'boy.html')));
app.get('/girl', (req, res) => res.sendFile(path.join(__dirname, 'public', 'girl.html')));

// API
app.get('/api/history', (req, res) => {
    db.all("SELECT * FROM requests ORDER BY id DESC", [], (err, rows) => {
        if (err) res.status(500).json([]); else res.json(rows);
    });
});
app.get('/api/profiles', (req, res) => {
    db.all("SELECT * FROM profiles", [], (err, rows) => {
        const profiles = {};
        if(!err) rows.forEach(r => profiles[r.username] = r.avatar);
        res.json(profiles);
    });
});

// Socket Events
io.on('connection', (socket) => {
    socket.on('request_trip', (data) => {
        const { place, start_time, end_time, duration, budget, reason } = data;
        const sql = `INSERT INTO requests (place, start_time, end_time, duration, budget, reason) VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(sql, [place, start_time, end_time, duration, budget, reason], function(err) {
            if (!err) io.emit('new_request', { id: this.lastID, ...data, status: 'pending', proof_image: null });
        });
    });

    socket.on('update_status', (data) => {
        const { id, status, rejection_reason } = data;
        const reasonVal = status === 'rejected' ? rejection_reason : null;
        db.run(`UPDATE requests SET status = ?, rejection_reason = ? WHERE id = ?`, [status, reasonVal, id], (err) => {
            if (!err) io.emit('status_changed', data);
        });
    });

    socket.on('send_proof', (data) => {
        const imagesJSON = JSON.stringify(data.images);
        db.run(`UPDATE requests SET proof_image = ? WHERE id = ?`, [imagesJSON, data.id], (err) => {
            if (!err) io.emit('proof_updated', { id: data.id, images: data.images });
        });
    });

    socket.on('update_profile', (data) => {
        const { username, avatar } = data;
        const sql = `INSERT INTO profiles (username, avatar) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET avatar = ?`;
        db.run(sql, [username, avatar, avatar], (err) => {
            if (!err) io.emit('profile_updated', data);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
});