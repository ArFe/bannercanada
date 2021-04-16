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
const yargs = require('yargs');
yargs.command('*', false, (yargs) => {
    yargs
        .option('endpoint', {
        alias: 'e',
        description: "Your AWS IoT custom endpoint, not including a port. " +
            "Ex: \"abcd123456wxyz-ats.iot.us-east-1.amazonaws.com\"",
        type: 'string',
        required: true
    })
        .option('ca_file', {
        alias: 'r',
        description: 'FILE: path to a Root CA certficate file in PEM format.',
        type: 'string',
        required: false
    })
        .option('cert', {
        alias: 'c',
        description: 'FILE: path to a PEM encoded certificate to use with mTLS',
        type: 'string',
        required: false
    })
        .option('key', {
        alias: 'k',
        description: 'FILE: Path to a PEM encoded private key that matches cert.',
        type: 'string',
        required: false
    })
        .option('client_id', {
        alias: 'C',
        description: 'Client ID for MQTT connection.',
        type: 'string',
        required: false
    })
        .option('topic', {
        alias: 't',
        description: 'STRING: Targeted topic',
        type: 'string',
        default: 'test/topic'
    })
        .option('count', {
        alias: 'n',
        default: 10,
        description: 'Number of messages to publish/receive before exiting. ' +
            'Specify 0 to run forever.',
        type: 'number',
        required: false
    })
        .option('use_websocket', {
        alias: 'W',
        default: false,
        description: 'To use a websocket instead of raw mqtt. If you ' +
            'specify this option you must specify a region for signing, you can also enable proxy mode.',
        type: 'boolean',
        required: false
    })
        .option('signing_region', {
        alias: 's',
        default: 'us-east-1',
        description: 'If you specify --use_websocket, this ' +
            'is the region that will be used for computing the Sigv4 signature',
        type: 'string',
        required: false
    })
        .option('proxy_host', {
        alias: 'H',
        description: 'Hostname for proxy to connect to. Note: if you use this feature, ' +
            'you will likely need to set --ca_file to the ca for your proxy.',
        type: 'string',
        required: false
    })
        .option('proxy_port', {
        alias: 'P',
        default: 8080,
        description: 'Port for proxy to connect to.',
        type: 'number',
        required: false
    })
        .option('message', {
        alias: 'M',
        description: 'Message to publish.',
        type: 'string',
        default: 'Hello world!'
    })
        .option('verbosity', {
        alias: 'v',
        description: 'BOOLEAN: Verbose output',
        type: 'string',
        default: 'none',
        choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'none']
    })
        .help()
        .alias('help', 'h')
        .showHelpOnFail(false);
}, main).parse();
function execute_session(connection, argv) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const decoder = new util_1.TextDecoder('utf8');
                const on_publish = (topic, payload, dup, qos, retain) => __awaiter(this, void 0, void 0, function* () {
                    const json = decoder.decode(payload);
                    console.log(`Publish received. topic:"${topic}" dup:${dup} qos:${qos} retain:${retain}`);
                    console.log(json);
                    const message = JSON.parse(json);
                    if (message.sequence == argv.count) {
                        resolve();
                    }
                });
                yield connection.subscribe(argv.topic, aws_iot_device_sdk_v2_1.mqtt.QoS.AtLeastOnce, on_publish);
                for (let op_idx = 0; op_idx < argv.count; ++op_idx) {
                    const publish = () => __awaiter(this, void 0, void 0, function* () {
                        const msg = {
                            message: argv.message,
                            sequence: op_idx + 1,
                        };
                        const json = JSON.stringify(msg);
                        connection.publish(argv.topic, json, aws_iot_device_sdk_v2_1.mqtt.QoS.AtLeastOnce);
                    });
                    setTimeout(publish, op_idx * 1000);
                }
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
        yield execute_session(connection, argv);
        yield connection.disconnect();
        // Allow node to die if the promise above resolved
        clearTimeout(timer);
    });
}
//# sourceMappingURL=index.js.map