const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// Serve static frontend files from root directory
app.use(express.static(__dirname));

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

// GET /data - Core dashboard pull endpoint
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

// POST /add - Manual web dashboard additions
app.post('/add', (req, res) => {
    const db = readDB();
    const qtyInput = parseInt(req.body.qty, 10) || 1; 
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newItem = {
        id: Date.now(), 
        name: req.body.name || "Unknown Item",
        rack: req.body.rack || "N/A",
        qty: qtyInput,
        status: qtyInput <= 5 ? "LOW" : "Normal",
        price: req.body.price || "RM 0",
        updated: timestamp
    };

    db.items = db.items || [];
    db.items.push(newItem);

    db.history = db.history || [];
    db.history.unshift({
        time: timestamp,
        name: newItem.name,
        change: `+${qtyInput}` 
    });

    writeDB(db);
    res.status(201).json({ success: true, item: newItem });
});

// POST /scan - Hardware node integrations for ESP32
app.post('/scan', (req, res) => {
    const db = readDB();
    const deviceName = req.body.name || "ESP32 Scan Node";
    const scanStatus = (req.body.status || "IN").toUpperCase();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    db.history = db.history || [];
    db.history.unshift({
        time: timestamp,
        name: `${deviceName} (${scanStatus})`,
        change: scanStatus === "IN" ? "+1" : "-1"
    });

    db.items = db.items || [];
    let existingItem = db.items.find(item => item.name === deviceName);

    if (existingItem) {
        let currentQty = parseInt(existingItem.qty, 10) || 0;
        currentQty = scanStatus === "IN" ? currentQty + 1 : Math.max(0, currentQty - 1);
        
        existingItem.qty = currentQty;
        existingItem.status = currentQty <= 5 ? "LOW" : "Normal";
        existingItem.updated = timestamp;
    } else {
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
    res.status(200).json({ success: true });
});

// DELETE /remove/:id - Dashboard deletions
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
    
    writeDB(db);
    res.json({ success: true, removedId: targetId });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`🚀 Warehouse core engine active on port ${PORT}`);
});
