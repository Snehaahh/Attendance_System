const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const DATA_DIR = path.join(__dirname, 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'attendance_records.json');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

// Ensure records file exists with initial empty array
if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeJsonSync(RECORDS_FILE, []);
}

// API Endpoints

// Get all attendance records
app.get('/api/attendance', async (req, res) => {
    try {
        const records = await fs.readJson(RECORDS_FILE);
        res.json(records);
    } catch (error) {
        console.error('Error reading attendance records:', error);
        res.status(500).json({ error: 'Failed to read records' });
    }
});

// Save a new attendance record
app.post('/api/attendance', async (req, res) => {
    try {
        const newRecord = req.body;
        const records = await fs.readJson(RECORDS_FILE);
        records.unshift(newRecord);
        await fs.writeJson(RECORDS_FILE, records, { spaces: 2 });
        res.status(201).json({ message: 'Record saved successfully', record: newRecord });
    } catch (error) {
        console.error('Error saving attendance record:', error);
        res.status(500).json({ error: 'Failed to save record' });
    }
});

// Autonomous agent trigger endpoint (for simulation)
let agentTriggered = false;
app.get('/api/agent/trigger', (req, res) => {
    agentTriggered = true;
    res.json({ status: 'Agent triggered', timestamp: new Date() });
});

app.get('/api/agent/status', (req, res) => {
    res.json({ triggered: agentTriggered });
});

app.post('/api/agent/reset', (req, res) => {
    agentTriggered = false;
    res.json({ status: 'Agent reset' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
