(function(root){
    if(typeof define === 'function' && define.amd){
        define("strophe", [
            "strophe-core",
            "strophe-websocket"
        ], function (wrapper) {
            return wrapper;
        });
    }
})(this);
