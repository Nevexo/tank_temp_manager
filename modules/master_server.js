var net = require("net")
var randomstring = require("randomstring")
var activeClients = {}
exports.activeClients = activeClients

function handleSocket(helpers, socket, nok, server) {
    activeClients[socket.remoteAddress + ":" + socket.remotePort] = {}
    activeClients[socket.remoteAddress + ":" + socket.remotePort].token = randomstring.generate()
    activeClients[socket.remoteAddress + ":" + socket.remotePort].socket = socket
    exports.activeClients = activeClients
    socket.write(JSON.stringify({"cmd": "HELLO", "dispatch_name": helpers.config.dispatch_name, "version": helpers.config.version, "message": "HELLO_CLIENT", "token": activeClients[socket.remoteAddress + ":" + socket.remotePort].token, "next_of_kin": helpers.config.next_of_kin.address + ":" + helpers.config.next_of_kin.port}))
    socket.on("close", () => {
        delete activeClients[socket.remoteAddress + ":" + socket.remotePort];
        helpers.log("state", "[MASTER] [ABORT] Client " + socket.remoteAddress + " has closed the connection.")
        if (helpers.config.next_of_kin.address == socket.remoteAddress) {
            helpers.log("warning", "[MASTER] NO NEXT OF KIN SERVER AVAILABLE, SYSTEM AT RISK.")
        }
    })
    socket.on("error", (error) => {
        helpers.log("error", "[SERVER SOCK] " + error)
    })
    socket.on("data", (data) => {
        data = JSON.parse(data)
        helpers.log("state", "[SERVER_CMD_DATA] " + data.cmd + " IS NOK SERVER: " + nok)
        if (data.cmd == "NOK_SHUTDOWN" && nok) {
            helpers.log("warning", "[SERVER] Shutting down by request of MASTER")
            exports.state = "NOK_QUIT"
            //Destroy all connections
            for (var key in activeClients) {
                if (activeClients.hasOwnProperty(key)) {
                  activeClients[key].socket.destroy()
                }
              }
            server.close(function () {
                helpers.log("state", "[SERVER] " + socket.remoteAddress + " - Approved NOK shutdown.")
                server.unref();
            });
        }else {
            
            if (data.token != activeClients[socket.remoteAddress + ":" + socket.remotePort].token) {
                socket.write(JSON.stringify({"cmd": "QUIT", "message": "INVALID_TOKEN"}))
                socket.destroy()
            }else {
                if (data.cmd == "APPROVE") {
                    helpers.controller.state("APPROVE", socket.remoteAddress + ":" + socket.remotePort)
                }else {
                    helpers.controller.state("DISAPPROVE", socket.remoteAddress + ":" + socket.remotePort)
                }
            }
            //helpers.log("state", "[DATA] " + data + " SOCKET TOKEN: " + activeClients[socket.remoteAddress + ":" + socket.remotePort].token)
        }

    })
}

exports.module = function(helpers, next_of_kin) {
    exports.state = "NOK_RUNNING"
    helpers.log("state", "Master Server manager is starting...")
    helpers.server = net.createServer(function(socket) {
        helpers.log("state", "[SOCKET] Connection established: " + socket.remoteAddress)
        if (helpers.config.peers.indexOf(socket.remoteAddress) > -1) {
            handleSocket(helpers, socket, next_of_kin, helpers.server)
        }else {
            socket.write(JSON.stringify({"cmd": "QUIT", "message": "NOT_VERIFIED_PEER"}))
            helpers.log("state", "[MASTER] [ABORT] " + socket.remoteAddress +  " is not a verified peer!")
            socket.destroy()
        }

    })
    var port;
    if (next_of_kin) {port = helpers.config.next_of_kin.port} else {port = helpers.config.ports.server_port}
    helpers.server.listen(port, "127.0.0.1", (error) => {
        if (error) {throw error;}
        helpers.log("state", "[MASTER] Server start on " + port)
    })

}
exports.shutdown = function(helpers) {
    helpers.log("warning", "[SERVER] Server is shutting down.")
    helpers.server.destroy()
}