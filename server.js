const API = ""; 
let currentSearchQuery = "";

// LOAD ALL DATA FROM BACKEND API
async function load() {
  try {
    const res = await fetch(API + "/data");
    const data = await res.json();

    // 1. UPDATE OVERVIEW COUNTERS DYNAMICALLY
    document.getElementById("total-products").innerText = data.overview.products || 0;
    document.getElementById("total-units").innerText = data.overview.totalUnits || 0;
    document.getElementById("low-stock").innerText = data.overview.lowStock || 0;
    document.getElementById("inv-value").innerText = data.overview.inventoryValue || "RM 0";
    if(data.overview.time) {
        document.getElementById("live-time").innerText = data.overview.time;
    }

    // 2. RENDER THE MAIN ITEMS TABLE (WITH CLIENT-SIDE SEARCH FILTERING)
    const tbody = document.getElementById("stock-tbody");
    tbody.innerHTML = "";

    const filteredItems = data.items.filter(item => 
      item.name.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
      item.rack.toLowerCase().includes(currentSearchQuery.toLowerCase())
    );

    filteredItems.forEach(item => {
      const statusClass = item.status.toUpperCase() === "LOW" ? "text-low" : "status-normal";
      tbody.innerHTML += `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td>${item.rack}</td>
          <td>${item.qty}</td>
          <td class="${statusClass}">${item.status}</td>
          <td>${item.price}</td>
          <td>${item.updated}</td>
        </tr>
      `;
    });

    // 3. RENDER RECENT TRANSACTIONS LOG
    const logsContainer = document.getElementById("transactions-list");
    logsContainer.innerHTML = "";
    
    data.history.forEach(log => {
      const changeClass = log.change.startsWith("+") ? "log-pos" : "log-neg";
      logsContainer.innerHTML += `
        <div class="log-row">
            <div><span class="log-time">${log.time}</span> <span>${log.name}</span></div>
            <span class="${changeClass}">${log.change}</span>
        </div>
      `;
    });

    // 4. RENDER STOCK MOVEMENT BARS
    const chartBox = document.getElementById("chart-box");
    chartBox.innerHTML = "";
    
    data.movement.forEach(move => {
       chartBox.innerHTML += `
          <div class="chart-row">
             <span class="day">${move.day}</span>
             <div class="bar" style="--width: ${move.percentage}%;"></div>
          </div>
       `;
    });

  } catch (error) {
     console.error("Error communicating with IoT layout API:", error);
  }
}

// OPTIONAL: HANDLES CLICKING TO ADD/POST NEW ITEM OVER API
async function addItem() {
    // Mimics structure if you want to push data later
    const name = prompt("Enter Item Name:");
    if (!name) return;
    await fetch(API + "/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name })
    });
    load();
}

// LOCAL SEARCH ACCELERATOR
document.getElementById("search-bar").addEventListener("input", (e) => {
    currentSearchQuery = e.target.value;
    load(); // Instantly update view against loaded dataset
});

// REALTIME LOOPS (Every 1 second)
setInterval(load, 1000);
load();
