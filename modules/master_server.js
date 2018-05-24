var net = require("net")
var randomstring = require("randomstring")
var activeClients = {}

function handleSocket(helpers, socket) {
    activeClients[socket.remoteAddress + ":" + socket.remotePort] = {}
    activeClients[socket.remoteAddress + ":" + socket.remotePort].token = randomstring.generate()
    socket.write(JSON.stringify({"cmd": "HELLO", "dispatch_name": helpers.config.dispatch_name, "version": helpers.config.version, "message": "HELLO_CLIENT", "token": activeClients[socket.remoteAddress + ":" + socket.remotePort].token, "next_of_kin": helpers.config.next_of_kin.address + ":" + helpers.config.next_of_kin.port}))
    socket.on("close", () => {
        helpers.log("state", "[MASTER] [ABORT] Client " + socket.remoteAddress + " has closed the connection.")
        if (helpers.config.next_of_kin.address == socket.remoteAddress) {
            helpers.log("warning", "[MASTER] NO NEXT OF KIN SERVER AVAILABLE, SYSTEM AT RISK.")
        }
    })
    socket.on("data", (data) => {
        data = JSON.parse(data)
        if (data.token != activeClients[socket.remoteAddress + ":" + socket.remotePort].token) {
            socket.write(JSON.stringify({"cmd": "QUIT", "message": "INVALID_TOKEN"}))
            socket.destroy()
        }
        helpers.log("state", "[DATA] " + data + " SOCKET TOKEN: " + activeClients[socket.remoteAddress + ":" + socket.remotePort].token)
    })
}

exports.module = function(helpers) {
    helpers.log("state", "Master Server manager is starting...")
    helpers.server = net.createServer(function(socket) {
        helpers.log("state", "[SOCKET] Connection established: " + socket.remoteAddress)
        if (helpers.config.peers.indexOf(socket.remoteAddress) > -1) {
            handleSocket(helpers, socket)
        }else {
            socket.write(JSON.stringify({"cmd": "QUIT", "message": "NOT_VERIFIED_PEER"}))
            helpers.log("state", "[MASTER] [ABORT] " + socket.remoteAddress +  " is not a verified peer!")
            socket.destroy()
        }

    })
    helpers.server.listen(helpers.config.ports.server_port, "127.0.0.1", (error) => {
        if (error) {throw error;}
        helpers.log("state", "[MASTER] Srever start on " + helpers.config.ports.server_port)
    })
}