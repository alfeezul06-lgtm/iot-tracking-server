const express = require("express");

const app = express();
app.use(express.json());

let inventory = {};

app.post("/scan", (req, res) => {
    const { item, quantity = 1 } = req.body;

    if (!item) {
        return res.status(400).json({ error: "Missing item name" });
    }

    inventory[item] = (inventory[item] || 0) + quantity;

    res.json({
        success: true,
        item,
        currentStock: inventory[item]
    });
});

app.get("/dashboard", (req, res) => {
    res.json(inventory);
});

app.listen(3000, () =>
    console.log("Server running on port 3000")
);
