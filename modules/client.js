var net = require("net")
exports.module = function(helpers) {
    exports.client = new net.Socket();
    exports.client.connect(helpers.config.master.split(":")[1], helpers.config.master.split(":")[0], () => {
        helpers.log("state", "[CLIENT] Client has connected to master: " + helpers.config.master)
    })
    exports.client.on("close", () => {
        helpers.log("warning", "[CLIENT] Server has closed the connection!")
        //Handle close
    })
    exports.client.on("data", (data) => {
        data = JSON.parse(data)
        if (data.cmd == "HELLO") {
            exports.session_token = data.token
            helpers.log("state", "[CLIENT] Server gave token: " + data.token)
        }
        if (data.cmd == "QUIT") {
            helpers.log("warning", "[CLIENT] Server closed connection with reason: " + data.message)
        }
    })
}
exports.shutdown = function() {
    exports.client.destroy();
}