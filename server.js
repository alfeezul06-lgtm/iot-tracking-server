const express = require("express");
const path = require("path");

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static files
app.use(express.static(path.join(__dirname, "public/index.html")));

// 🔐 CORS (important if ESP32 / browser different origin)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// 📦 Data storage
let items = {};
let history = [];

// 🕒 Malaysia Time (clean format)
function getTime() {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour12: false
  });
}

// 📡 RFID Scan API
app.post("/scan", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "No name provided" });
  }

  // 🔄 Toggle status
  let status = items[name] === "IN" ? "OUT" : "IN";
  items[name] = status;

  const record = {
    name,
    status,
    time: getTime()
  };

  // 🔥 Limit history (prevent memory issue)
  history.unshift(record);
  if (history.length > 50) history.pop();

  res.json(record);
});

// 📊 Dashboard data
app.get("/data", (req, res) => {
  res.json({
    items,
    history
  });
});

// ❌ Remove item
app.delete("/remove/:name", (req, res) => {
  const name = req.params.name;

  if (items[name]) {
    delete items[name];
    return res.json({ success: true });
  }

  res.status(404).json({ error: "Item not found" });
});

// 🔥 Root route (fix blank page issue)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
