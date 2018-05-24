var args = process.argv.slice(2);
var chalk = require("chalk")

//Terminology
//bgBlue - Status/Hello messages - changes in states.
//bgRed - Error messages
//bgGreen - OK
//Normal - Argument/debugging messages
if (args.indexOf("-c") > -1) {
    var config = require("./" + args[args.indexOf("-c") + 1])
}else {
    var config = require("./config.json")
}

function log(type, message) {
    var colour;
    switch(type) {
        case "state":
            colour = "bgBlue"
            break;
        case "warning": 
            colour = "bgYellow"
            break;
        case "error":
            colour = "bgRed"
            break;
        case "ok":
            colour = "bgGreen"
            break;
        default:
            colour = "white"
            break;
    }
    console.log(chalk.grey("[" + config.dispatch_name + "] ") + chalk[colour]("[" + type.toUpperCase() + "]") + " " + message)
}
if (args.indexOf("-c") > -1) {
    log("state", "[ARG] Using custom log file: " + args[args.indexOf("-c") + 1])
}else {
    log("state", "[CONFIG] No special config provided, using config.json")
}

log("provided_args", args)

log("state", "Starting up...")
//Load modules
//Thirdparty/built-in
var net = require("net")
//Custom



log("def", "Version: " + config.version + "." + config.dispatch_name)
if (args.indexOf("-p") > -1) {
    //Port defined, use it instead of configuration:
    log("state", "[ARG] Port: " + args[args.indexOf("-p") + 1])
    config.ports.server_port = args[args.indexOf("-p") + 1].split(",")[0]
    config.ports.socket_port = args[args.indexOf("-p") + 1].split(",")[1]
}
if (args.indexOf("--master") > -1) {
    //Port defined, use it instead of configuration:
    log("state", "[ARG] Master: " + args[args.indexOf("-p") + 1])
    config.master = args[args.indexOf("--master") + 1].split(",")
}
if (args.indexOf("--peers") > -1) {
    //Using custom peers list:
    log("state", "[ARG] Peers: " + args[args.indexOf("--peers") + 1])
    config.peers = args[args.indexOf("--peers") + 1].split(",")
}


//Init finished.
if (config.master == "SELF") {
    log("state", "Starting up in master mode.")
    var master_module = require("./modules/master_server.js")
    var master = new master_module.module({"log": log, "config": config})
}else {
    var client_module = require("./modules/client.js")
    var client = new client_module.module({"log": log, "config": config})
}