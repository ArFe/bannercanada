const socket = io();
let nodeNum;
let dxmId;
let running;

function stopSS(){
    let node = document.querySelector("#node");
    let id = document.querySelector(".id").id;
    var socket = io();
    let obj = {'dxmId': id, 'nodeNum': node.options[node.selectedIndex].value, 'siteSurvey': 0};
    socket.emit('chat message', JSON.stringify(obj));
    return false;
}
function startSS(){
    let node = document.querySelector("#node");
    let id = document.querySelector(".id").id;
    var socket = io();
    let obj = {'dxmId': id, 'nodeNum': node.options[node.selectedIndex].value, 'siteSurvey': 1};
    socket.emit('chat message', JSON.stringify(obj));
    return false;
}
socket.on('chat message', function(msg){
    console.log(msg);
    
    if(typeof(msg) === 'object')
        obj = msg;
    else
        obj = JSON.parse(msg);

    let elem = document.querySelector("#led");
    if (elem != null) {
        if(obj["reg5020"] == 1)
            elem.classList.add("yellow");
        else if(obj["reg5020"] == 0)
            elem.classList.remove("yellow");

        if(obj["reg5021"] == 1)
            elem.classList.add("red");
        else if(obj["reg5021"] == 0)
            elem.classList.remove("red");
    }

    elem = document.querySelector("#avail");
    if (elem != null) {
        if(obj["reg801"] != null){
            elem.textContent = obj["reg801"];
        }
    }

    if(obj != null){
        dxmId = obj["id"];
        nodeNum = obj["reg6"];
        running = obj["reg7"] == 1 ? " - Running" : " - Stopped";
        console.log("dxmID = " + dxmId)
        elem = document.querySelector("#"+dxmId);
        console.log("elem = " + elem)
        if (elem != null) {
            elem = document.querySelector("#nodeDisp");
            elem.innerHTML = "Node " + nodeNum + running;
            var c = document.getElementById("myCanvas");
            var ctx = c.getContext("2d");

            //c.style.zIndex= -1;
            c.style.cssFloat = "left";

            ctx.canvas.width  = window.innerWidth-window.innerWidth/10;
            ctx.canvas.height = window.innerHeight-window.innerHeight/3;
            let top = 0;
            let margin = top-window.innerHeight/22;

            
            ctx.beginPath();
            ctx.rect(10, top, window.innerWidth*(obj["reg1"]/100), window.innerHeight/9);
            ctx.fillStyle = "green";
            ctx.fill();

            ctx.beginPath();
            ctx.rect(10, 1*(window.innerHeight/8)+ top, window.innerWidth*(obj["reg2"]/100), window.innerHeight/9);
            ctx.fillStyle = "yellow";
            ctx.fill();

            ctx.beginPath();
            ctx.rect(10, 2*(window.innerHeight/8)+ top, window.innerWidth*(obj["reg3"]/100), window.innerHeight/9);
            ctx.fillStyle = "red";
            ctx.fill();
            
            ctx.beginPath();
            ctx.rect(10, 3*(window.innerHeight/8)+ top, window.innerWidth*(obj["reg4"]/100), window.innerHeight/9);
            ctx.fillStyle = "gray";
            ctx.fill();

            ctx.font = "6vh Calibri Regular";
            ctx.fillStyle = "black";
            ctx.textAlign = "left";
            ctx.fillText("Excelent " + obj["reg1"] + "%", 15, 1*(window.innerHeight/8) + margin); 
            ctx.fillText("Good " + obj["reg2"] + "%", 15, 2*(window.innerHeight/8) + margin); 
            ctx.fillText("Marginal " + obj["reg3"] + "%", 15, 3*(window.innerHeight/8) + margin); 
            ctx.fillText("Missed " + obj["reg4"] + "%", 15, 4*(window.innerHeight/8) + margin); 
        }
    }
});