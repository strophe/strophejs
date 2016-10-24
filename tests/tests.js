define([
	'jquery',
	'sinon',
	'sinon-qunit',
	'strophe'
	], function($, sinon, sinon_qunit, wrapper) {

	var run = function () {
        var $build = wrapper.$build;
        var $iq  = wrapper.$iq;
        var $msg = wrapper.$msg;
        var $pres = wrapper.$pres;
        var Strophe = wrapper.Strophe;

        module("Utility Methods");

        test("validTag", function () {
            /* Utility method to determine whether a tag is allowed
             * in the XHTML_IM namespace.
             *
             * Used in the createHtml function to filter incoming html into the allowed XHTML-IM subset.
             * See http://xmpp.org/extensions/xep-0071.html#profile-summary for the list of recommended
             */
            // Tags must always be lower case (as per XHMTL)
            equal(Strophe.XHTML.validTag('BODY'), false);
            equal(Strophe.XHTML.validTag('A'), false);
            equal(Strophe.XHTML.validTag('Img'), false);
            equal(Strophe.XHTML.validTag('IMg'), false);

            // Check all tags mentioned in XEP-0071
            equal(Strophe.XHTML.validTag('a'), true);
            equal(Strophe.XHTML.validTag('blockquote'), true);
            equal(Strophe.XHTML.validTag('body'), true);
            equal(Strophe.XHTML.validTag('br'), true);
            equal(Strophe.XHTML.validTag('cite'), true);
            equal(Strophe.XHTML.validTag('em'), true);
            equal(Strophe.XHTML.validTag('img'), true);
            equal(Strophe.XHTML.validTag('li'), true);
            equal(Strophe.XHTML.validTag('ol'), true);
            equal(Strophe.XHTML.validTag('p'), true);
            equal(Strophe.XHTML.validTag('span'), true);
            equal(Strophe.XHTML.validTag('strong'), true);
            equal(Strophe.XHTML.validTag('ul'), true);

            // Check tags not mentioned in XEP-0071
            equal(Strophe.XHTML.validTag('script'), false);
            equal(Strophe.XHTML.validTag('blink'), false);
            equal(Strophe.XHTML.validTag('article'), false);
        });

        test("_getRequestStatus", function () {
            var conn = new Strophe.Connection("http://example.org");
			var req = new Strophe.Request('', function(){});
            req.xhr = {
                'status': 200,
                'readyState': 4
            };
            equal(conn._proto._getRequestStatus(req), 200, "Returns the status");
            req.xhr = {
                'status': 500,
                'readyState': 4
            };
            equal(conn._proto._getRequestStatus(req), 500,
                    "Returns the default if the request is not finished yet");

            req.xhr = {
                'status': 200,
                'readyState': 3
            };
            equal(conn._proto._getRequestStatus(req), 0,
                    "Returns the default if the request is not finished yet");

            req.xhr = {
                'readyState': 4
            };
            equal(conn._proto._getRequestStatus(req, -1), -1,
                    "Returns the default if the request doesn't have a status");

            equal(conn._proto._getRequestStatus(req, 0), 0,
                    "Returns the default if the request doesn't have a status");
        });

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

        test("The root() method", function () {
            var builder = new Strophe.Builder('root');
            var el = builder.c('child').c('grandchild').c('greatgrandchild').root();
            equal(el.node.nodeName, 'root', 'root() jump back to the root of the tree');
        });

		test("Correct namespace (#32)", function () {
			var stanzas = [new Strophe.Builder("message", {foo: "asdf"}).tree(),
						$build("iq", {}).tree(),
						$pres().tree()];
			$.each(stanzas, function () {
				equal($(this).attr('xmlns'), Strophe.NS.CLIENT,
					"Namespace should be '" + Strophe.NS.CLIENT + "'");
			});
		});

        test("Strophe.Connection.prototype.send() accepts Builders (#27)", function () {
            var stanza = $pres();
            var conn = new Strophe.Connection("");
            var sendStub = sinon.stub(XMLHttpRequest.prototype, "send");
            var timeoutStub = sinon.stub(window, "setTimeout", function (func) {
                // Stub setTimeout to immediately call functions, otherwise our
                // assertions fail due to async execution.
                func.apply(arguments);
            });
            conn.send(stanza);
            equal(sendStub.called, true, "XMLHttpRequest.send was called");
            sendStub.restore();
            timeoutStub.restore();
        });

        module("Strophe.Connection options");

        test("withCredentials can be set on the XMLHttpRequest object", function () {
            var stanza = $pres();
            // Stub XMLHttpRequest.protototype.send so that it doesn't
            // actually try to send out the request.
            var sendStub = sinon.stub(XMLHttpRequest.prototype, "send");
            // Stub setTimeout to immediately call functions, otherwise our
            // assertions fail due to async execution.
            var timeoutStub = sinon.stub(window, "setTimeout", function (func) {
                func.apply(arguments);
            });

            var conn = new Strophe.Connection("example.org");
            conn.send(stanza);
            equal(sendStub.called, true);
            equal(sendStub.getCalls()[0].thisValue.withCredentials, false);

            conn = new Strophe.Connection(
                    "example.org",
                    { "withCredentials": true });
            conn.send(stanza);
            equal(sendStub.called, true);
            equal(sendStub.getCalls()[1].thisValue.withCredentials, true);
            sendStub.restore();
            timeoutStub.restore();
        });

        test("content type can be set on the XMLHttpRequest object", function () {
            var stanza = $pres();
            // Stub XMLHttpRequest.protototype.send so that it doesn't
            // actually try to send out the request.
            var sendStub = sinon.stub(XMLHttpRequest.prototype, "send");
            // Stub setTimeout to immediately call functions, otherwise our
            // assertions fail due to async execution.
            var timeoutStub = sinon.stub(window, "setTimeout", function (func) {
                func.apply(arguments);
            });
            var setRetRequestHeaderStub = sinon.stub(XMLHttpRequest.prototype, "setRequestHeader");
            var conn = new Strophe.Connection("example.org");
            conn.send(stanza);
            equal(setRetRequestHeaderStub.getCalls()[0].args[0], "Content-Type");
            equal(setRetRequestHeaderStub.getCalls()[0].args[1], "text/xml; charset=utf-8");

            conn = new Strophe.Connection(
                    "example.org",
                    { contentType: "text/plain; charset=utf-8" });
            conn.send(stanza);
            equal(setRetRequestHeaderStub.getCalls()[1].args[0], "Content-Type");
            equal(setRetRequestHeaderStub.getCalls()[1].args[1], "text/plain; charset=utf-8");
            sendStub.restore();
            timeoutStub.restore();
            setRetRequestHeaderStub.restore();
        });

        test("Cookies can be added to the document passing them as options to Strophe.Connection", function () {
            var stanza = $pres();
            var conn = new Strophe.Connection(
                    "localhost",
                    {   "cookies": {
                            "_xxx": {
                                "value": "1234",
                                "path": "/",
                            }
                        }
                    });
            notEqual(document.cookie.indexOf('_xxx'), -1);
            var start = document.cookie.indexOf('_xxx');
            var end = document.cookie.indexOf(";", start);
            end = end == -1 ? document.cookie.length : end;
            equal(document.cookie.substring(start, end), '_xxx=1234');

            // Also test when passing only a string
            conn = new Strophe.Connection(
                    "localhost",
                    {   "cookies": { "_yyy": "4321" },
                        "withCredentials": true
                    });
            notEqual(document.cookie.indexOf('_yyy'), -1);
            start = document.cookie.indexOf('_yyy');
            end = document.cookie.indexOf(";", start);
            end = end == -1 ? document.cookie.length : end;
            equal(document.cookie.substring(start, end), '_yyy=4321');

            // Stub XMLHttpRequest.protototype.send so that it doesn't
            // actually try to send out the request.
            var sendStub = sinon.stub(XMLHttpRequest.prototype, "send");
            // Stub setTimeout to immediately call functions, otherwise our
            // assertions fail due to async execution.
            var timeoutStub = sinon.stub(window, "setTimeout", function (func) {
                func.apply(arguments);
            });
            conn.send(stanza);
            // Unfortunately there's no way to test the headers set in the
            // request (only in the response). They can however be checked with
            // the browser's developer tools.
            equal(sendStub.called, true);
            sendStub.restore();
            timeoutStub.restore();

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
			var expected = "<presence from='darcy@pemberley.lit' to='books@chat.pemberley.lit' xmlns='jabber:client'>"+
                                "<nick xmlns='http://jabber.org/protocol/nick'>Darcy</nick>"+
                           "</presence>";
			equal(pres.toString(), expected, "'Darcy' should be a child of <presence>");
		});

		test("c() return the child element if it is a text node.", function () {
            // See this issue: https://github.com/strophe/strophejs/issues/124

			var pres = $pres({from: "darcy@pemberley.lit", to: "books@chat.pemberley.lit"})
				.c("show", {}, "dnd")
                .c("status", {}, "In a meeting");
			var expected = "<presence from='darcy@pemberley.lit' to='books@chat.pemberley.lit' xmlns='jabber:client'>"+
                                "<show>dnd</show><status>In a meeting</status>"+
                           "</presence>";
			equal(pres.toString(), expected, "");

			pres = $pres({from: "darcy@pemberley.lit", to: "books@chat.pemberley.lit"})
				.c("show", {}, "")
                .c("status", {}, "");
			expected = "<presence from='darcy@pemberley.lit' to='books@chat.pemberley.lit' xmlns='jabber:client'>"+
                                "<show/><status/>"+
                           "</presence>";
			equal(pres.toString(), expected, "");
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
			equal(Strophe.serialize(element5), "<foo attr='&lt;a&gt; &quot;b&quot;'>bar</foo>", "should be serialized");
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

        test("HTTP errors", function () {
            var spy500 = sinon.spy();
            var spy401 = sinon.spy();
            var conn = new Strophe.Connection("http://fake");
            conn.addProtocolErrorHandler('HTTP', 500, spy500);
            conn.addProtocolErrorHandler('HTTP', 401, spy401);
			var req = new Strophe.Request('', function(){});
            req.xhr = {
                'status': 200,
                'readyState': 4
            };
            conn._proto._onRequestStateChange(function () {}, req);
            equal(spy500.called, false, "Error handler does not get called when no HTTP error");
            equal(spy401.called, false, "Error handler does not get called when no HTTP error");

            req.xhr = {
                'status': 401,
                'readyState': 4
            };
            conn._proto._onRequestStateChange(function () {}, req);
            equal(spy500.called, false, "Error handler does not get called when no HTTP 500 error");
            equal(spy401.called, true, "Error handler does get called when HTTP 401 error");

            req.xhr = {
                'status': 500,
                'readyState': 4
            };
            conn._proto._onRequestStateChange(function () {}, req);
            equal(spy500.called, true, "Error handler gets called on HTTP 500 error");
        });

		test("Full JID matching", function () {
			var elem = $msg({from: 'darcy@pemberley.lit/library'}).tree();

			var hand = new Strophe.Handler(null, null, null, null, null,
										'darcy@pemberley.lit/library');
			equal(hand.isMatch(elem), true, "Full JID should match");

			hand = new Strophe.Handler(null, null, null, null, null,
										'darcy@pemberley.lit');
			equal(hand.isMatch(elem), false, "Bare JID shouldn't match");
		});

		test("Bare JID matching", function () {
			var elem = $msg({from: 'darcy@pemberley.lit/library'}).tree();

			var hand = new Strophe.Handler(null, null, null, null, null,
										'darcy@pemberley.lit/library',
										{matchBareFromJid: true});
			equal(hand.isMatch(elem), true, "Full JID should match");

			hand = new Strophe.Handler(null, null, null, null, null,
									'darcy@pemberley.lit',
									{matchBareFromJid: true});
			equal(hand.isMatch(elem), true, "Bare JID should match");
		});

        test("Namespace matching", function () {
			var elemNoFrag = $msg({xmlns: 'http://jabber.org/protocol/muc'}).tree();
			var elemWithFrag = $msg({xmlns: 'http://jabber.org/protocol/muc#user'}).tree();
            var hand = new Strophe.Handler(
                null, 'http://jabber.org/protocol/muc',
                null, null, null, null
            );
            equal(hand.isMatch(elemNoFrag), true, "The handler should match on stanza namespace");
            equal(hand.isMatch(elemWithFrag), false, "The handler should not match on stanza namespace with fragment");

            hand = new Strophe.Handler(
                null, 'http://jabber.org/protocol/muc',
                null, null, null, null,
                {'ignoreNamespaceFragment': true}
            );
            equal(hand.isMatch(elemNoFrag), true, "The handler should match on stanza namespace");
            equal(hand.isMatch(elemWithFrag), true, "The handler should match on stanza namespace, even with fragment");
        });

		test("Stanza name matching", function () {
			var elem = $iq().tree();
			var hand = new Strophe.Handler(null, null, 'iq');
			equal(hand.isMatch(elem), true, "The handler should match on stanza name");

			hand = new Strophe.Handler(null, null, 'message');
			notEqual(hand.isMatch(elem), true, "The handler should not match wrong stanza name");
		});

		test("Stanza type matching", function () {
			var elem = $iq({type: 'error'}).tree();
			var hand = new Strophe.Handler(null, null, 'iq', 'error');
			equal(hand.isMatch(elem), true, "The handler should match on stanza type");

			hand = new Strophe.Handler(null, null, 'iq', 'result');
			notEqual(hand.isMatch(elem), true, "The handler should not match wrong stanza type");

			hand = new Strophe.Handler(null, null, 'iq', ['error', 'result']);
			equal(hand.isMatch(elem), true, "The handler should match if stanza type is in array of types");
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

		test("Connfail for invalid XML", function () {
			var req = new Strophe.Request('', function(){});
			req.xhr = {
				responseText: 'text'
			};

			var conn = new Strophe.Connection("http://fake");
			conn.connect_callback = function(status, condition) {
				if(status === Strophe.Status.CONNFAIL) {
					equal(condition, "bad-format", "connection should fail with condition bad-format");
				}
			};

			conn._connect_cb(req);
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

        test("Default mechanisms will be registered if none are provided", function () {
            var conn = new Strophe.Connection('localhost');
            equal(Object.keys(conn.mechanisms).length, 6, 'Six by default registered SASL mechanisms');
            equal('ANONYMOUS' in conn.mechanisms, true, 'ANONYMOUS is registered');
            equal('DIGEST-MD5' in conn.mechanisms, true, 'DIGEST-MD is registered');
            equal('EXTERNAL' in conn.mechanisms, true, 'EXTERNAL is registered');
            equal('OAUTHBEARER' in conn.mechanisms, true, 'OAUTHBEARER is registered');
            equal('PLAIN' in conn.mechanisms, true, 'PLAIN is registered');
            equal('SCRAM-SHA-1' in conn.mechanisms, true, 'SCRAM-SHA-1 is registered');
        });

        test("Custom mechanisms be specified when instantiating Strophe.Connection", function () {
            var SASLFoo = function() {};
            SASLFoo.prototype = new Strophe.SASLMechanism("FOO", false, 10);
            var conn = new Strophe.Connection('localhost', {'mechanisms': [SASLFoo]});
            equal(Object.keys(conn.mechanisms).length, 1, 'Only one registered SASL mechanism');
            equal('FOO' in conn.mechanisms, true, 'FOO is registered');
            notEqual('PLAIN' in conn.mechanisms, true, 'PLAIN is not registered');

            conn = new Strophe.Connection('localhost',
                { 'mechanisms': [
                        SASLFoo,
                        Strophe.SASLPlain
                ]});
            equal(Object.keys(conn.mechanisms).length, 2, 'Only two registered SASL mechanisms');
            equal('FOO' in conn.mechanisms, true, 'FOO is registered');
            equal('PLAIN' in conn.mechanisms, true, 'PLAIN is registered');
        });

        test("The supported mechanism with the highest priority will be used", function () {
            Strophe.SASLExternal.prototype.priority = 10;
            Strophe.SASLSHA1.prototype.priority = 20;
            conn = new Strophe.Connection('localhost',
                { 'mechanisms': [
                        Strophe.SASLSHA1,
                        Strophe.SASLExternal
                ]});
            var authSpy = sinon.spy(conn, '_attemptSASLAuth');
			equal(authSpy.called, false);
            conn.connect('dummy@localhost', 'secret');
            conn.authenticate([Strophe.SASLSHA1, Strophe.SASLExternal]);
			equal(authSpy.called, true);
			equal(authSpy.returnValues.length, 1);
			equal(authSpy.returnValues[0], true);
            equal(conn._sasl_mechanism.name, 'SCRAM-SHA-1');

            Strophe.SASLExternal.prototype.priority = 30;
            Strophe.SASLSHA1.prototype.priority = 20;
            conn.connect('dummy@localhost', 'secret');
            conn.authenticate([Strophe.SASLSHA1, Strophe.SASLExternal]);
            equal(conn._sasl_mechanism.name, 'EXTERNAL');
        });

		test("SASL PLAIN Auth", function () {
			var conn = {pass: "password", authcid: "user", authzid: "user@xmpp.org"};
			var saslplain = new Strophe.SASLPlain();
			saslplain.onStart(conn);
			ok(saslplain.test(conn), "PLAIN is enabled by default.");
			var response = saslplain.onChallenge(conn, null);
			equal(response, [conn.authzid, conn.authcid, conn.pass].join("\u0000"),
				"checking plain auth challenge");
			saslplain.onSuccess();
		});

        test("SASL SCRAM-SHA-1 Auth", function () {
            /* This is a simple example of a SCRAM-SHA-1 authentication exchange
             * when the client doesn't support channel bindings (username 'user' and
             * password 'pencil' are used):
             *
             * C: n,,n=user,r=fyko+d2lbbFgONRv9qkxdawL
             * S: r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,s=QSXCR+Q6sek8bf92,
             * i=4096
             * C: c=biws,r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,
             * p=v0X8v3Bz2T0CJGbJQyF0X+HI4Ts=
             * S: v=rmF9pqV8S7suAoZWja4dJRkFsKQ=
             *
             */
            var conn = {pass: "pencil", authcid: "user",
                        authzid: "user@xmpp.org", _sasl_data: []};
            var saslsha1 = new Strophe.SASLSHA1();
            saslsha1.onStart(conn);
            ok(saslsha1.test(conn), "SHA-1 is enabled by default.");
            // test taken from example section on:
            // URL: http://tools.ietf.org/html/rfc5802#section-5
            var response = saslsha1.onChallenge(conn, null, "fyko+d2lbbFgONRv9qkxdawL");
            equal(response, "n,,n=user,r=fyko+d2lbbFgONRv9qkxdawL", "checking first auth challenge");

            response = saslsha1.onChallenge(conn, "r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,s=QSXCR+Q6sek8bf92,i=4096");
            equal(response, "c=biws,r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,p=v0X8v3Bz2T0CJGbJQyF0X+HI4Ts=",
                "checking second auth challenge");
            saslsha1.onSuccess();
        });

		test("SASL DIGEST-MD-5 Auth", function () {
			var conn = {pass: "secret", authcid: "chris",
						authzid: "user@xmpp.org", servtype: "imap",
						domain: "elwood.innosoft.com",
						_sasl_data: []};

			var saslmd5 = new Strophe.SASLMD5();
			saslmd5.onStart(conn);
			ok(saslmd5.test(conn), "DIGEST MD-5 is enabled by default.");
			// test taken from example section on:
			// URL: http://www.ietf.org/rfc/rfc2831.txt
			var response = saslmd5.onChallenge(conn, "realm=\"elwood.innosoft.com\",nonce=\"OA6MG9tEQGm2hh\",qop=\"auth\",algorithm=md5-sess,charset=utf-8", "OA6MHXh6VqTrRk");
			equal(response, "charset=utf-8,username=\"chris\",realm=\"elwood.innosoft.com\",nonce=\"OA6MG9tEQGm2hh\",nc=00000001,cnonce=\"OA6MHXh6VqTrRk\",digest-uri=\"imap/elwood.innosoft.com\",response=d388dad90d4bbd760a152321f2143af7,qop=auth",
				"checking first auth challenge");
			response = saslmd5.onChallenge(conn, "rspauth=ea40f60335c427b5527b84dbabcdfffd");
			equal(response, "", "checking second auth challenge");
			saslmd5.onSuccess();
		});

		test("SASL EXTERNAL Auth", function () {
			var conn = {pass: "password", authcid: "user", authzid: "user@xmpp.org"};
			var sasl_external = new Strophe.SASLExternal();
			ok(sasl_external.test(conn), "EXTERNAL is enabled by default.");
			sasl_external.onStart(conn);

			var response = sasl_external.onChallenge(conn, null);
			equal(response, conn.authzid,
                 "Response to EXTERNAL auth challenge should be authzid if different authcid was passed in.");
			sasl_external.onSuccess();

			conn = {pass: "password", authcid: "user", authzid: "user@xmpp.org"};
			sasl_external = new Strophe.SASLExternal();
			ok(sasl_external.test(conn), "EXTERNAL is enabled by default.");
			sasl_external.onStart(conn);
			response = sasl_external.onChallenge(conn, null);
			equal(response, conn.authzid,
                 "Response to EXTERNAL auth challenge should be empty string if authcid = authzid");
			sasl_external.onSuccess();
		});

		module("BOSH Session resumption");

		test("When passing in {keepalive: true} to Strophe.Connection, then the session tokens get cached automatically", function () {
			var conn = new Strophe.Connection("", {"keepalive": true});
            conn.jid = 'dummy@localhost';
            conn._proto.sid = "5332346";
            var cacheSpy = sinon.spy(conn._proto, '_cacheSession');
			equal(cacheSpy.called, false);
            conn._proto._buildBody();
			equal(cacheSpy.called, true);
            equal(window.sessionStorage.getItem('strophe-bosh-session'), null);
            conn.authenticated = true;
            conn._proto._buildBody();
            ok(window.sessionStorage.getItem('strophe-bosh-session'));
			equal(cacheSpy.called, true);
            conn.authenticated = false;
            conn._proto._buildBody();
            equal(window.sessionStorage.getItem('strophe-bosh-session'), null);
			equal(cacheSpy.called, true);
        });

        test('the request ID (RID) has the proper value whenever a session is restored', function () {
            window.sessionStorage.removeItem('strophe-bosh-session');
			var conn = new Strophe.Connection("", {"keepalive": true});
            conn.authenticated = true;
            conn.jid = 'dummy@localhost';
            conn._proto.rid = '123456';
            conn._proto.sid = '987654321';
            conn._proto._cacheSession();
            delete conn._proto.rid;
            conn.restore();
            var body = conn._proto._buildBody();
            equal(body.tree().getAttribute('rid'), '123456');
            body = conn._proto._buildBody();
            equal(body.tree().getAttribute('rid'), '123457');
            body = conn._proto._buildBody();
            equal(body.tree().getAttribute('rid'), '123458');
            delete conn._proto.rid;
            conn.restore();
            body = conn._proto._buildBody();
            equal(body.tree().getAttribute('rid'), '123459');
        });

		test("restore can only be called with BOSH and when {keepalive: true} is passed to Strophe.Connection", function () {
			var conn = new Strophe.Connection("");
			var boshSpy = sinon.spy(conn._proto, "_restore");
			var checkSpy = sinon.spy(conn, "_sessionCachingSupported");
            equal(conn.restored, false);
			try {
				conn.restore();
			} catch (e) {
				equal(e.name, "StropheSessionError",
                        "conn.restore() should throw an exception when keepalive is false.");
				equal(e.message, "_restore: no restoreable session.",
                        "conn.restore() should throw an exception when keepalive is false");
			}
            equal(boshSpy.called, true);
            equal(checkSpy.called, true);

			conn = new Strophe.Connection("ws:localhost");
			try {
				conn.restore();
			} catch (e) {
				equal(e.name, "StropheSessionError",
                        "conn.restore() should throw an exception when keepalive is false.");
				equal(e.message, 'The "restore" method can only be used with a BOSH connection.',
				    'The conn.restore method can only be used with a BOSH connection.');
			}
            equal(conn.restored, false);
		});

        test('the _cacheSession method caches the BOSH session tokens', function () {
            window.sessionStorage.removeItem('strophe-bosh-session');
			var conn = new Strophe.Connection("http://fake", {"keepalive": true});
            // Nothing gets cached if there aren't tokens to cache
            conn._proto._cacheSession();
            equal(window.sessionStorage.getItem('strophe-bosh-session'), null);
            // Let's create some tokens to cache
            conn.authenticated = true;
            conn.jid = 'dummy@localhost';
            conn._proto.rid = '123456';
            conn._proto.sid = '987654321';
            equal(window.sessionStorage.getItem('strophe-bosh-session'), null);
            conn._proto._cacheSession();
            notEqual(window.sessionStorage.getItem('strophe-bosh-session'), null);
        });

        test('when calling "restore" without a restorable session, an exception is raised', function () {
            window.sessionStorage.removeItem('strophe-bosh-session');
			var conn = new Strophe.Connection("", {"keepalive": true});
			var boshSpy = sinon.spy(conn._proto, "_restore");
			var checkSpy = sinon.spy(conn, "_sessionCachingSupported");
            equal(conn.restored, false);
			try {
				conn.restore();
			} catch (e) {
				equal(e.name, "StropheSessionError");
				equal(e.message, "_restore: no restoreable session.");
            }
            equal(conn.restored, false);
            equal(boshSpy.called, true);
            equal(checkSpy.called, true);
        });

        test('"restore" takes an optional JID argument for more precise session verification', function () {
            window.sessionStorage.removeItem('strophe-bosh-session');
			var conn = new Strophe.Connection("", {"keepalive": true});
			var boshSpy = sinon.spy(conn._proto, "_restore");
			var checkSpy = sinon.spy(conn, "_sessionCachingSupported");
            // Let's create some tokens to cache
            conn.authenticated = true;
            conn.jid = 'dummy@localhost';
            conn._proto.rid = '1234567';
            conn._proto.sid = '9876543210';
            conn._proto._cacheSession();

            // Check that giving a different jid causes an exception to be
            // raised.
			try {
				conn.restore('differentdummy@localhost');
			} catch (e) {
				equal(e.name, "StropheSessionError");
				equal(e.message, "_restore: no restoreable session.");
            }
            equal(conn.restored, false);
            equal(boshSpy.called, true);
            equal(checkSpy.called, true);

            // Check that passing in the right jid but with a resource is not a problem.
            conn.restore('dummy@localhost/with_resource');
            equal(conn.jid,'dummy@localhost');
            equal(conn._proto.rid,'1234567');
            equal(conn._proto.sid,'9876543210');
            equal(conn.restored, true);
        });

        test('when calling "restore" with a restorable session, bosh._attach is called with the session tokens', function () {
            window.sessionStorage.removeItem('strophe-bosh-session');
			var conn = new Strophe.Connection("", {"keepalive": true});
            conn.authenticated = true;
            conn.jid = 'dummy@localhost';
            conn._proto.rid = '123456';
            conn._proto.sid = '987654321';
            conn._proto._cacheSession();
            delete conn._proto.rid;
            delete conn._proto.sid;
            delete conn._proto.jid;
            equal(conn.restored, false);

			var boshSpy = sinon.spy(conn._proto, "_restore");
			var checkSpy = sinon.spy(conn, "_sessionCachingSupported");
            var attachSpsy = sinon.spy(conn._proto, "_attach");
            conn.restore();
            equal(conn.jid,'dummy@localhost');
            equal(conn._proto.rid,'123456');
            equal(conn._proto.sid,'987654321');
            equal(conn.restored, true);
            equal(boshSpy.called, true);
            equal(checkSpy.called, true);
            equal(attachSpsy.called, true);
        });

         module("BOSH next valid request id");

         test("nextValidRid is called after successful request", function () {
            Strophe.Connection.prototype._onIdle = function () {};
            var conn = new Strophe.Connection("http://fake");
            var spy = sinon.spy(conn, 'nextValidRid');
            var req = {id: 43,
                  sends: 1,
                  xhr: {
                     readyState: 4,
                     status: 200
                  },
                  rid: 42
            };
            conn._requests = [req];
            conn._proto._onRequestStateChange(function(){}, req);
            equal(spy.calledOnce, true, "nextValidRid was called only once");
            equal(spy.calledWith(43), true, "The RID was valid");
         });

         test("nextValidRid is not called after failed request", function () {
            Strophe.Connection.prototype._onIdle = function () {};
            var conn = new Strophe.Connection("http://fake");
            var spy = sinon.spy(conn, 'nextValidRid');
            var req = {id: 43,
                  sends: 1,
                  xhr: {
                     readyState: 4,
                     status: 0
                  },
                  rid: 42
            };
            conn._requests = [req];
            conn._proto._onRequestStateChange(function(){}, req);
            equal(spy.called, false, "nextValidRid was not called");
         });

         test("nextValidRid is called after failed request with disconnection", function () {
            sinon.stub(Math, "random", function(){
               return 1;
            });
            Strophe.Connection.prototype._onIdle = function () {};
            var conn = new Strophe.Connection("http://fake");
            var spy = sinon.spy(conn, 'nextValidRid');
            var req = {id: 43,
                  sends: 1,
                  xhr: {
                     readyState: 4,
                     status: 404
                  },
                  rid: 42
            };
            conn._requests = [req];
            conn._proto._onRequestStateChange(function(){}, req);
            equal(spy.calledOnce, true, "nextValidRid was called only once");
            equal(spy.calledWith(4294967295), true, "The RID was valid");
            Math.random.restore();
         });

         test("nextValidRid is called after connection reset", function () {
            sinon.stub(Math, "random", function(){
               return 1;
            });
            Strophe.Connection.prototype._onIdle = function () {};
            var conn = new Strophe.Connection("http://fake");
            var spy = sinon.spy(conn, 'nextValidRid');
            conn.reset();
            equal(spy.calledOnce, true, "nextValidRid was called only once");
            equal(spy.calledWith(4294967295), true, "The RID was valid");
            Math.random.restore();
         });
   };
	return {run: run};
});
