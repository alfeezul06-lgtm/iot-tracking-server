const API = "";


// ================= LOAD DASHBOARD =================

async function loadDashboard(){

    try{

        const response = await fetch(API + "/data");

        const data = await response.json();



        // TIME

        document.getElementById("live-time").innerHTML =
        data.overview.time;



        // METRIC

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
    catch(error){

        console.log(
            "SERVER ERROR:",
            error
        );

    }

}





// ================= TABLE =================


function renderTable(items){


const table =
document.getElementById(
"stock-tbody"
);



table.innerHTML="";



items.forEach(item=>{


let status =
item.status.toUpperCase()=="LOW"
?
"status-low"
:
"status-normal";



table.innerHTML += `


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

<span class="${status}">

${item.status}

</span>

</td>



<td>
${item.price}
</td>



<td class="action-cell">


<button 
class="edit-btn"
onclick="editItem(${item.id})">

EDIT

</button>



<button 
class="delete-btn"
onclick="deleteItem(${item.id})">

DELETE

</button>


</td>


</tr>


`;

});


}





// ================= EDIT =================


async function editItem(id){


let name =
prompt(
"Enter new item name"
);



let qty =
prompt(
"Enter new quantity"
);



if(!name || !qty)
return;



await fetch("/edit",{


method:"POST",


headers:{

"Content-Type":
"application/json"

},


body:JSON.stringify({

id:id,

name:name,

qty:Number(qty)

})


});



loadDashboard();


}





// ================= DELETE =================


async function deleteItem(id){


if(
!confirm(
"Delete this item?"
)
)
return;



await fetch(
"/remove/"+id,
{

method:"DELETE"

}
);



loadDashboard();


}





// ================= HISTORY =================


function renderLogs(history){


const box =
document.getElementById(
"logs"
);



box.innerHTML="";



history
.slice(0,10)
.forEach(log=>{



let color =
log.change.includes("-")
?
"log-neg"
:
"log-pos";



box.innerHTML += `


<div class="log-row">


<span>
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





// ================= ZONE CHART =================


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
.getElementById(
"search-bar"
)
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






// ================= MODAL =================


function openModal(){


document
.getElementById(
"modal"
)
.style.display="flex";


}



function closeModal(){


document
.getElementById(
"modal"
)
.style.display="none";


}






// ================= RFID SCAN =================


async function sendScan(){



let body={



uid:

document
.getElementById("uid")
.value
.toUpperCase(),




name:

document
.getElementById("name")
.value,




rack:

document
.getElementById("zone")
.value,




mode:

document
.getElementById("mode")
.value,




qty:

Number(
document
.getElementById("qty")
.value
)

if(body.uid==""){
    alert("UID kosong");
    return;
}

};




await fetch("/scan",{


method:"POST",


headers:{


"Content-Type":
"application/json"


},


body:

JSON.stringify(body)



});



closeModal();


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
5000
);



loadDashboard();
