"use strict";

var app;
(function (app) {

    const numItems = 10

    function setTable(){
        let table = document.querySelector("#tableid");
        let row;
        let col1;
        let col2;
        let col3;
        let input1;
        let input2;
        if(table != null){
            row = document.createElement("tr");
            col1 = document.createElement("td");
            col2 = document.createElement("td");
            col3 = document.createElement("td");
            col1.innerHTML = "<strong>Sequence:</strong>";
            col2.innerHTML = "Pick ID";
            col3.innerHTML = "Pick Value";
            col3.style.width = "100%";
            row.appendChild(col1);
            row.appendChild(col2);
            row.appendChild(col3);
            table.appendChild(row);
            for (let index = 1; index <= numItems; index++) {
                row = document.createElement("tr");
                col1 = document.createElement("td");
                col2 = document.createElement("td");
                col3 = document.createElement("td");
                col1.innerHTML = "<strong>Sequence " + index + "</strong>";
                input1 = document.createElement("input");
                input2 = document.createElement("input");
                input1.id = "id" + index;
                input2.id = "value" + index;
                // input1.name = "id" + index;
                // input2.name = "value" + index;
                input1.type = "number";
                input2.type = "number";
                col2.appendChild(input1);
                col3.appendChild(input2);
                row.appendChild(col1);
                row.appendChild(col2);
                row.appendChild(col3);
                table.appendChild(row);
            }
        }
    }

    function initialize() {
        setTable();
        let elems = document.querySelectorAll("input[type=number], textarea");
        for (let el of elems) {
            if (el.id.indexOf("version-") != 0)
                el.oninput = setCSV;
        }
        elems = document.querySelectorAll("input[type=radio], input[type=checkbox]");
        for (let el of elems)
            el.onchange = setCSV;
            setCSV();
    }
    

    function setDisplayNumbers(){
        getElem("text-input").value = "6210,1,0,0,0,0";
        getElem("cmd").value = "CMD0004";
        getElem("rsp").value = "RSP0004";
    }

    function setCSV(){
        // Run Host List
        const cmd = "CMD0002";
        const rsp = "RSP0002";
        let text = "6,1,0,0,0,1\n";;
        let itemId, itemValue;
        let cnt = 0;
        let pickSequence = "";
        
        if (getInput("run-list-once").checked) 
            text += "8,1,0,0,0,1\n";
        else
            text += "8,1,0,0,0,0\n";

        text += "10,1,0,0,0,0\n";
    
        for (let index = 1; index <= numItems; index++) {
            itemId = getElem("id" + index).value;
            itemValue = getElem("value" + index).value;

            if (itemId){
                pickSequence += "," +  itemId;
                cnt++;
            } else
                break;

            if (itemValue){
                pickSequence += "," + itemValue;
            } else
                pickSequence += ",0";
        }
        text += "11," + 2*cnt + ",0,0,0" + pickSequence + "\n";

        if (getInput("opMode-pick").checked) 
            text += "5,1,0,0,0,2";
        else if (getInput("opMode-batch").checked) 
            text += "5,1,0,0,0,3";

        if (cnt == 0)
            text = "";

        getElem("text-input").value = text;
        getElem("cmd").value = cmd;
        getElem("rsp").value = rsp;
    } 

    function getElem(id) {
        const result = document.getElementById(id);
        if (result instanceof HTMLElement)
            return result;
        throw "Assertion error";
    }
    function getInput(id) {
        const result = getElem(id);
        if (result instanceof HTMLInputElement)
            return result;
        throw "Assertion error";
    }
    initialize();
})(app || (app = {}));
