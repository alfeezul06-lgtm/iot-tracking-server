const API = ""; 
let currentSearchQuery = "";

async function load() {
  try {
    const res = await fetch(API + "/data");
    const data = await res.json();

    document.getElementById("total-products").innerText = data.overview.products || 0;
    document.getElementById("total-units").innerText = data.overview.totalUnits || 0;
    document.getElementById("low-stock").innerText = data.overview.lowStock || 0;
    document.getElementById("inv-value").innerText = data.overview.inventoryValue || "RM 0";
    if(data.overview.time) {
        document.getElementById("live-time").innerText = data.overview.time;
    }

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
          <td>
            <button class="btn-edit-inline" onclick="editItem(${item.id}, '${item.name}', '${item.rack}', ${item.qty}, '${item.price}')">Edit</button>
            <button class="btn-delete" onclick="removeItem(${item.id})">Delete</button>
          </td>
        </tr>
      `;
    });

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
     console.error("Layout telemetry sync failure:", error);
  }
}

async function addItem() {
    const name = prompt("Item Label Description:");
    if (!name) return;
    const rack = prompt("Assigned Storage Zone (e.g., Zone-A):") || "Zone-A";
    const qty = parseInt(prompt("Starting Volume Units:"), 10) || 0;
    const price = prompt("Evaluated Unit Cost:") || "RM 0";

    await fetch(API + "/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rack, qty, price })
    });
    load();
}

async function editItem(id, currentName, currentRack, currentQty, currentPrice) {
    const name = prompt("Modify Description:", currentName) || currentName;
    const rack = prompt("Modify Zone Allocation:", currentRack) || currentRack;
    const qty = parseInt(prompt("Modify Quantities Available:", currentQty), 10);
    const price = prompt("Modify Unit Valuation Cost:", currentPrice) || currentPrice;

    if (isNaN(qty)) return;

    await fetch(API + "/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, rack, qty, price })
    });
    load();
}

// SIMULATED MODAL ACTIONS
function openScanModal() {
    document.getElementById("scan-name").value = "";
    document.getElementById("scan-qty").value = "1";
    document.getElementById("scan-price").value = "RM ";
    document.getElementById("scan-modal").style.display = "flex";
}

function closeScanModal() {
    document.getElementById("scan-modal").style.display = "none";
}

async function submitScanPayload() {
    const name = document.getElementById("scan-name").value;
    if (!name) return alert("Item Name field required!");
    
    const rack = document.getElementById("scan-rack").value;
    const status = document.getElementById("scan-status").value;
    const qty = parseInt(document.getElementById("scan-qty").value, 10) || 1;
    const price = document.getElementById("scan-price").value || "RM 0";

    await fetch(API + "/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rack, status, qty, price })
    });

    closeScanModal();
    load();
}

async function clearLogs() {
    if (!confirm("Flush operational activity tracking logs?")) return;
    await fetch(API + "/clear-logs", { method: "POST" });
    load();
}

async function removeItem(id) {
    await fetch(`${API}/remove/${id}`, { method: "DELETE" });
    load();
}

document.getElementById("search-bar").addEventListener("input", (e) => {
    currentSearchQuery = e.target.value;
    load(); 
});

load();
setInterval(load, 1000);
