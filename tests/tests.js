$(document).ready(function () {
    module("Builder");

    test("Correct namespace (#32)", function () {
        var stanzas = [new Strophe.Builder("message", {}).tree(),
                       $build("iq", {}).tree(),
                       $pres().tree()];
        $.each(stanzas, function () {
            equals(Strophe.NS.CLIENT, $(this).attr("xmlns"), 
                  "Namespace should be '" + Strophe.NS.CLIENT + "'.");
        });
    });
});