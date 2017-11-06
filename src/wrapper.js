(function(root){
    if(typeof define === 'function' && define.amd){
        define([
            "strophe-core",
            "strophe-bosh",
            "strophe-websocket"
        ], function (wrapper) {
            return wrapper;
        });
    } else if (typeof exports === 'object') {
        var core = require('./core');
        require('./bosh');
        require('./websocket');
        module.exports = core;
    }
})(this);
