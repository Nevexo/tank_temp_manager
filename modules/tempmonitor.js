var request = require("request")

exports.state = "OFF"
exports.module = function(helpers) {
    exports.state = "RUNNING"
    exports.monitor_temp = setInterval(() => {
        request.get(helpers.config.tank_server.server, function(error, response, body) {
            if (error) {
                helpers.log("error", "[TMPMON] Error: " + error)
            }else {
                var arr = body.split("|")
                var temp = arr[helpers.config.tank_server.array_location]
                //var temp = 40
                helpers.log("state", "[TMPMON] Tank temperature: " + temp)
                if (temp > helpers.config.tank_server.thresholds.max && helpers.config.tank_server.modes.indexOf("OVERHEAT") > -1) {
                    //Tank overheating
                    helpers.log("warning", "[TMPMON] Tank is overheating! Starting operations.")
                    helpers.controller.update_state(helpers, "OFF")
                }else if (temp < helpers.config.tank_server.thresholds.min && helpers.config.tank_server.modes.indexOf("TOO_COLD") > -1) {
                    helpers.log("warning", "[TMPMON] Tank is overheating! Starting operations.")
                    helpers.controller.update_state(helpers, "ON")
                }

            }
        })
    }, helpers.config.refresh_time)
}
exports.verify = function(verify_state, helpers, callback) {
    request.get(helpers.config.tank_server.server, function(error, response, body) {
        if (error) {
            helpers.log("error", "[TMPMON] Error: " + error)
        }else {
            var arr = body.split("|")
            var temp = arr[helpers.config.tank_server.array_location]
            //var temp = 40
            helpers.log("state", "[TMPMON] Tank temperature: " + temp)
            if (verify_state == "OVERHEAT") {
                if (temp > helpers.config.tank_server.thresholds.max) {
                    //Tank overheating
                    callback(true)
                }else {
                    callback(false)
                }
            }
            if (verify_state == "TOO_COLD") {
                if (temp < helpers.config.tank_server.thresholds.min) {
                    //Tank overheating
                    callback(true)
                }else {
                    callback(false)
                }
            }

        }
    })
}
exports.shutdown = function() {
    exports.state == "OFF"
    clearInterval(exports.monitor_temp)
}