exports.module = function(helpers) {
    helpers.log("sate", "Controller module is starting...")
    function state_update(state, controller, dispatch_time) {
        if (dispatch_time == "now") {
            helpers.log("ok", "Controller " + controller + " new state: " + state)
        }else {
            helpers.log("ok", "[READY FOR DISPATCH] Controller " + controller + " new state: " + state)
        } 
    }
}