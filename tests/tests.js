$(document).ready(function () {
    module("JIDs");

    test("Normal JID", function () {
        var jid = "darcy@pemberley.lit/library";
        equal(Strophe.getNodeFromJid(jid), "darcy",
               "Node should be 'darcy'");
        equal(Strophe.getDomainFromJid(jid), "pemberley.lit",
               "Domain should be 'pemberley.lit'");
        equal(Strophe.getResourceFromJid(jid), "library",
               "Node should be 'library'");
        equal(Strophe.getBareJidFromJid(jid),
               "darcy@pemberley.lit",
               "Bare JID should be 'darcy@pemberley.lit'");
    });

    test("Weird node (unescaped)", function () {
        var jid = "darcy@netherfield.lit@pemberley.lit/library";
        equal(Strophe.getNodeFromJid(jid), "darcy",
               "Node should be 'darcy'");
        equal(Strophe.getDomainFromJid(jid),
               "netherfield.lit@pemberley.lit",
               "Domain should be 'netherfield.lit@pemberley.lit'");
        equal(Strophe.getResourceFromJid(jid), "library",
               "Resource should be 'library'");
        equal(Strophe.getBareJidFromJid(jid),
               "darcy@netherfield.lit@pemberley.lit",
               "Bare JID should be 'darcy@netherfield.lit@pemberley.lit'");
    });

    test("Weird node (escaped)", function () {
        var escapedNode = Strophe.escapeNode("darcy@netherfield.lit");
        var jid = escapedNode + "@pemberley.lit/library";
        equal(Strophe.getNodeFromJid(jid), "darcy\\40netherfield.lit",
               "Node should be 'darcy\\40netherfield.lit'");
        equal(Strophe.getDomainFromJid(jid),
               "pemberley.lit",
               "Domain should be 'pemberley.lit'");
        equal(Strophe.getResourceFromJid(jid), "library",
               "Resource should be 'library'");
        equal(Strophe.getBareJidFromJid(jid),
               "darcy\\40netherfield.lit@pemberley.lit",
               "Bare JID should be 'darcy\\40netherfield.lit@pemberley.lit'");
    });

    test("Weird resource", function () {
        var jid = "books@chat.pemberley.lit/darcy@pemberley.lit/library";
        equal(Strophe.getNodeFromJid(jid), "books",
               "Node should be 'books'");
        equal(Strophe.getDomainFromJid(jid), "chat.pemberley.lit",
               "Domain should be 'chat.pemberley.lit'");
        equal(Strophe.getResourceFromJid(jid),
               "darcy@pemberley.lit/library",
               "Resource should be 'darcy@pemberley.lit/library'");
        equal(Strophe.getBareJidFromJid(jid),
               "books@chat.pemberley.lit",
               "Bare JID should be 'books@chat.pemberley.lit'");
    });

    module("Builder");

    test("Correct namespace (#32)", function () {
        var stanzas = [new Strophe.Builder("message", {foo: "asdf"}).tree(),
                       $build("iq", {}).tree(),
                       $pres().tree()];
        $.each(stanzas, function () {
            equal($(this).attr('xmlns'), Strophe.NS.CLIENT,
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
            equal(e.name, "StropheError", "send() should throw exception");
        }
    });

    test("Builder with XML attribute escaping test", function () {
        var text = "<b>";
        var expected = "<presence to='&lt;b&gt;' xmlns='jabber:client'/>";
        var pres = $pres({to: text});
        equal(pres.toString(), expected, "< should be escaped");

        text = "foo&bar";
        expected = "<presence to='foo&amp;bar' xmlns='jabber:client'/>";
        pres = $pres({to: text});
        equal(pres.toString(), expected, "& should be escaped");
    });

    test("c() accepts text and passes it to xmlElement", function () {
        var pres = $pres({from: "darcy@pemberley.lit", to: "books@chat.pemberley.lit"})
            .c("nick", {xmlns: "http://jabber.org/protocol/nick"}, "Darcy");
        var expected = "<presence from='darcy@pemberley.lit' to='books@chat.pemberley.lit' xmlns='jabber:client'><nick xmlns='http://jabber.org/protocol/nick'>Darcy</nick></presence>";
        equal(pres.toString(), expected, "'Darcy' should be a child of <presence>");
    });

    module("XML");

    test("XML escaping test", function () {
        var text = "s & p";
        var textNode = Strophe.xmlTextNode(text);
        equal(Strophe.getText(textNode), "s &amp; p", "should be escaped");
        var text0 = "s < & > p";
        var textNode0 = Strophe.xmlTextNode(text0);
        equal(Strophe.getText(textNode0), "s &lt; &amp; &gt; p", "should be escaped");
        var text1 = "s's or \"p\"";
        var textNode1 = Strophe.xmlTextNode(text1);
        equal(Strophe.getText(textNode1), "s&apos;s or &quot;p&quot;", "should be escaped");
        var text2 = "<![CDATA[<foo>]]>";
        var textNode2 = Strophe.xmlTextNode(text2);
        equal(Strophe.getText(textNode2), "&lt;![CDATA[&lt;foo&gt;]]&gt;", "should be escaped");
        var text3 = "<![CDATA[]]]]><![CDATA[>]]>";
        var textNode3 = Strophe.xmlTextNode(text3);
        equal(Strophe.getText(textNode3), "&lt;![CDATA[]]]]&gt;&lt;![CDATA[&gt;]]&gt;", "should be escaped");
        var text4 = "&lt;foo&gt;<![CDATA[<foo>]]>";
        var textNode4 = Strophe.xmlTextNode(text4);
        equal(Strophe.getText(textNode4), "&amp;lt;foo&amp;gt;&lt;![CDATA[&lt;foo&gt;]]&gt;", "should be escaped");
    });

    test("XML element creation", function () {
        var elem = Strophe.xmlElement("message");
        equal(elem.tagName, "message", "Element name should be the same");
    });

    test("copyElement() double escape bug", function() {
        var cloned = Strophe.copyElement(Strophe.xmlGenerator()
                                         .createTextNode('<>&lt;&gt;'));
        equal(cloned.nodeValue, '<>&lt;&gt;');
    });
    
    test("XML serializing", function() {
        var parser = new DOMParser();
        // Attributes
        var element1 = parser.parseFromString("<foo attr1='abc' attr2='edf'>bar</foo>","text/xml").documentElement;
        equal(Strophe.serialize(element1), "<foo attr1='abc' attr2='edf'>bar</foo>", "should be serialized");
        var element2 = parser.parseFromString("<foo attr1=\"abc\" attr2=\"edf\">bar</foo>","text/xml").documentElement;
        equal(Strophe.serialize(element2), "<foo attr1='abc' attr2='edf'>bar</foo>", "should be serialized");
        // Escaping values
        var element3 = parser.parseFromString("<foo>a &gt; &apos;b&apos; &amp; &quot;b&quot; &lt; c</foo>","text/xml").documentElement;
        equal(Strophe.serialize(element3), "<foo>a &gt; &apos;b&apos; &amp; &quot;b&quot; &lt; c</foo>", "should be serialized");
        // Escaping attributes
        var element4 = parser.parseFromString("<foo attr='&lt;a> &apos;b&apos;'>bar</foo>","text/xml").documentElement;
        equal(Strophe.serialize(element4), "<foo attr='&lt;a&gt; &apos;b&apos;'>bar</foo>", "should be serialized");
        var element5 = parser.parseFromString("<foo attr=\"&lt;a> &quot;b&quot;\">bar</foo>","text/xml").documentElement;
        equal(Strophe.serialize(element5), "<foo attr='&lt;a&gt; \"b\"'>bar</foo>", "should be serialized");
        // Empty elements
        var element6 = parser.parseFromString("<foo><empty></empty></foo>","text/xml").documentElement;
        equal(Strophe.serialize(element6), "<foo><empty/></foo>", "should be serialized");
        // Children
        var element7 = parser.parseFromString("<foo><bar>a</bar><baz><wibble>b</wibble></baz></foo>","text/xml").documentElement;
        equal(Strophe.serialize(element7), "<foo><bar>a</bar><baz><wibble>b</wibble></baz></foo>", "should be serialized");
        var element8 = parser.parseFromString("<foo><bar>a</bar><baz>b<wibble>c</wibble>d</baz></foo>","text/xml").documentElement;
        equal(Strophe.serialize(element8), "<foo><bar>a</bar><baz>b<wibble>c</wibble>d</baz></foo>", "should be serialized");
        // CDATA
        var element9 = parser.parseFromString("<foo><![CDATA[<foo>]]></foo>","text/xml").documentElement;
        equal(Strophe.serialize(element9), "<foo><![CDATA[<foo>]]></foo>", "should be serialized");
        var element10 = parser.parseFromString("<foo><![CDATA[]]]]><![CDATA[>]]></foo>","text/xml").documentElement;
        equal(Strophe.serialize(element10), "<foo><![CDATA[]]]]><![CDATA[>]]></foo>", "should be serialized");
        var element11 = parser.parseFromString("<foo>&lt;foo&gt;<![CDATA[<foo>]]></foo>","text/xml").documentElement;
        equal(Strophe.serialize(element11), "<foo>&lt;foo&gt;<![CDATA[<foo>]]></foo>", "should be serialized");
    });

    module("Handler");

    test("Full JID matching", function () {
        var elem = $msg({from: 'darcy@pemberley.lit/library'}).tree();
        
        var hand = new Strophe.Handler(null, null, null, null, null,
                                       'darcy@pemberley.lit/library');
        equal(hand.isMatch(elem), true, "Full JID should match");

        hand = new Strophe.Handler(null, null, null, null, null,
                                       'darcy@pemberley.lit')
        equal(hand.isMatch(elem), false, "Bare JID shouldn't match");
    });

    test("Bare JID matching", function () {
        var elem = $msg({from: 'darcy@pemberley.lit/library'}).tree();

        var hand = new Strophe.Handler(null, null, null, null, null,
                                       'darcy@pemberley.lit/library',
                                       {matchBare: true});
        equal(hand.isMatch(elem), true, "Full JID should match");
        
        hand = new Strophe.Handler(null, null, null, null, null,
                                   'darcy@pemberley.lit',
                                   {matchBare: true});
        equal(hand.isMatch(elem), true, "Bare JID should match");
    });
    
    module("Misc");

    test("Quoting strings", function () {
        var input = '"beep \\40"';
        var saslmd5 = new Strophe.SASLMD5();
        var output = saslmd5._quote(input);
        equal(output, "\"\\\"beep \\\\40\\\"\"",
               "string should be quoted and escaped");
    });

    test("Function binding", function () {
        var spy = sinon.spy();
        var obj = {};
        var arg1 = "foo";
        var arg2 = "bar";
        var arg3 = "baz";

        var f = spy.bind(obj, arg1, arg2);
        f(arg3);
        equal(spy.called, true, "bound function should be called");
        equal(spy.calledOn(obj), true,
               "bound function should have correct context");
        equal(spy.alwaysCalledWithExactly(arg1, arg2, arg3),
               true,
               "bound function should get all arguments");
    });

    module("XHR error handling");

    // Note that these tests are pretty dependent on the actual code.

    test("Aborted requests do nothing", function () {
        Strophe.Connection.prototype._onIdle = function () {};
        var conn = new Strophe.Connection("http://fake");

        // simulate a finished but aborted request
        var req = {id: 43,
                   sends: 1,
                   xhr: {
                       readyState: 4
                   },
                   abort: true};

        conn._requests = [req];

        var spy = sinon.spy();

        conn._proto._onRequestStateChange(spy, req);

        equal(req.abort, false, "abort flag should be toggled");
        equal(conn._requests.length, 1, "_requests should be same length");
        equal(spy.called, false, "callback should not be called");
    });

    test("Incomplete requests do nothing", function () {
        Strophe.Connection.prototype._onIdle = function () {};
        var conn = new Strophe.Connection("http://fake");

        // simulate a finished but aborted request
        var req = {id: 44,
                   sends: 1,
                   xhr: {
                       readyState: 3
                   }};

        conn._requests = [req];

        var spy = sinon.spy();

        conn._proto._onRequestStateChange(spy, req);

        equal(conn._requests.length, 1, "_requests should be same length");
        equal(spy.called, false, "callback should not be called");
    });

  module("SASL Mechanisms");

  test("SASL Plain Auth", function () {
    var conn = {pass: "password", authcid: "user", authzid: "user@xmpp.org"};

    ok(Strophe.SASLPlain.test(conn), "plain should pass the test");

    var saslplain = new Strophe.SASLPlain();
    saslplain.onStart(conn);
    var response = saslplain.onChallenge(conn, null);
    equal(response, [conn.authzid, conn.authcid, conn.pass].join("\u0000"),
          "checking plain auth challenge");
    saslplain.onSuccess();
  });

  test("SASL SCRAM-SHA-1 Auth", function () {
    var conn = {pass: "pencil", authcid: "user",
                authzid: "user@xmpp.org", _sasl_data: []};

    ok(Strophe.SASLSHA1.test(conn), "sha-1 should pass the test");

    var saslsha1 = new Strophe.SASLSHA1();
    saslsha1.onStart(conn);
    // test taken from example section on:
    // URL: http://tools.ietf.org/html/rfc5802#section-5
    var response = saslsha1.onChallenge(conn, null, "fyko+d2lbbFgONRv9qkxdawL");
    equal(response, "n,,n=user,r=fyko+d2lbbFgONRv9qkxdawL",
          "checking first auth challenge");
    var response = saslsha1.onChallenge(conn, "r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,s=QSXCR+Q6sek8bf92,i=4096");
    equal(response, "c=biws,r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,p=v0X8v3Bz2T0CJGbJQyF0X+HI4Ts=",
          "checking second auth challenge");
    saslsha1.onSuccess();
  });

  test("SASL DIGEST-MD-5 Auth", function () {
    var conn = {pass: "secret", authcid: "chris",
                authzid: "user@xmpp.org", servtype: "imap",
                domain: "elwood.innosoft.com",
                _sasl_data: []};

    ok(Strophe.SASLMD5.test(conn), "md-5 should pass the test");

    var saslmd5 = new Strophe.SASLMD5();
    saslmd5.onStart(conn);
    // test taken from example section on:
    // URL: http://www.ietf.org/rfc/rfc2831.txt
    var response = saslmd5.onChallenge(conn, "realm=\"elwood.innosoft.com\",nonce=\"OA6MG9tEQGm2hh\",qop=\"auth\",algorithm=md5-sess,charset=utf-8", "OA6MHXh6VqTrRk");
    equal(response, "charset=utf-8,username=\"chris\",realm=\"elwood.innosoft.com\",nonce=\"OA6MG9tEQGm2hh\",nc=00000001,cnonce=\"OA6MHXh6VqTrRk\",digest-uri=\"imap/elwood.innosoft.com\",response=d388dad90d4bbd760a152321f2143af7,qop=auth",
          "checking first auth challenge");
    var response = saslmd5.onChallenge(conn, "rspauth=ea40f60335c427b5527b84dbabcdfffd");
    equal(response, "", "checking second auth challenge");
    saslmd5.onSuccess();
  });
});
