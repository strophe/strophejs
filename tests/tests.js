$(document).ready(function () {
    module("JIDs");

    test("Normal JID", function () {
        var jid = "darcy@pemberley.lit/library";
        equals(Strophe.getNodeFromJid(jid), "darcy",
               "Node should be 'darcy'");
        equals(Strophe.getDomainFromJid(jid), "pemberley.lit",
               "Domain should be 'pemberley.lit'");
        equals(Strophe.getResourceFromJid(jid), "library",
               "Node should be 'library'");
        equals(Strophe.getBareJidFromJid(jid),
               "darcy@pemberley.lit",
               "Bare JID should be 'darcy@pemberley.lit'");
    });

    test("Weird node (unescaped)", function () {
        var jid = "darcy@netherfield.lit@pemberley.lit/library";
        equals(Strophe.getNodeFromJid(jid), "darcy",
               "Node should be 'darcy'");
        equals(Strophe.getDomainFromJid(jid),
               "netherfield.lit@pemberley.lit",
               "Domain should be 'netherfield.lit@pemberley.lit'");
        equals(Strophe.getResourceFromJid(jid), "library",
               "Resource should be 'library'");
        equals(Strophe.getBareJidFromJid(jid),
               "darcy@netherfield.lit@pemberley.lit",
               "Bare JID should be 'darcy@netherfield.lit@pemberley.lit'");
    });

    test("Weird node (escaped)", function () {
        var escapedNode = Strophe.escapeNode("darcy@netherfield.lit");
        var jid = escapedNode + "@pemberley.lit/library";
        equals(Strophe.getNodeFromJid(jid), "darcy\\40netherfield.lit",
               "Node should be 'darcy\\40netherfield.lit'");
        equals(Strophe.getDomainFromJid(jid),
               "pemberley.lit",
               "Domain should be 'pemberley.lit'");
        equals(Strophe.getResourceFromJid(jid), "library",
               "Resource should be 'library'");
        equals(Strophe.getBareJidFromJid(jid),
               "darcy\\40netherfield.lit@pemberley.lit",
               "Bare JID should be 'darcy\\40netherfield.lit@pemberley.lit'");
    });

    test("Weird resource", function () {
        var jid = "books@chat.pemberley.lit/darcy@pemberley.lit/library";
        equals(Strophe.getNodeFromJid(jid), "books",
               "Node should be 'books'");
        equals(Strophe.getDomainFromJid(jid), "chat.pemberley.lit",
               "Domain should be 'chat.pemberley.lit'");
        equals(Strophe.getResourceFromJid(jid),
               "darcy@pemberley.lit/library",
               "Resource should be 'darcy@pemberley.lit/library'");
        equals(Strophe.getBareJidFromJid(jid),
               "books@chat.pemberley.lit",
               "Bare JID should be 'books@chat.pemberley.lit'");
    });

    module("Builder");

    test("Correct namespace (#32)", function () {
        var stanzas = [new Strophe.Builder("message", {foo: "asdf"}).tree(),
                       $build("iq", {}).tree(),
                       $pres().tree()];
        $.each(stanzas, function () {
            equals($(this).attr('xmlns'), Strophe.NS.CLIENT,
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

    test("Builder with XML attribute escaping test", function () {
        var text = "<b>";
        var expected = "<presence to='&lt;b>' xmlns='jabber:client'/>";
        var pres = $pres({to: text});
        equals(pres.toString(), expected, "< should be escaped");

        text = "foo&bar";
        expected = "<presence to='foo&amp;bar' xmlns='jabber:client'/>";
        pres = $pres({to: text});
        equals(pres.toString(), expected, "& should be escaped");
    });

    module("XML");

    test("XML escaping test", function () {
        var text = "s & p";
	var textNode = Strophe.xmlTextNode(text);
	equals(Strophe.getText(textNode), "s &amp; p", "should be escaped");
	var text0 = "s < & > p";
	var textNode0 = Strophe.xmlTextNode(text0);
	equals(Strophe.getText(textNode0), "s &lt; &amp; &gt; p", "should be escaped");
    });

    test("XML element creation", function () {
        var elem = Strophe.xmlElement("message");
        equals(elem.tagName, "message", "Element name should be the same");
    });

    module("Handler");

    test("Full JID matching", function () {
        var elem = $msg({from: 'darcy@pemberley.lit/library'}).tree();
        
        var hand = new Strophe.Handler(null, null, null, null, null,
                                       'darcy@pemberley.lit/library');
        equals(hand.isMatch(elem), true, "Full JID should match");

        hand = new Strophe.Handler(null, null, null, null, null,
                                       'darcy@pemberley.lit')
        equals(hand.isMatch(elem), false, "Bare JID shouldn't match");
    });

    test("Bare JID matching", function () {
        var elem = $msg({from: 'darcy@pemberley.lit/library'}).tree();

        var hand = new Strophe.Handler(null, null, null, null, null,
                                       'darcy@pemberley.lit/library',
                                       {matchBare: true});
        equals(hand.isMatch(elem), true, "Full JID should match");
        
        hand = new Strophe.Handler(null, null, null, null, null,
                                   'darcy@pemberley.lit',
                                   {matchBare: true});
        equals(hand.isMatch(elem), true, "Bare JID should match");
    });
    
    module("Misc");

    test("Quoting strings", function () {
        var input = '"beep \\40"';
        var conn = new Strophe.Connection();
        var output = conn._quote(input);
        equals(output, "\"\\\"beep \\\\40\\\"\"",
               "string should be quoted and escaped");
    });
});
