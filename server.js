const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Helper for Malaysian Live Time (MYT)
const getMYTimestamp = (formatType = 'time') => {
    const options = formatType === 'full' 
        ? { timeZone: 'Asia/Kuala_Lumpur', hour12: false, dateStyle: 'short', timeStyle: 'medium' }
        : { timeZone: 'Asia/Kuala_Lumpur', hour12: false, hour: '2-digit', minute: '2-digit' };
    return new Date().toLocaleString('en-GB', options);
};

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
                { "day": "Zone-A", "percentage": 0 }, { "day": "Zone-B", "percentage": 0 },
                { "day": "Zone-C", "percentage": 0 }, { "day": "Zone-D", "percentage": 0 }, { "day": "Zone-E", "percentage": 0 }
            ]
        };
    }
};

const writeDB = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// GET /data - Core dashboard pull endpoint with dynamic stock level tracking
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
        time: getMYTimestamp('full') + " (MYT)"
    };

    // Group totals by location to determine storage density
    const rackVolumes = {};
    items.forEach(item => {
        const rack = item.rack || "Zone-A";
        rackVolumes[rack] = (rackVolumes[rack] || 0) + (parseInt(item.qty, 10) || 0);
    });

    const maxVolume = Math.max(...Object.values(rackVolumes), 0);
    const standardZones = ["Zone-A", "Zone-B", "Zone-C", "Zone-D", "Zone-E"];
    
    db.movement = standardZones.map(zone => {
        const currentQty = rackVolumes[zone] || 0;
        const percentage = currentQty > 0 && maxVolume > 0 ? Math.round((currentQty / maxVolume)*100) : 0;
        return { day: zone, percentage: percentage };
    });

    res.json(db);
});

// POST /add - Manual web dashboard additions
app.post('/add', (req, res) => {
    const db = readDB();
    const qtyInput = parseInt(req.body.qty, 10) || 1; 
    const timestamp = getMYTimestamp('time');

    const newItem = {

    id: Date.now(),

    uid: req.body.uid || "",

    name: req.body.name || "Unknown Item",

    rack: req.body.rack || "Zone-A",

    qty: qtyInput,

    status: qtyInput <= 5 ? "LOW" : "NORMAL",

    price: req.body.price || "RM 0",

    operator: req.body.operator || "Unknown",

    updated: timestamp

};

    db.items = db.items || [];
    db.items.push(newItem);

    db.history = db.history || [];
    db.history.unshift({ time: timestamp, name: newItem.name, change: `+${qtyInput}` });

    writeDB(db);
    res.status(201).json({ success: true, item: newItem });
});

// POST /edit - Modifying inventory entries
app.post('/edit', (req, res) => {
    const db = readDB();
    const targetId = parseInt(req.body.id, 10);
    const qtyInput = parseInt(req.body.qty, 10) || 0;
    const timestamp = getMYTimestamp('time');

    db.items = db.items || [];
    let item = db.items.find(i => i.id === targetId);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const delta = qtyInput - item.qty;
    if (delta !== 0) {
        db.history = db.history || [];
        db.history.unshift({
            time: timestamp,
            name: `${req.body.name || item.name} (Mod)`,
            change: delta > 0 ? `+${delta}` : `${delta}`
        });
    }

    item.uid = req.body.uid || item.uid;
    item.name = req.body.name || item.name;

    // Update old history name when item name changed
    db.history.forEach(log => {
    
        if(log.uid === item.uid){
            log.name = item.name;
        }
    
    });
    
    item.rack = req.body.rack || item.rack;
    item.qty = qtyInput;
    item.status = qtyInput <= 5 ? "LOW" : "Normal";
    item.price = req.body.price || item.price;
    item.updated = timestamp;

    writeDB(db);
    res.json({ success: true, item });
});

// POST /scan - Hardware integration endpoint supporting variables quantities
app.post('/scan', (req,res)=>{


    const db = readDB();


    const uid = 
    (req.body.uid || "")
    .toUpperCase();


    const mode =
    (req.body.mode || "STOCK_IN")
    .toUpperCase();


    const qty =
    parseInt(req.body.qty) || 1;


    const timestamp =
    getMYTimestamp('time');



    if(!uid){

        return res.status(400).json({

            success:false,

            message:"UID Missing"

        });

    }



    db.items = db.items || [];

    db.history = db.history || [];



    // CHECK EXISTING UID

    let item =
    db.items.find(
        i=>i.uid === uid
    );





    // IF NEW RFID

    if(!item){


        item={


            id:Date.now(),


            uid:uid,


            name:
            req.body.name ||
            "New Item",



            rack:
            req.body.rack ||
            "Zone-A",



            qty:0,



            price:
            req.body.price ||
            "RM 0",



            status:"LOW",



            updated:timestamp


        };



        db.items.push(item);


    }





    // STOCK IN

    if(
        mode==="STOCK_IN" ||
        mode==="IN"
    ){

        item.qty += qty;

    }



    // STOCK OUT

    else if(
        mode==="STOCK_OUT" ||
        mode==="OUT"
    ){

        item.qty =
        Math.max(
            0,
            item.qty - qty
        );

    }





    // UPDATE

    item.status =
    item.qty <= 5
    ?
    "LOW"
    :
    "NORMAL";



    item.updated =
    timestamp;





    // HISTORY

    db.history.unshift({

        time:timestamp,

        uid:uid,

        name:item.name,

        change:
        (
            mode==="STOCK_IN" ||
            mode==="IN"
        )
        ?
        "+"+qty
        :
        "-"+qty

    });





    writeDB(db);




    res.json({

        success:true,

        uid:item.uid,

        name:item.name,

        qty:item.qty,

        rack:item.rack,

        price:item.price,

        status:item.status,

        updated:item.updated

    });



});

// POST /clear-logs - Wipes the operational activity logs array
app.post('/clear-logs', (req, res) => {
    const db = readDB();
    db.history = [];
    writeDB(db);
    res.json({ success: true });
});

// DELETE /remove/:id
app.delete('/remove/:id', (req, res) => {
    const targetId = parseInt(req.params.id, 10);
    const db = readDB();
    
    db.items = db.items || [];
    const itemToRemove = db.items.find(item => item.id === targetId);
    if (!itemToRemove) return res.status(404).json({ error: "Item not found" });

    db.history = db.history || [];
    db.history.unshift({ time: getMYTimestamp('time'), name: itemToRemove.name, change: `-${itemToRemove.qty}` });
    db.items = db.items.filter(item => item.id !== targetId);
    
    writeDB(db);
    res.json({ success: true, removedId: targetId });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.listen(PORT, () => console.log(`🚀 Malaysia Storage Core engine online on port ${PORT}`));
