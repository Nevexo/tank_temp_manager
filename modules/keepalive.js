//Master section  
exports.master_montior = function(helpers) {
    helpers.log("highlight", "[KEEPALIVE] Starting keepalive for MASTER.")
    exports.mm_interval = setInterval(() => {
        for (var key in helpers.active_clients) {
            if (helpers.active_clients.hasOwnProperty(key)) {
                //helpers.log("highlight", "[KA] Sending keepalive to " + key)
                var dt = new Date()
                if (helpers.active_clients[key].keep_alive != undefined && helpers.active_clients[key].keep_alive["recieve"] == "NOT_RETURNED") {
                    if (helpers.active_clients[key].keep_alive["failed_attempts"] >= 3) {
                        //The client is completely gone, close connection to it.
                        helpers.log("error", "[KA] " + key + " has gone, destroying connection.")
                        helpers.active_clients[key].socket.destroy();
                    }else {
                        helpers.active_clients[key].socket.write(JSON.stringify({"cmd": "KEEP_ALIVE", "time": dt.getTime()}))
                        helpers.active_clients[key].keep_alive["send"] = dt.getTime()
                        helpers.active_clients[key].keep_alive["recieve"] = "NOT_RETURNED"
                        helpers.active_clients[key].keep_alive["failed_attempts"]++
                    }
                }else {
                    helpers.active_clients[key].socket.write(JSON.stringify({"cmd": "KEEP_ALIVE", "time": dt.getTime()}))
                    helpers.active_clients[key].keep_alive = {}
                    helpers.active_clients[key].keep_alive["send"] = dt.getTime()
                    helpers.active_clients[key].keep_alive["recieve"] = "NOT_RETURNED"
                    helpers.active_clients[key].keep_alive["failed_attempts"] = 0;
                }
            }
        }
    }, 5000)
}
exports.ack_keep_alive = function(helpers, keep_alive) {
    var dt = new Date()
    helpers.active_clients[keep_alive].keep_alive["recieve"] = dt.getTime()
    delete helpers.active_clients[keep_alive].keep_alive["failed_attempts"];
}
exports.cm_monitor = function(helpers, callback) {
    exports.client_keep_alive = 0;
    exports.cm_interval = setInterval(() => {
        //helpers.log("error", "LAST UPDATED: " + exports.client_keep_alive)
        //helpers.log("highlight", exports.client_keep_alive + 30 <= Math.floor(Date.now() / 1000))
        if (exports.client_keep_alive + 30 <= Math.floor(Date.now() / 1000)) {
            callback("SERVER_DOWN")
            clearInterval(exports.cm_interval)
            //Tell the client if the server has been down for more than 30 seconds.
        }
    }, 5000)
}
exports.update_server_ack_time = function() {
    exports.client_keep_alive = Math.floor(Date.now() / 1000)
}
exports.stop_all = function() {
    if (exports.mm_interval != undefined) {clearInterval(exports.mm_interval)}
    if (exports.cm_interval != undefined) {clearInterval(exports.cm_interval)}
}