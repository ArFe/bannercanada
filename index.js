"use strict";
/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const aws_iot_device_sdk_v2_1 = require("aws-iot-device-sdk-v2");
const util_1 = require("util");
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
const { argv } = require("yargs");

const endpoint = "a1ancdr6cxlr44-ats.iot.us-east-1.amazonaws.com";
const ca_file = "AmazonRootCA1.pem";
const cert = "ab662e52e8-certificate.pem.crt";
const key = "ab662e52e8-private.pem.key";

const maxErrCnt = 3;
const errTimeout = 5;

needle.defaults({
    parse_response: false });

let port = process.env.PORT || 80;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.xml());
app.use(xmlparser());

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

  
    
app.get('/qrcode', function(req, res){
res.sendFile(__dirname + '/public/qrcode/qrcodegen-input-demo.html');
});

app.get('/ptl', function(req, res){
res.sendFile(__dirname + '/views/ptl.html');
});
  
app.post('/ptl', function(req, res){
    console.log("POST body");
    console.log(JSON.safeStringify(req.body));

    const values = req.body.values.split("\r\n");
    const cmd = req.body.cmd + " ";
    const rsp = req.body.rsp;

    sendMQTTmsg(req.body.dxmid, cmd, values, rsp);


    res.sendFile(__dirname + '/views/ptl.html');
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
      console.log(msg.topic);
    } catch(err){
      console.log("Error: " + err);
      console.log("Msg not able to be parsed: " + msg);
    }
    if(msg instanceof Object && 'dxmId' in msg){
        SSinfo.push(msg);
        console.log("yes, I have dxmId property");
    }

    if(msg instanceof Object && 'topic' in msg && 'msg' in msg){
        sendMQTTmsg(msg.topic, msg.msg);
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
//   main(process.argv);
  console.log('listening on *:' + port);
});

process.on('exit', function(code) {
    return console.log(`About to exit with code ${code}`);
});

async function sendMQTTmsg(topic, cmd, values, rsp) {

    argv['endpoint'] = endpoint;
    argv['ca_file'] = ca_file;
    argv['cert'] = cert;
    argv['key'] = key;
    // argv['client_id'] = "ptlApp";
    argv['topic'] = topic;
    argv['count'] = 1;
    argv['use_websocket'] = false;
    argv['signing_region'] = "us-east-1";
    // argv['proxy_host'] = null;
    argv['proxy_port'] = 8080;
    argv['verbosity'] = 'none';

    argv['cmd'] = cmd;
    argv['values'] = values;
    argv['rsp'] = rsp;

    main(argv);
    
};

function execute_session(connection, topic, cmd, value, rsp) {
    const topicsub = topic +"/response"; 
    const topicpub = topic +"/request"; 
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const decoder = new util_1.TextDecoder('utf8');
                const on_publish = (topic, payload, dup, qos, retain) => __awaiter(this, void 0, void 0, function* () {
                    const json = decoder.decode(payload);
                    console.log(`Publish received. topic:"${topic}" dup:${dup} qos:${qos} retain:${retain}`);
                    console.log(json);
                    const message = JSON.parse(json);
                    if (message.api.includes(rsp)) {
                        resolve(rsp);
                    }
                });
                yield connection.subscribe(topicsub, aws_iot_device_sdk_v2_1.mqtt.QoS.AtMostOnce, on_publish);
                const publish = () => __awaiter(this, void 0, void 0, function* () {
                    const msg = {
                        api: cmd + " " + value
                    };
                    const json = JSON.stringify(msg);
                    connection.publish(topicpub, json, aws_iot_device_sdk_v2_1.mqtt.QoS.AtMostOnce);
                });
                // publish;
                setTimeout(publish, 1000);
                setTimeout(function(){ reject("timeout"); }, errTimeout * 1000);
                
            }
            catch (error) {
                reject(error);
            }
        }));
    });
}
function main(argv) {
    return __awaiter(this, void 0, void 0, function* () {
        if (argv.verbosity != 'none') {
            const level = parseInt(aws_iot_device_sdk_v2_1.io.LogLevel[argv.verbosity.toUpperCase()]);
            aws_iot_device_sdk_v2_1.io.enable_logging(level);
        }
        const client_bootstrap = new aws_iot_device_sdk_v2_1.io.ClientBootstrap();
        let config_builder = null;
        if (argv.use_websocket) {
            let proxy_options = undefined;
            if (argv.proxy_host) {
                proxy_options = new aws_iot_device_sdk_v2_1.http.HttpProxyOptions(argv.proxy_host, argv.proxy_port);
            }
            config_builder = aws_iot_device_sdk_v2_1.iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets({
                region: argv.signing_region,
                credentials_provider: aws_iot_device_sdk_v2_1.auth.AwsCredentialsProvider.newDefault(client_bootstrap),
                proxy_options: proxy_options
            });
        }
        else {
            config_builder = aws_iot_device_sdk_v2_1.iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(argv.cert, argv.key);
        }
        if (argv.ca_file != null) {
            config_builder.with_certificate_authority_from_path(undefined, argv.ca_file);
        }
        config_builder.with_clean_session(false);
        config_builder.with_client_id(argv.client_id || "test-" + Math.floor(Math.random() * 100000000));
        config_builder.with_endpoint(argv.endpoint);
        // force node to wait 60 seconds before killing itself, promises do not keep node alive
        const timer = setTimeout(() => { }, 60 * 1000);
        const config = config_builder.build();
        const client = new aws_iot_device_sdk_v2_1.mqtt.MqttClient(client_bootstrap);
        const connection = client.new_connection(config);
        yield connection.connect();
        console.log('After connect');
        let i = 0
        let errorCnt = 0
        while(i < argv.values.length){
            try {
                console.log('argv.values[i] = ' + argv.values[i]);
                let result = yield execute_session(connection, argv.topic, argv.cmd, argv.values[i], argv.rsp);              
                console.log('result = ' + result);
                i++;
                errorCnt = 0
            } catch (error) {
                console.log('error = ' + error);
                if(++errorCnt >= maxErrCnt){
                    console.log('Max error achieve. Commands failed');
                    break;
                }
            }
        }
        yield connection.disconnect();  
        console.log('After disconnect');
        // Allow node to die if the promise above resolved
        clearTimeout(timer);
    });
}
//# sourceMappingURL=index.js.map
