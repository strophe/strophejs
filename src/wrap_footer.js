/* jshint ignore:start */
if (callback) {
    if(typeof define === 'function' && define.amd){
        //For backwards compatability
        var n_callback = callback;
        if (typeof requirejs === 'function') {
            requirejs(["strophe"], function(o){
                n_callback(o.Strophe,o.$build,o.$msg,o.$iq,o.$pres);
            });
        } else {
            require(["strophe"], function(o){
                n_callback(o.Strophe,o.$build,o.$msg,o.$iq,o.$pres);
            });
        }
    }else{
        return callback(Strophe, $build, $msg, $iq, $pres);
    }
}


})(function (Strophe, build, msg, iq, pres) {
    window.Strophe = Strophe;
    window.$build = build;
    window.$msg = msg;
    window.$iq = iq;
    window.$pres = pres;
});
/* jshint ignore:end */
