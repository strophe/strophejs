$(document).ready(function () {
    module("Builder");

    test("Correct namespace (#32)", function () {
        var stanzas = [new Strophe.Builder("message", {}).tree(),
                       $build("iq", {}).tree(),
                       $pres().tree()];
        $.each(stanzas, function () {
            equals($(this).attr("xmlns"), Strophe.NS.CLIENT,
                  "Namespace should be '" + Strophe.NS.CLIENT + "'");
        });
    });
    
    test("send() accepts Builders (#27)", function () {
        var stanza = $pres();
        var conn = new Strophe.Connection("");
        // fake connection callback to avoid errors
        conn.connect_callback = function () {};
        
        ok(conn._data.length === 0, "Output queue is clean");
        try {
            conn.send(stanza);
        } catch (e) {}
        ok(conn._data.length === 1, "Output queue contains an element");
    });

    test("send() does not accept strings", function () {
        var stanza = "<presence/>";
        var conn = new Strophe.Connection("");
        // fake connection callback to avoid errors
        conn.connect_callback = function () {};
        expect(1);
        try {
            conn.send(stanza);
        } catch (e) {
            equals(e.name, "StropheError", "send() should throw exception");
        }
    });
    test("xml escape test", function () {
        var text = "s & p";
	var textNode = Strophe.xmlTextNode(text);
	equals(textNode.textContent, "s &amp; p", "should be escaped.");
	var text0 = "s < & > p";
	var textNode0 = Strophe.xmlTextNode(text0);
	equals(textNode0.textContent, "s &lt; &amp; &gt; p", "should be escaped.");
    });
});
