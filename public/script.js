const API = "";

// ================= LOAD DATA =================

async function loadDashboard(){

    try{

        const res = await fetch(API + "/data");
        const data = await res.json();


        // TIME
        document.getElementById("live-time").innerHTML =
        data.overview.time;


        // METRICS
        document.getElementById("total-products").innerHTML =
        data.overview.products;

        document.getElementById("total-units").innerHTML =
        data.overview.totalUnits;

        document.getElementById("low-stock").innerHTML =
        data.overview.lowStock;

        document.getElementById("inv-value").innerHTML =
        data.overview.inventoryValue;



        renderTable(data.items);

        renderLogs(data.history);

        renderChart(data.movement);


    }
    catch(err){

        console.log("SERVER ERROR",err);

    }

}



// ================= TABLE =================


function renderTable(items){

const tbody =
document.getElementById("stock-tbody");


tbody.innerHTML="";


items.forEach(item=>{


let statusColor =
item.status.toUpperCase()=="LOW"
?"status-low"
:"status-normal";


tbody.innerHTML += `
<tr>

<td>
${item.uid}
</td>

<td>
<b>${item.name}</b>
</td>

<td>
${item.rack}
</td>

<td>
${item.qty}
</td>

<td>
<span class="${item.status === "LOW" ? "status-low" : "status-normal"}">
${item.status}
</span>
</td>

<td>
${item.price}
</td>

<td>

<button class="btn-edit-inline"
onclick="editItem(${item.id})">
EDIT
</button>

<button class="btn-delete"
onclick="deleteItem(${item.id})">
DELETE
</button>

</td>

</tr>
`;

});


}



// ================= EDIT ITEM =================


async function editItem(id){


let name =
prompt(
"New Item Name"
);


let qty =
document.getElementById(
"qty-"+id
).value;



if(!name)
return;



let body={

id:id,

name:name,

qty:qty

};



await fetch("/edit",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(body)

});


loadDashboard();


}




// ================= DELETE =================


async function deleteItem(id){


if(!confirm("Remove item?"))
return;



await fetch("/remove/"+id,{

method:"DELETE"

});


loadDashboard();


}




// ================= LOG =================


function renderLogs(history){


const box =
document.getElementById(
"transactions-list"
);


box.innerHTML="";



history.slice(0,10)
.forEach(log=>{


let color =
log.change.includes("-")
?"log-neg"
:"log-pos";



box.innerHTML += `

<div class="log-row">

<span class="log-time">
${log.time}
</span>


<span>
${log.name}
</span>


<span class="${color}">
${log.change}
</span>


</div>

`;

});


}




// ================= CHART =================


function renderChart(data){


const box =
document.getElementById(
"chart-box"
);


box.innerHTML="";



data.forEach(zone=>{


box.innerHTML += `


<div class="chart-row">


<div class="day">
${zone.day}
</div>


<div 
class="bar"
style="--width:${zone.percentage}%">

</div>



<div>
${zone.percentage}%
</div>


</div>


`;

});


}




// ================= SEARCH =================


document
.getElementById("search-bar")
.addEventListener(
"input",
function(){


let value =
this.value.toLowerCase();



document
.querySelectorAll(
"#stock-tbody tr"
)
.forEach(row=>{


row.style.display =
row.innerText
.toLowerCase()
.includes(value)
?
""
:
"none";

});


});




// ================= SCAN MODAL =================


function openScanModal(){

document
.getElementById(
"scan-modal"
)
.style.display="flex";


}



function closeScanModal(){

document
.getElementById(
"scan-modal"
)
.style.display="none";


}



// ================= SIMULATE RFID =================


async function submitScanPayload(){


let body={


uid:
"SIM-"+Date.now(),


mode:
document.getElementById(
"scan-status"
).value,



qty:
Number(
document.getElementById(
"scan-qty"
).value
),


};



await fetch("/scan",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:
JSON.stringify(body)


});



closeScanModal();


loadDashboard();


}




// ================= CLEAR LOG =================


async function clearLogs(){


await fetch(
"/clear-logs",
{
method:"POST"
}
);


loadDashboard();


}




// AUTO UPDATE

setInterval(
loadDashboard,
2000
);


loadDashboard();
