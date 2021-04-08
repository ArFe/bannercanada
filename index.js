const express = require("express");
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require("path");
const bodyParser = require("body-parser");
const exphbs = require('express-handlebars');
require('body-parser-xml')(bodyParser);
let xmlparser = require('express-xml-bodyparser');
let needle = require('needle');

needle.defaults({
    parse_response: false });

let port = process.env.PORT || 80;
//app.use(bodyParser.urlencoded({ extended: true }));
//app.use(bodyParser.json());
//app.use(bodyParser.xml());
//app.use(xmlparser());

let SSinfo = [];
let cmd = "";

// safely handles circular references
JSON.safeStringify = (obj, indent = 2) => {
    let cache = [];
    const retVal = JSON.stringify(
      obj,
      (key, value) =>
        typeof value === "object" && value !== null
          ? cache.includes(value)
            ? undefined // Duplicate reference found, discard key
            : cache.push(value) && value // Store value in our collection
          : value,
      indent
    );
    cache = null;
    return retVal;
  };

app.use(express.static("./public/"));
//app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', '.hbs');

app.engine('.hbs', exphbs({ 
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: __dirname + '/views/layouts/',
    partialsDir: __dirname + '/views/partials/',
    helpers: { 
        navLink: function(url, options){
            str = url.substring(0, url.length - 1);
            let www = new RegExp('^' + str + '.*$');
            if(url == '/') {
                www = new RegExp('^' + url + '$');
            }
            //console.log("Route " + app.locals.activeRoute);
            //console.log("URL " + www);
            //console.log("Test = " + www.test(app.locals.activeRoute))
            return '<li' +
            ((www.test(app.locals.activeRoute)) ? ' class="active" ' : '') +
            '><a href="' + url + '">' + options.fn(this) + '</a></li>';
           },
        equal: function (lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
               return options.fn(this);
            }
        }
    }
 }));

function xmlBody2Obj(req, res, next) {

  console.log("Escape!")

  let data = '';
  req.setEncoding('utf8');
  req.on('data', function(chunk) {
    data += chunk;
  });
  req.on('end', function() {
    req.xmlBodyObj = xml2Obj(data.toString());
    next();
  });
};

function xml2Obj(xmlData) {
  console.log('xml2Obj XML:\n' + xmlData);
  xmlData = xmlData.replace(/\<httplog\>/g, "{");
  xmlData = xmlData.replace(/<\/httplog\>/g, "}");
  xmlData = xmlData.replace(/\>(.*)=(.*)\</g, ">{$1=$2}<");
  xmlData = xmlData.replace(/\<(.*)\>(.*)\<\/(.*)\>/g, "\"$1\" : \"$2\",");
  xmlData = xmlData.replace(/\}\"/g, "\"}");
  xmlData = xmlData.replace(/\"\{/g, "{\"");
  xmlData = xmlData.replace(/\=/g, "\" : \"");
  xmlData = xmlData.replace(/\&/g, "\" , \"");
  xmlData = xmlData.replace(/\r?\n|\r/g, " ");
  xmlData = xmlData.replace(/\}, \}/g, "}]}");
  
  xmlData =xmlData.replace(/}, "log" : {/g, '} , {');
  xmlData =xmlData.replace(/, "log" : {/g, ', "log" : [{');

  xmlData =xmlData.replace(/}, "miss" : {/g, '} , {');
  xmlData =xmlData.replace(/, "miss" : {/g, ', "miss" : [{');


  console.log('xml2Obj JSON:\n' + xmlData);

  return JSON.parse(xmlData);
};

app.get('/', function(req, res){
  res.render("index");
  //res.sendFile(__dirname + '/index.html');
});

app.get('/status', function(req, res){
  res.sendFile(__dirname + '/status.html'); 
});

app.get('/sitesurvey/:value', function(req, res){
  res.render("sitesurvey", {id: req.params.value});
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
    //console.log(msg);
    try{
      msg = JSON.parse(msg);
    } catch(err){
      console.log("Error: " + err);
      console.log("Msg not able to be parsed: " + msg);
    }
    if(msg instanceof Object && 'dxmId' in msg){
      SSinfo.push(msg);
      //console.log("yes, I have dxmId property");
    }
  });
});

// setup a GET 'route' to listen on /push
app.get("/push", function(req,res){
    console.log(req.headers);
    console.log(req.originalUrl);
    console.log(req.query);
  let filter = JSON.stringify(req.query);
  //let filter = {"departmentName": req.params.value };
  console.log(filter);
  if(SSinfo.length > 0){
    for(let i = 0; i < SSinfo.length; i++){
      if(SSinfo[i].dxmId == req.query.id){
        cmd = "&reg5=" + SSinfo[i].siteSurvey + "&reg6=" + SSinfo[i].nodeNum
        SSinfo.splice(i,1);
      }
    }
  }

  let now = new Date();
  let month = now.getMonth() < 9 ? "0"+ (now.getMonth()+1) : (now.getMonth()+1); 
  let day = now.getDate() < 10 ? "0"+ now.getDate() : now.getDate() ; 
  let hours = now.getHours() < 10 ? "0"+ now.getHours() : now.getHours() ; 
  let minutes = now.getMinutes() < 10 ? "0"+ now.getMinutes() : now.getMinutes() ; 
  let seconds = now.getSeconds() < 10 ? "0"+ now.getSeconds() : now.getSeconds() ; 
  let currentDate = month  + "-" + day + "-" + now.getFullYear() + "-" + hours + ":" + minutes + ":" + seconds;
  cmd = "&tod=" + currentDate;
  //cmd = "&configure=/files/WLConfig.xml";
  cmd = "&dlf=http://dxmsamplebucket.s3.amazonaws.com/poc_mqtt_bkp20200103.sb";
  let response = "<html><head><title>HTTP Push Ack</title></head><body>id=" + req.query.id + cmd + "</body></html>";
  cmd = "";
  res.send(response);
  io.emit('chat message', filter);
  io.emit('chat message', response);

});

// setup a POST 'route' to listen on /banner
app.post("/push", function(req,res){
    console.log("POST body");
    console.log(JSON.stringify(req.xmlBodyObj));
    
    let id = req.xmlBodyObj.id;
    console.log("POST ID: parsed " + id);
    io.emit('chat message', "Post id: " + id);
    res.send("<html><head><title>HTTP Push Ack</title></head><body>id=" + id + "</body></html>");
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
