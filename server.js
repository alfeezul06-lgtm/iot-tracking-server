const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// FIX: Point this directly to your database file, not a directory folder name!
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// --- 🌐 SERVE FRONTEND DASHBOARD FILES ---
app.use(express.static(__dirname));

// Safely read unified structural layout database
const readDB = () => {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        return {
            overview: { products: 0, totalUnits: "0", lowStock: 0, inventoryValue: "RM 0", time: "" },
            items: [],
            history: [],
            movement: [
                { "day": "Mon", "percentage": 0 },
                { "day": "Tue", "percentage": 0 },
                { "day": "Wed", "percentage": 0 },
                { "day": "Thu", "percentage": 0 },
                { "day": "Fri", "percentage": 0 }
            ]
        };
    }
};

const writeDB = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// --- CORE MATCHED ENDPOINTS ---

// GET /data: Returns the exact unified root structure the frontend loop requires
app.get('/data', (req, res) => {
    const db = readDB();
    
    const items = db.items || [];
    const totalProducts = items.length;
    const totalUnitsCount = items.reduce((acc, item) => acc + (parseInt(item.qty, 10) || 0), 0);
    const lowStockCount = items.filter(item => (item.status || "").toUpperCase() === "LOW").length;
    
    db.overview = {
        products: totalProducts,
        totalUnits: totalUnitsCount.toLocaleString(),
        lowStock: lowStockCount,
        inventoryValue: db.overview?.inventoryValue || "RM 0",
        time: new Date().toLocaleString('en-GB', { hour12: false }) 
    };

    res.json(db);
});

// POST /add: Receives incoming data from frontend or ESP, saves it, and appends history.change
app.post('/add', (req, res) => {
    const db = readDB();
    const qtyInput = parseInt(req.body.qty, 10) || 1; 

    const newItem = {
        id: Date.now(), 
        name: req.body.name || "Unknown Item",
        rack: req.body.rack || "N/A",
        qty: qtyInput,
        status: qtyInput <= 5 ? "LOW" : "Normal",
        price: req.body.price || "RM 0",
        updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    db.items = db.items || [];
    db.items.push(newItem);

    db.history = db.history || [];
    db.history.unshift({
        time: newItem.updated,
        name: newItem.name,
        change: `+${qtyInput}` 
    });

    writeDB(db);
    res.status(201).json({ success: true, item: newItem });
});

// DELETE /remove/:id: Deletes targeting matching numeric element IDs
app.delete('/remove/:id', (req, res) => {
    const targetId = parseInt(req.params.id, 10);
    const db = readDB();
    
    db.items = db.items || [];
    const itemToRemove = db.items.find(item => item.id === targetId);

    if (!itemToRemove) {
        return res.status(404).json({ error: "Item not found" });
    }

    db.history = db.history || [];
    db.history.unshift({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        name: itemToRemove.name,
        change: `-${itemToRemove.qty}` 
    });

    db.items = db.items.filter(item => item.id !== targetId);
    
    writeDB(data = db);
    res.json({ success: true, removedId: targetId });
});

// --- 🌐 FALLBACK ROUTE ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 API synchronization network running active on port ${PORT}`);
});
