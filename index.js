var args = process.argv.slice(2);
var chalk = require("chalk")
var previous_state = 0
var master_module = require("./modules/master_server.js")
var client_module = require("./modules/client.js")
var tempmon_module = require("./modules/tempmonitor.js")
var controller = require("./modules/controller.js")
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
        case "highlight": 
            colour = "bgMagenta"
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

function NOK() {
    //Next of Kin mode
    if (config.next_of_kin.self == true) {
        log("state", "[NOK] Entering next of kin mode, master starting.")
        var master = new master_module.module({"log": log, "config": config, "controller": controller}, true)
        if (tempmon_module.state == "OFF") {
            log("highlight", "[TMPMON] Staring tempMon in remote.")
            var tempmon = new tempmon_module.module({"log": log, "config": config, "controller": controller, "active_clients": master_module.activeClients})
        }
        var monitor_nok = setInterval(() => {
            //log("highlight", master_module.state)
            if (master_module.state == "NOK_QUIT") {
                log("state", "[NOK] NOK stopped, restarting.")
                clearInterval(monitor_nok)
                if (tempmon_module.state == "RUNNING") {tempmon_module.shutdown()}
                start()
            }
        }, 500)
        //  stopMaster()
    }
}

function stopMaster() {
    master_module.shutdown({"log": log, "server": master})
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
function start() {
    log("highlight", "[STATE UPDATE] Starting normally.")
    if (config.master == "SELF") {
        log("state", "This server is MASTER - Checking for NOK Server.")
        var client = new client_module.module({"log": log, "config": config}, "VERIFY_NOK", (NOK_STATE) => {
            if (NOK_STATE == "NO_NOK") {
                var master = new master_module.module({"log": log, "config": config, "controller": controller}, false)
                if (tempmon_module.state == "OFF") {
                    log("highlight", "[TMPMON] Staring tempMon in remote.")
                    var tempmon = new tempmon_module.module({"log": log, "config": config, "controller": controller, "active_clients": master_module.activeClients})
                }
            }
        })
        
    }else {
        var client = new client_module.module({"log": log, "config": config}, "START_NORMAL")
        previous_state = 0;
        var check_client_state = setInterval(() => {
            if (client_module.state == "DANGER") {
                if (config.next_of_kin.self) {
                    previous_state++;
                    if (previous_state > 5) {
                        log("highlight", "[CLIENT] Entering NOK mode.")
                        client_module.state = "DISABLED"
                        client_module.shutdown({"log": log})
                        clearInterval(check_client_state)
                        NOK()
                    }else {
                        var client = new client_module.module({"log": log, "config": config}, "START_NORMAL")
                    }
                }else {
                    //I'm not the NOK, connect to the damn NOK (try atleast.)
                    clearInterval(check_client_state)
                    previous_state = 0;
                    var client = new client_module.module({"log": log, "config": config}, "START_NOK")
                    var check_nok_start_state = setInterval(() => {
                        //log("highlight", client_module.state)
                        if (client_module.state == "DANGER") {
                            previous_state++;
                            if (previous_state > 20) {
                                log("error", "[ABORT] NOK & Master are unavailable. A restart has been requested for 30 seconds from now.")
                                clearInterval(check_nok_start_state)
                                previous_state = 0;
                                setTimeout(() => {
                                    log("highlight", "[RESTART] Recovering from NOK/Master lock.")
                                    start()
                                }, 30000)
                            }else {
                                var client = new client_module.module({"log": log, "config": config}, "START_NOK") 
                            }
                        }

                    }, 500) 
                }

            }
        }, 500)
    }
}

start()