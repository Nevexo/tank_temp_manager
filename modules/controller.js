var approval_queue = {}
const TPLSmartDevice = require('tplink-lightbulb')

exports.control_sockets = function(helpers, state) {
    helpers.log("state", "[CONTROLLER RELAY] Switching relay into " + state)
    var socket = new TPLSmartDevice(helpers.config.tank_server.socket_ip)
    socket.info().then(status => {
        if (status.relay_state == 0 && state != false) {
            socket.power(state).then(status => {
                console.log(status)
            }).catch(error => {
                helpers.log("error", "[CONTROLLER] Socket failure: " + error)
            })
        }else if (status.relay_state == 1 && state == false) {
            socket.power(state).then(status => {
                console.log(status)
            }).catch(error => {
                helpers.log("error", "[CONTROLLER] Socket failure: " + error)
            })
        }
    })

}
function handleApprovals(helpers, state, callback) {
    exports.responses = {}
    helpers.log("state", "[CONTROLLER] Aquiring permission to: "+state)
    for (var key in helpers.active_clients) {
        if (helpers.active_clients.hasOwnProperty(key)) {
          helpers.active_clients[key].socket.write(JSON.stringify({"cmd": "VERIFY", "verify_state": state}))
          approval_queue[key] = false;
        }
    }
    //Wait 5 seconds for responses
    var approved = true;
    setTimeout(() => {
        helpers.log("state", "[CONTROLLER] Responses in, verifying...")
        for (var key in approval_queue) {
            if (approval_queue.hasOwnProperty(key)) {
                if (approval_queue[key] != "APPROVE") {
                    approved = false;
                }
            }
        }
        if (approved) {
            helpers.log("highlight", "[CONTROLLER] All clients approved task of " + state)
            callback(true)
        }else {
            helpers.log("error", "[CONTROLLER] Task " + state + " disapproved by clients.")
            callback(false)
        }
    }, 5000)
}
exports.update_state = function(helpers, state) {
    approval_queue = {}
    if (state == "OFF") {
        handleApprovals(helpers, "OVERHEAT", (result) => {
            if (result) {
                exports.control_sockets(helpers, false)
            }
        })
    }else if (state == "ON") {
        handleApprovals(helpers, "TOO_COLD", (result) => {
            if (result) {
                exports.control_sockets(helpers, true)
            }
        })
    }else {
        helpers.log("error", "[CONTROLLER] Socket request failure: " + state)
    }
}
exports.state = function(state, server) {
    approval_queue[server] = state
    console.log(approval_queue)
}