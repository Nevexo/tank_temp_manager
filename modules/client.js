var net = require("net")
var temp_montior = require("./tempmonitor.js")
function handleData(helpers, data) {
    helpers.log("highlight", "[CLIENT] Request data: " + JSON.stringify(data))
    if (data.cmd == "VERIFY") {
        temp_montior.verify(data.verify_state, helpers, (result) => {
            if (result) {
                helpers.log("state", "[CLIENT] Approved request to " + data.verify_state)
                exports.client.write(JSON.stringify({"cmd": "APPROVE", "token": exports.session_token}))
            }else {
                helpers.log("state", "[CLIENT] Disapproved request to " + data.verify_state)
                exports.client.write(JSON.stringify({"cmd": "DISAPPROVE", "token": exports.session_token}))
            }
        })
    } 
} 
exports.module = function(helpers, mode, callback) {
    exports.client = new net.Socket();
    if (mode == "VERIFY_NOK") {
        helpers.log("state", "[CLIENT] Verifying NOK is down...")
        exports.client.connect(helpers.config.next_of_kin.port, helpers.config.next_of_kin.address, (error) => {
            if (error) {
                helpers.log("state", "[CLIENT] No NOK server running!")
                callback("NO_NOK")
            }else {
                helpers.log("warning", "[CLIENT] NOK server is alive, asking it to shut down.")
                exports.client.write(JSON.stringify({"cmd": "NOK_SHUTDOWN"}))
            }

        })
        exports.client.on("error", () => {}) //Handle an error state.
        exports.client.on("close", () => {
            helpers.log("state", "[NOK] NOK has gone offline, continue master start...")
            callback("NO_NOK")})
    }else if (mode == "START_NOK") {
        helpers.log("state", "[CLIENT] Starting in NOK mode.")
        exports.state = "CONNECTING"
        exports.client.connect(helpers.config.next_of_kin.port, helpers.config.next_of_kin.address, (error) => {
            exports.state = "OK"
            helpers.log("state", "[NOKCLIENT] Client has connected to NOK: " + helpers.config.master)
        })
        exports.client.on("error", (error) => {
            helpers.log("error", "[NOKCLIENT] Error: " + error)
            exports.state = "DANGER"
        })
        exports.client.on("close", () => {
            helpers.log("warning", "[NOKCLIENT] NOK Server has closed the connection!")
            exports.state = "DANGER"
            //Handle close
        })
        exports.client.on("data", (data) => {
            data = JSON.parse(data)
            if (data.cmd == "HELLO") {
                exports.session_token = data.token
                helpers.log("state", "[NOKCLIENT] Server gave token: " + data.token)
            }else if (data.cmd == "QUIT") {
                helpers.log("warning", "[NOKCLIENT] Server closed connection with reason: " + data.message)
            }else {
                handleData(helpers, data)
            }
        })

    }else {
        exports.state = "CONNECTING"
        exports.client.connect(helpers.config.master.split(":")[1], helpers.config.master.split(":")[0], (error) => {
            exports.state = "OK"
            helpers.log("state", "[CLIENT] Client has connected to master: " + helpers.config.master)
        })
        exports.client.on("error", (error) => {
            helpers.log("error", "[CLIENT] Error: " + error)
            exports.state = "DANGER"
        })
        exports.client.on("close", () => {
            helpers.log("warning", "[CLIENT] Server has closed the connection!")
            exports.state = "DANGER"
            //Handle close
        })
        exports.client.on("data", (data) => {
            data = JSON.parse(data)
            if (data.cmd == "HELLO") {
                exports.session_token = data.token
                helpers.log("state", "[CLIENT] Server gave token: " + data.token)
            }else if (data.cmd == "QUIT") {
                helpers.log("warning", "[CLIENT] Server closed connection with reason: " + data.message)
            }else {
                handleData(helpers, data)
            }
        })
    }
    
}
exports.shutdown = function(helpers) {
    helpers.log("warning", "[CLIENT] Client has shutdown on request.")
    exports.client.destroy();
    exports.state = "DISABLED"
}