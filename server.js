const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

// 🔥 Serve HTML from /public
app.use(express.static(path.join(__dirname, "public")));

let items = {};
let history = [];

// 🕒 Malaysia Time
function getTime() {
  return new Date().toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur"
  });
}

// 📡 RFID Scan API
app.post("/scan", (req, res) => {
  const { name } = req.body;

  if (!name) return res.json({ error: "No name" });

  // Toggle IN / OUT
  let status = items[name] === "IN" ? "OUT" : "IN";
  items[name] = status;

  const record = {
    name,
    status,
    time: getTime()
  };

  history.unshift(record);

  res.json(record);
});

// 📊 Dashboard Data
app.get("/data", (req, res) => {
  res.json({ items, history });
});

// ❌ Remove item
app.delete("/remove/:name", (req, res) => {
  delete items[req.params.name];
  res.json({ success: true });
});

// 🔥 Root route fix
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on " + PORT));
