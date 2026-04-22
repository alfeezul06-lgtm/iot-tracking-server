const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

let items = {};

// ===== SCAN =====
app.post("/scan", (req, res) => {
  const { name } = req.body;

  if (!items[name]) {
    items[name] = { status: "OUT", time: "" };
  }

  // toggle
  items[name].status =
    items[name].status === "IN" ? "OUT" : "IN";

  // time
  const now = new Date().toLocaleString();
  items[name].time = now;

  res.json({
    status: items[name].status,
    time: now
  });
});

// ===== DATA =====
app.get("/data", (req, res) => {
  res.json(items);
});

// ===== REMOVE =====
app.post("/remove", (req, res) => {
  const { name } = req.body;

  if (items[name]) {
    delete items[name];
    return res.json({ ok: true });
  }

  res.json({ ok: false });
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
