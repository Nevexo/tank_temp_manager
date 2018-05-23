exports.module = function(helpers) {
    helpers.log("state", "Master Server manager is starting...")
    helpers.server = net.createServer(function(socket) {
        //Handle socket connection
    })
}