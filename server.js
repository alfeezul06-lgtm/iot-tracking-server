const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors()); // Allows your GitHub Pages / frontend to connect without CORS errors
app.use(express.json());

// Helper function to read data safely
const readData = () => {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        // Default structural fallback if data.json is missing or corrupted
        return { overview: {}, items: [], history: [], movement: [] };
    }
};

// Helper function to write data safely
const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// --- API ENDPOINTS ---

// GET: Fetch individual sections matching your dashboard's Promise.all requests
app.get('/overview', (req, res) => {
    res.json(readData().overview || {});
});

app.get('/items', (req, res) => {
    res.json(readData().items || []);
});

app.get('/history', (req, res) => {
    res.json(readData().history || []);
});

app.get('/movement', (req, res) => {
    res.json(readData().movement || []);
});

// POST: Add new item (triggered by dashboard manual add or ESP node transmission)
app.post('/items', (req, res) => {
    const db = readData();
    const newItem = {
        id: Date.now(), // Generate unique numeric ID timestamp
        name: req.body.name || "Unknown Item",
        rack: req.body.rack || "N/A",
        qty: parseInt(req.body.qty, 10) || 0,
        status: req.body.status || "Normal",
        price: req.body.price || "RM0.00",
        updated: req.body.updated || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    db.items.push(newItem);
    
    // Also log this execution into the transaction history array automatically
    const newLog = {
        time: newItem.updated,
        name: newItem.name,
        change: `+${newItem.qty}`
    };
    db.history.unshift(newLog); // Push new activity logs to the top

    writeData(db);
    res.status(201).json(newItem);
});

// DELETE: Remove item by ID (triggered by clicking "Remove" on your dashboard layout)
app.delete('/items/:id', (req, res) => {
    const targetId = parseInt(req.params.id, 10);
    const db = readData();
    
    const initialLength = db.items.length;
    db.items = db.items.filter(item => item.id !== targetId);

    if (db.items.length === initialLength) {
        return res.status(404).json({ error: "Item target not found" });
    }

    writeData(db);
    res.json({ success: true, removedId: targetId });
});

// Boot Server
app.listen(PORT, () => {
    console.log(`🚀 Warehouse API Server active on port :${PORT}`);
});
