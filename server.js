const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
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

// POST /add: Receives incoming data from frontend manual input forms
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

// --- 🤖 NEW: COMPATIBILITY ENDPOINT FOR YOUR ESP32 HARDWARE ---
// This listens to your ESP32's /scan path and maps its data directly into your schema
app.post('/scan', (req, res) => {
    const db = readDB();
    
    // Captures your ESP data (e.g., name: "ESP-Cloud-Node", status: "IN")
    const deviceName = req.body.name || "ESP32 Scan Node";
    const scanStatus = req.body.status || "IN";
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Log the physical device operation directly to your scrolling transaction history panel
    db.history = db.history || [];
    db.history.unshift({
        time: timestamp,
        name: `${deviceName} (${scanStatus})`,
        change: scanStatus === "IN" ? "+1" : "-1"
    });

    // 2. Optionally insert/increment a table entry tracking items logged by this scanner node
    db.items = db.items || [];
    let existingItem = db.items.find(item => item.name === deviceName);

    if (existingItem) {
        let currentQty = parseInt(existingItem.qty, 10) || 0;
        if (scanStatus === "IN") currentQty += 1;
        else currentQty = Math.max(0, currentQty - 1); // Ensure quantities don't drop under zero
        
        existingItem.qty = currentQty;
        existingItem.status = currentQty <= 5 ? "LOW" : "Normal";
        existingItem.updated = timestamp;
    } else {
        // If it's a completely new tracked tag layout, initialize it
        db.items.push({
            id: Date.now(),
            name: deviceName,
            rack: "Gate-01",
            qty: scanStatus === "IN" ? 1 : 0,
            status: "LOW",
            price: "RM 0",
            updated: timestamp
        });
    }

    writeDB(db);
    res.status(200).json({ success: true, message: "ESP32 transmission successfully processed" });
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
    
    // FIX: Removed the leaked 'data = db' assignment bug
    writeDB(db);
    res.json({ success: true, removedId: targetId });
});

// --- 🌐 FALLBACK ROUTE ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`🚀 API synchronization network running active on port ${PORT}`);
});
