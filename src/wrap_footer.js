/* jshint ignore:start */
if (callback) {
    return callback(Strophe, $build, $msg, $iq, $pres);
}


})(function (Strophe, build, msg, iq, pres) {
    window.Strophe = Strophe;
    window.$build = build;
    window.$msg = msg;
    window.$iq = iq;
    window.$pres = pres;
});
/* jshint ignore:end */
