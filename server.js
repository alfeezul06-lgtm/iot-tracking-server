const express = require("express");
const app = express();

app.use(express.json());

// ===== TELEGRAM =====
const botToken = "8704984188:AAEbumqDmHgVl24YlKhV0duDS_A17aO5OBI";
const chatID = "1004963601";

// ===== FETCH FIX (for Render) =====
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ===== DATABASE =====
let items = {};

// ===== TELEGRAM FUNCTION =====
async function sendTelegram(name, status, time) {
  try {
    const message =
`📦 ITEM TRACKING ALERT

Item      : ${name}
Status    : ${status === "IN" ? "🟢 IN" : "🔴 OUT"}
Time      : ${time}
Location  : RFID Gate A

————————————
IoT Tracking System`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatID,
        text: message
      })
    });

    console.log("Telegram sent");
  } catch (e) {
    console.log("Telegram error:", e);
  }
}

// ===== API =====
app.post("/scan", (req, res) => {
  const { name } = req.body;

  // ❌ BLOCK UNKNOWN
  if (!name || name === "UNKNOWN") {
    return res.status(400).json({ message: "Ignored unknown item" });
  }

  const time = new Date().toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit"
  });

  // ===== IN / OUT TOGGLE =====
  if (!items[name] || items[name].status === "OUT") {
    items[name] = {
      status: "IN",
      timeIn: time,
      timeOut: "-"
    };

    sendTelegram(name, "IN", time);

  } else {
    items[name].status = "OUT";
    items[name].timeOut = time;

    sendTelegram(name, "OUT", time);
  }

  res.json(items[name]);
});

// ===== DASHBOARD (PRO UI) =====
app.get("/", (req, res) => {

  let total = Object.keys(items).length;
  let inCount = Object.values(items).filter(i => i.status === "IN").length;
  let outCount = total - inCount;

  let html = `
  <html>
  <head>
    <meta http-equiv="refresh" content="3">
    <title>Smart Tracking System</title>

    <style>
      body {
        background: #0f172a;
        color: white;
        font-family: Arial;
        margin: 0;
        padding: 20px;
      }

      h1 {
        text-align: center;
        color: cyan;
      }

      .summary {
        text-align: center;
        margin-bottom: 20px;
        font-size: 16px;
      }

      .container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
      }

      .card {
        background: #1e293b;
        border-radius: 12px;
        padding: 20px;
        width: 260px;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
      }

      .item-name {
        font-size: 20px;
        font-weight: bold;
      }

      .status {
        margin-top: 10px;
        font-size: 16px;
      }

      .in { color: lime; }
      .out { color: red; }

      .time {
        margin-top: 10px;
        font-size: 14px;
        color: #ccc;
      }

      .location {
        margin-top: 5px;
        font-size: 14px;
        color: orange;
      }
    </style>
  </head>

  <body>
    <h1>📡 SMART ITEM TRACKING SYSTEM</h1>

    <div class="summary">
      Total: ${total} | 🟢 IN: ${inCount} | 🔴 OUT: ${outCount}
    </div>

    <div class="container">
  `;

  for (let name in items) {
    let i = items[name];

    html += `
      <div class="card">
        <div class="item-name">📦 ${name}</div>

        <div class="status ${i.status === "IN" ? "in" : "out"}">
          ${i.status === "IN" ? "🟢 IN" : "🔴 OUT"}
        </div>

        <div class="time">
          ${i.status === "IN" ? "Time In: " + i.timeIn : "Time Out: " + i.timeOut}
        </div>

        <div class="location">
          Location: RFID Gate A
        </div>
      </div>
    `;
  }

  html += `
    </div>
  </body>
  </html>
  `;

  res.send(html);
});

// ===== SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running...");
});
