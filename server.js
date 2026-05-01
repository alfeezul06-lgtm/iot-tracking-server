const express = require("express");
const app = express();
app.use(express.json());

let items = {};     // current state
let history = [];   // log history

// 🕒 Get real time
function getTime() {
  return new Date().toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur"
  });
}

// 📡 Scan endpoint
app.post("/scan", (req, res) => {
  const { name } = req.body;

  if (!name) return res.json({ error: "No name" });

  // toggle IN / OUT
  let status = items[name] === "IN" ? "OUT" : "IN";
  items[name] = status;

  let record = {
    name,
    status,
    time: getTime()
  };

  history.unshift(record); // newest first

  res.json(record);
});

// 📊 Get dashboard data
app.get("/data", (req, res) => {
  res.json({
    items,
    history
  });
});

// ❌ Remove item
app.delete("/remove/:name", (req, res) => {
  delete items[req.params.name];
  res.json({ success: true });
});

app.listen(3000, () => console.log("Server running"));
