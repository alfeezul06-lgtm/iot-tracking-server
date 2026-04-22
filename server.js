const express = require("express");
const app = express();

app.use(express.json());

// ===== TELEGRAM =====
const botToken = "8704984188:AAEbumqDmHgVl24YlKhV0duDS_A17aO5OBI";
const chatID = "1004963601";

// ===== DATABASE =====
let items = {};

// ===== TELEGRAM FUNCTION (PRO FORMAT) =====
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

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatID}&text=${encodeURIComponent(message)}`);
  } catch (e) {
    console.log("Telegram error");
  }
}

// ===== API =====
app.post("/scan", (req, res) => {
  const { name } = req.body;

  // ❌ BLOCK UNKNOWN ITEM
  if (!name || name === "UNKNOWN") {
    return res.status(400).json({ message: "Ignored unknown item" });
  }

  const time = new Date().toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit"
  });

  // ===== TOGGLE IN / OUT =====
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

// ===== DASHBOARD =====
app.get("/", (req, res) => {
  let html = `
  <html>
  <head>
    <meta http-equiv="refresh" content="3">
    <style>
      body { background:#0f172a; color:white; text-align:center; font-family:Arial; }
      h1 { color:cyan; }
      table { margin:auto; width:80%; border-collapse:collapse; }
      th,td { padding:12px; border:1px solid #444; }
      .in { color:lime; font-weight:bold; }
      .out { color:red; font-weight:bold; }
    </style>
  </head>
  <body>
    <h1>📡 IoT Tracking Dashboard</h1>
    <table>
      <tr><th>Item</th><th>Status</th><th>Time In</th><th>Time Out</th></tr>
  `;

  for (let name in items) {
    let i = items[name];
    html += `
      <tr>
        <td>${name}</td>
        <td class="${i.status==="IN"?"in":"out"}">${i.status}</td>
        <td>${i.timeIn}</td>
        <td>${i.timeOut}</td>
      </tr>
    `;
  }

  html += "</table></body></html>";
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("Server running"));
