/*global globalThis, Strophe, $iq, $msg, $build, $pres, QUnit, stx */
const serializer = new Strophe.shims.XMLSerializer();

const { test } = QUnit;

QUnit.module('Utility Methods');

test('xvalidTag', (assert) => {
    /**
     * Utility method to determine whether a tag is allowed
     * in the XHTML_IM namespace.
     *
     * Used in the createHtml function to filter incoming HTML
     * into the allowed XHTML-IM subset.
     * See http://xmpp.org/extensions/xep-0071.html#profile-summary
     * for the list of recommended
     */

    // Tags must always be lower case (as per XHMTL)
    assert.equal(Strophe.XHTML.validTag('BODY'), false);
    assert.equal(Strophe.XHTML.validTag('A'), false);
    assert.equal(Strophe.XHTML.validTag('Img'), false);
    assert.equal(Strophe.XHTML.validTag('IMg'), false);

    // Check all tags mentioned in XEP-0071
    assert.equal(Strophe.XHTML.validTag('a'), true);
    assert.equal(Strophe.XHTML.validTag('blockquote'), true);
    assert.equal(Strophe.XHTML.validTag('body'), true);
    assert.equal(Strophe.XHTML.validTag('br'), true);
    assert.equal(Strophe.XHTML.validTag('cite'), true);
    assert.equal(Strophe.XHTML.validTag('em'), true);
    assert.equal(Strophe.XHTML.validTag('img'), true);
    assert.equal(Strophe.XHTML.validTag('li'), true);
    assert.equal(Strophe.XHTML.validTag('ol'), true);
    assert.equal(Strophe.XHTML.validTag('p'), true);
    assert.equal(Strophe.XHTML.validTag('span'), true);
    assert.equal(Strophe.XHTML.validTag('strong'), true);
    assert.equal(Strophe.XHTML.validTag('ul'), true);

    // Check tags not mentioned in XEP-0071
    assert.equal(Strophe.XHTML.validTag('script'), false);
    assert.equal(Strophe.XHTML.validTag('blink'), false);
    assert.equal(Strophe.XHTML.validTag('article'), false);
});

test('_getRequestStatus', (assert) => {
    const req = new Strophe.Request('', function () {});
    req.xhr = new XHR(200, 4);
    assert.equal(Strophe.Bosh._getRequestStatus(req), 200, 'Returns the status');
    req.xhr = new XHR(500, 4);
    assert.equal(Strophe.Bosh._getRequestStatus(req), 500, 'Returns the default if the request is not finished yet');

    req.xhr = new XHR(200, 3);
    assert.equal(Strophe.Bosh._getRequestStatus(req), 0, 'Returns the default if the request is not finished yet');

    req.xhr = new XHR(undefined, 4);
    assert.equal(
        Strophe.Bosh._getRequestStatus(req, -1),
        -1,
        "Returns the default if the request doesn't have a status"
    );

    assert.equal(Strophe.Bosh._getRequestStatus(req, 0), 0, "Returns the default if the request doesn't have a status");
});

QUnit.module('JIDs');

test('Normal JID', (assert) => {
    const jid = 'darcy@pemberley.lit/library';
    assert.equal(Strophe.getNodeFromJid(jid), 'darcy', "Node should be 'darcy'");
    assert.equal(Strophe.getDomainFromJid(jid), 'pemberley.lit', "Domain should be 'pemberley.lit'");
    assert.equal(Strophe.getResourceFromJid(jid), 'library', "Node should be 'library'");
    assert.equal(Strophe.getBareJidFromJid(jid), 'darcy@pemberley.lit', "Bare JID should be 'darcy@pemberley.lit'");
});

test('Weird node (unescaped)', (assert) => {
    const jid = 'darcy@netherfield.lit@pemberley.lit/library';
    assert.equal(Strophe.getNodeFromJid(jid), 'darcy', "Node should be 'darcy'");
    assert.equal(
        Strophe.getDomainFromJid(jid),
        'netherfield.lit@pemberley.lit',
        "Domain should be 'netherfield.lit@pemberley.lit'"
    );
    assert.equal(Strophe.getResourceFromJid(jid), 'library', "Resource should be 'library'");
    assert.equal(
        Strophe.getBareJidFromJid(jid),
        'darcy@netherfield.lit@pemberley.lit',
        "Bare JID should be 'darcy@netherfield.lit@pemberley.lit'"
    );
});

test('Weird node (escaped)', (assert) => {
    const escapedNode = Strophe.escapeNode('darcy@netherfield.lit');
    const jid = escapedNode + '@pemberley.lit/library';
    assert.equal(Strophe.getNodeFromJid(jid), 'darcy\\40netherfield.lit', "Node should be 'darcy\\40netherfield.lit'");
    assert.equal(Strophe.getDomainFromJid(jid), 'pemberley.lit', "Domain should be 'pemberley.lit'");
    assert.equal(Strophe.getResourceFromJid(jid), 'library', "Resource should be 'library'");
    assert.equal(
        Strophe.getBareJidFromJid(jid),
        'darcy\\40netherfield.lit@pemberley.lit',
        "Bare JID should be 'darcy\\40netherfield.lit@pemberley.lit'"
    );
});

test('Weird resource', (assert) => {
    const jid = 'books@chat.pemberley.lit/darcy@pemberley.lit/library';
    assert.equal(Strophe.getNodeFromJid(jid), 'books', "Node should be 'books'");
    assert.equal(Strophe.getDomainFromJid(jid), 'chat.pemberley.lit', "Domain should be 'chat.pemberley.lit'");
    assert.equal(
        Strophe.getResourceFromJid(jid),
        'darcy@pemberley.lit/library',
        "Resource should be 'darcy@pemberley.lit/library'"
    );
    assert.equal(
        Strophe.getBareJidFromJid(jid),
        'books@chat.pemberley.lit',
        "Bare JID should be 'books@chat.pemberley.lit'"
    );
});

QUnit.module('Builder');

test('The root() method', (assert) => {
    const builder = new Strophe.Builder('root');
    const el = builder.c('child').c('grandchild').c('greatgrandchild').root();
    assert.equal(el.node.nodeName, 'root', 'root() jump back to the root of the tree');
});

test('Correct namespace (#32)', (assert) => {
    const stanzas = [new Strophe.Builder('message', { foo: 'asdf' }).tree(), $build('iq', {}).tree(), $pres().tree()];

    stanzas.forEach((s) =>
        assert.equal(s.getAttribute('xmlns'), Strophe.NS.CLIENT, `Namespace should be '${Strophe.NS.CLIENT}'`)
    );
});

test('Strophe.Connection.prototype.send() accepts Builders (#27)', (assert) => {
    const stanza = $pres();
    const conn = new Strophe.Connection('');
    const sendStub = sinon.stub(XMLHttpRequest.prototype, 'send');
    const timeoutStub = sinon.stub(globalThis, 'setTimeout').callsFake(function (func) {
        // Stub setTimeout to immediately call functions, otherwise our
        // assertions fail due to async execution.
        func.apply(arguments);
    });
    conn.send(stanza);
    assert.equal(sendStub.called, true, 'XMLHttpRequest.send was called');
    sendStub.restore();
    timeoutStub.restore();
});

test('The fromString static method', (assert) => {
    const stanza = Strophe.Builder.fromString(
        '<presence from="juliet@example.com/chamber" xmlns="jabber:client"></presence>'
    );
    assert.equal(isEqualNode(stanza, $pres({ from: 'juliet@example.com/chamber' })), true);
});

QUnit.module('Strophe.Connection options');

test('withCredentials can be set on the XMLHttpRequest object', (assert) => {
    const stanza = $pres();
    // Stub XMLHttpRequest.protototype.send so that it doesn't
    // actually try to send out the request.
    const sendStub = sinon.stub(XMLHttpRequest.prototype, 'send');
    // Stub setTimeout to immediately call functions, otherwise our
    // assertions fail due to async execution.
    const timeoutStub = sinon.stub(globalThis, 'setTimeout').callsFake(function (func) {
        func.apply(arguments);
    });

    let conn = new Strophe.Connection('example.org');
    conn.send(stanza);
    assert.equal(sendStub.called, true);
    assert.equal(!!sendStub.getCalls()[0].thisValue.withCredentials, false);

    conn = new Strophe.Connection('example.org', { 'withCredentials': true });
    conn.send(stanza);
    assert.equal(sendStub.called, true);
    assert.equal(sendStub.getCalls()[1].thisValue.withCredentials, true);
    sendStub.restore();
    timeoutStub.restore();
});

test('content type can be set on the XMLHttpRequest object', (assert) => {
    const stanza = $pres();
    // Stub XMLHttpRequest.protototype.send so that it doesn't
    // actually try to send out the request.
    const sendStub = sinon.stub(XMLHttpRequest.prototype, 'send');
    // Stub setTimeout to immediately call functions, otherwise our
    // assertions fail due to async execution.
    const timeoutStub = sinon.stub(globalThis, 'setTimeout').callsFake(function (func) {
        func.apply(arguments);
    });
    const setRetRequestHeaderStub = sinon.stub(XMLHttpRequest.prototype, 'setRequestHeader');
    let conn = new Strophe.Connection('example.org');
    conn.send(stanza);
    assert.equal(setRetRequestHeaderStub.getCalls()[0].args[0], 'Content-Type');
    assert.equal(setRetRequestHeaderStub.getCalls()[0].args[1], 'text/xml; charset=utf-8');

    conn = new Strophe.Connection('example.org', { contentType: 'text/plain; charset=utf-8' });
    conn.send(stanza);
    assert.equal(setRetRequestHeaderStub.getCalls()[1].args[0], 'Content-Type');
    assert.equal(setRetRequestHeaderStub.getCalls()[1].args[1], 'text/plain; charset=utf-8');
    sendStub.restore();
    timeoutStub.restore();
    setRetRequestHeaderStub.restore();
});

test('Cookies can be added to the document passing them as options to Strophe.Connection', (assert) => {
    if (typeof document === 'undefined') {
        console.warn("Skipping test since there's no 'document' object");
        assert.equal(true, true);
        return;
    }

    const stanza = $pres();
    let conn = new Strophe.Connection('http://localhost', {
        'cookies': {
            '_xxx': {
                'value': '1234',
                'path': '/',
            },
        },
    });
    assert.notEqual(document.cookie.indexOf('_xxx'), -1);
    let start = document.cookie.indexOf('_xxx');
    let end = document.cookie.indexOf(';', start);
    end = end == -1 ? document.cookie.length : end;
    assert.equal(document.cookie.substring(start, end), '_xxx=1234');

    // Also test when passing only a string
    conn = new Strophe.Connection('http://localhost', { 'cookies': { '_yyy': '4321' }, 'withCredentials': true });
    assert.notEqual(document.cookie.indexOf('_yyy'), -1);
    start = document.cookie.indexOf('_yyy');
    end = document.cookie.indexOf(';', start);
    end = end == -1 ? document.cookie.length : end;
    assert.equal(document.cookie.substring(start, end), '_yyy=4321');

    // Stub XMLHttpRequest.protototype.send so that it doesn't
    // actually try to send out the request.
    const sendStub = sinon.stub(XMLHttpRequest.prototype, 'send');
    // Stub setTimeout to immediately call functions, otherwise our
    // assertions fail due to async execution.
    const timeoutStub = sinon.stub(globalThis, 'setTimeout').callsFake(function (func) {
        func.apply(arguments);
    });
    conn.send(stanza);
    // Unfortunately there's no way to test the headers set in the
    // request (only in the response). They can however be checked with
    // the browser's developer tools.
    assert.equal(sendStub.called, true);
    sendStub.restore();
    timeoutStub.restore();
});

test('send() does not accept strings', (assert) => {
    const stanza = '<presence/>';
    const conn = new Strophe.Connection('');
    // fake connection callback to avoid errors
    conn.connect_callback = () => {};
    try {
        conn.send(stanza);
    } catch (e) {
        assert.equal(e.name, 'StropheError', 'send() should throw exception');
    }
});

test('Builder with XML attribute escaping test', (assert) => {
    let text = '<b>';
    let expected = '<presence to="&lt;b&gt;" xmlns="jabber:client"/>';
    let pres = $pres({ to: text });
    assert.equal(pres.toString(), expected, '< should be escaped');

    text = 'foo&bar';
    expected = '<presence to="foo&amp;bar" xmlns="jabber:client"/>';
    pres = $pres({ to: text });
    assert.equal(pres.toString(), expected, '& should be escaped');
});

test('c() accepts text and passes it to xmlElement', (assert) => {
    const pres = $pres({ from: 'darcy@pemberley.lit', to: 'books@chat.pemberley.lit' }).c(
        'nick',
        { xmlns: 'http://jabber.org/protocol/nick' },
        'Darcy'
    );
    const expected =
        '<presence from="darcy@pemberley.lit" to="books@chat.pemberley.lit" xmlns="jabber:client">' +
        '<nick xmlns="http://jabber.org/protocol/nick">Darcy</nick>' +
        '</presence>';
    assert.equal(pres.toString(), expected, "'Darcy' should be a child of <presence>");
});

test('c() return the child element if it is a text node.', (assert) => {
    // See this issue: https://github.com/strophe/strophejs/issues/124
    let pres = $pres({ from: 'darcy@pemberley.lit', to: 'books@chat.pemberley.lit' })
        .c('show', {}, 'dnd')
        .c('status', {}, 'In a meeting');

    let expected =
        '<presence from="darcy@pemberley.lit" to="books@chat.pemberley.lit" xmlns="jabber:client">' +
        '<show>dnd</show><status>In a meeting</status>' +
        '</presence>';
    assert.equal(pres.toString(), expected, '');

    pres = $pres({ from: 'darcy@pemberley.lit', to: 'books@chat.pemberley.lit' }).c('show', {}, '').c('status', {}, '');
    expected =
        '<presence from="darcy@pemberley.lit" to="books@chat.pemberley.lit" xmlns="jabber:client">' +
        '<show/><status/>' +
        '</presence>';
    assert.equal(pres.toString(), expected, '');
});

QUnit.module('XML');

test('XML escaping test', (assert) => {
    const text = 's & p';
    const textNode = Strophe.xmlTextNode(text);
    assert.equal(Strophe.getText(textNode), 's &amp; p', 'should be escaped');
    const text0 = 's < & > p';
    const textNode0 = Strophe.xmlTextNode(text0);
    assert.equal(Strophe.getText(textNode0), 's &lt; &amp; &gt; p', 'should be escaped');
    const text1 = 's\'s or "p"';
    const textNode1 = Strophe.xmlTextNode(text1);
    assert.equal(Strophe.getText(textNode1), 's&apos;s or &quot;p&quot;', 'should be escaped');
    const text2 = '<![CDATA[<foo>]]>';
    const textNode2 = Strophe.xmlTextNode(text2);
    assert.equal(Strophe.getText(textNode2), '&lt;![CDATA[&lt;foo&gt;]]&gt;', 'should be escaped');
    const text3 = '<![CDATA[]]]]><![CDATA[>]]>';
    const textNode3 = Strophe.xmlTextNode(text3);
    assert.equal(Strophe.getText(textNode3), '&lt;![CDATA[]]]]&gt;&lt;![CDATA[&gt;]]&gt;', 'should be escaped');
    const text4 = '&lt;foo&gt;<![CDATA[<foo>]]>';
    const textNode4 = Strophe.xmlTextNode(text4);
    assert.equal(Strophe.getText(textNode4), '&amp;lt;foo&amp;gt;&lt;![CDATA[&lt;foo&gt;]]&gt;', 'should be escaped');
});

test('XML element creation', (assert) => {
    let el = Strophe.xmlElement('message');
    assert.equal(el.tagName, 'message', 'Element name should be the same');

    el = Strophe.xmlElement('message', 'Some text');
    assert.equal(el.textContent, 'Some text');

    el = Strophe.xmlElement('message', {}, 'Some text');
    assert.equal(el.textContent, 'Some text');

    el = Strophe.xmlElement('message', { foo: 'bar' }, 'Some text');
    assert.equal(el.textContent, 'Some text');
    assert.equal(el.getAttribute('foo'), 'bar');

    el = Strophe.xmlElement('message', [['foo', 'bar']], 'Some text');
    assert.equal(el.textContent, 'Some text');
    assert.equal(el.getAttribute('foo'), 'bar');
});

test('copyElement() double escape bug', function (assert) {
    const cloned = Strophe.copyElement(Strophe.xmlGenerator().createTextNode('<>&lt;&gt;'));
    assert.equal(cloned.nodeValue, '<>&lt;&gt;');
});

test('XML serializing', function (assert) {
    const parser = new Strophe.shims.DOMParser();
    // Attributes
    const element1 = parser.parseFromString("<foo attr1='abc' attr2='edf'>bar</foo>", 'text/xml').documentElement;
    assert.equal(Strophe.serialize(element1), '<foo attr1="abc" attr2="edf">bar</foo>', 'should be serialized');
    const element2 = parser.parseFromString('<foo attr1="abc" attr2="edf">bar</foo>', 'text/xml').documentElement;
    assert.equal(Strophe.serialize(element2), '<foo attr1="abc" attr2="edf">bar</foo>', 'should be serialized');
    // Escaping values
    const element3 = parser.parseFromString(
        '<foo>a &gt; &apos;b&apos; &amp; &quot;b&quot; &lt; c</foo>',
        'text/xml'
    ).documentElement;
    assert.equal(
        Strophe.serialize(element3),
        '<foo>a &gt; &apos;b&apos; &amp; &quot;b&quot; &lt; c</foo>',
        'should be serialized'
    );
    // Escaping attributes
    const element4 = parser.parseFromString("<foo attr='&lt;a> &apos;b&apos;'>bar</foo>", 'text/xml').documentElement;
    assert.equal(Strophe.serialize(element4), '<foo attr="&lt;a&gt; &apos;b&apos;">bar</foo>', 'should be serialized');
    const element5 = parser.parseFromString('<foo attr="&lt;a> &quot;b&quot;">bar</foo>', 'text/xml').documentElement;
    assert.equal(Strophe.serialize(element5), '<foo attr="&lt;a&gt; &quot;b&quot;">bar</foo>', 'should be serialized');
    // Empty elements
    const element6 = parser.parseFromString('<foo><empty></empty></foo>', 'text/xml').documentElement;
    assert.equal(Strophe.serialize(element6), '<foo><empty/></foo>', 'should be serialized');
    // Children
    const element7 = parser.parseFromString(
        '<foo><bar>a</bar><baz><wibble>b</wibble></baz></foo>',
        'text/xml'
    ).documentElement;
    assert.equal(
        Strophe.serialize(element7),
        '<foo><bar>a</bar><baz><wibble>b</wibble></baz></foo>',
        'should be serialized'
    );
    const element8 = parser.parseFromString(
        '<foo><bar>a</bar><baz>b<wibble>c</wibble>d</baz></foo>',
        'text/xml'
    ).documentElement;
    assert.equal(
        Strophe.serialize(element8),
        '<foo><bar>a</bar><baz>b<wibble>c</wibble>d</baz></foo>',
        'should be serialized'
    );
    // CDATA
    const element9 = parser.parseFromString('<foo><![CDATA[<foo>]]></foo>', 'text/xml').documentElement;
    assert.equal(Strophe.serialize(element9), '<foo><![CDATA[<foo>]]></foo>', 'should be serialized');
    const element10 = parser.parseFromString('<foo><![CDATA[]]]]><![CDATA[>]]></foo>', 'text/xml').documentElement;
    assert.equal(Strophe.serialize(element10), '<foo><![CDATA[]]]]><![CDATA[>]]></foo>', 'should be serialized');
    const element11 = parser.parseFromString('<foo>&lt;foo&gt;<![CDATA[<foo>]]></foo>', 'text/xml').documentElement;
    assert.equal(Strophe.serialize(element11), '<foo>&lt;foo&gt;<![CDATA[<foo>]]></foo>', 'should be serialized');
});

QUnit.module('Handler');

test('HTTP errors', (assert) => {
    const spy500 = sinon.spy();
    const spy401 = sinon.spy();
    const conn = new Strophe.Connection('http://fake');
    conn.addProtocolErrorHandler('HTTP', 500, spy500);
    conn.addProtocolErrorHandler('HTTP', 401, spy401);
    const req = new Strophe.Request('', () => {});
    req.xhr = new XHR(200, 4);
    conn._proto._onRequestStateChange(() => {}, req);
    assert.equal(spy500.called, false, 'Error handler does not get called when no HTTP error');
    assert.equal(spy401.called, false, 'Error handler does not get called when no HTTP error');

    req.xhr = new XHR(401, 4);
    conn._proto._onRequestStateChange(() => {}, req);
    assert.equal(spy500.called, false, 'Error handler does not get called when no HTTP 500 error');
    assert.equal(spy401.called, true, 'Error handler does get called when HTTP 401 error');

    req.xhr = new XHR(500, 4);
    conn._proto._onRequestStateChange(() => {}, req);
    assert.equal(spy500.called, true, 'Error handler gets called on HTTP 500 error');
});

test('IQ fallback handler', (assert) => {
    // Strophe returns an IQ error stanza to unhandled incoming IQ get and set stanzas
    const conn = new Strophe.Connection('http://fake');
    conn.authenticated = true;
    const spy = sinon.spy(conn, 'send');

    conn._dataRecv(makeRequest($iq({ 'type': 'get', 'id': '1' }).tree()));
    assert.equal(spy.calledOnce, true, 'send was called only once');
    assert.equal(
        Strophe.serialize(spy.args[0][0].nodeTree),
        '<iq id="1" type="error" xmlns="jabber:client">' +
            '<error type="cancel"><service-unavailable xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/></error>' +
            '</iq>'
    );

    conn._dataRecv(makeRequest($iq({ 'type': 'get', 'id': '2' }).tree()));
    assert.equal(spy.calledTwice, true, 'send was called twice');
    assert.equal(
        Strophe.serialize(spy.args[1][0].nodeTree),
        '<iq id="2" type="error" xmlns="jabber:client">' +
            '<error type="cancel"><service-unavailable xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/></error>' +
            '</iq>'
    );

    // When there is a handler, then the fallback handler isn't called.
    const handlerStub = sinon.stub();
    handlerStub.returns(true);
    conn.addHandler(handlerStub, null, 'iq');

    conn._dataRecv(makeRequest($iq({ 'type': 'set' }).tree()));
    assert.equal(spy.calledTwice, true, 'send was called twice');

    conn._dataRecv(makeRequest($iq({ 'type': 'get' }).tree()));
    assert.equal(spy.calledTwice, true, 'send was called twice');

    assert.equal(handlerStub.calledTwice, true, 'The manually registered IQ handler was called twice');
});

test('Full JID matching', (assert) => {
    const elem = $msg({ from: 'darcy@pemberley.lit/library' }).tree();

    let hand = new Strophe.Handler(null, null, null, null, null, 'darcy@pemberley.lit/library');
    assert.equal(hand.isMatch(elem), true, 'Full JID should match');

    hand = new Strophe.Handler(null, null, null, null, null, 'darcy@pemberley.lit');
    assert.equal(hand.isMatch(elem), false, "Bare JID shouldn't match");
});

test('Bare JID matching', (assert) => {
    const elem = $msg({ from: 'darcy@pemberley.lit/library' }).tree();

    let hand = new Strophe.Handler(null, null, null, null, null, 'darcy@pemberley.lit/library', {
        matchBareFromJid: true,
    });
    assert.equal(hand.isMatch(elem), true, 'Full JID should match');

    hand = new Strophe.Handler(null, null, null, null, null, 'darcy@pemberley.lit', { matchBareFromJid: true });
    assert.equal(hand.isMatch(elem), true, 'Bare JID should match');
});

test('Namespace matching', (assert) => {
    const elemNoFrag = $msg({ xmlns: 'http://jabber.org/protocol/muc' }).tree();
    const elemWithFrag = $msg({ xmlns: 'http://jabber.org/protocol/muc#user' }).tree();

    let hand = new Strophe.Handler(null, 'http://jabber.org/protocol/muc', null, null, null, null);
    assert.equal(hand.isMatch(elemNoFrag), true, 'The handler should match on stanza namespace');
    assert.equal(hand.isMatch(elemWithFrag), false, 'The handler should not match on stanza namespace with fragment');

    const elemNested = stx`
        <iq type="error"
                xmlns="jabber:client"
                from="plays.shakespeare.lit"
                to="romeo@montague.net/orchard"
                id="info1">
            <query xmlns="http://jabber.org/protocol/disco#info"/>
            <error type="cancel">
                <item-not-found xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>
            </error>
        </iq>`.tree();
    hand = new Strophe.Handler(null, 'urn:ietf:params:xml:ns:xmpp-stanzas');
    assert.equal(hand.isMatch(elemNested), true, 'The handler should match on a nested namespace');
    assert.equal(hand.isMatch(elemNoFrag), false, 'The handler should not match on a non-existing namespace');

    hand = new Strophe.Handler(null, 'http://jabber.org/protocol/muc', null, null, null, null, {
        'ignoreNamespaceFragment': true,
    });
    assert.equal(hand.isMatch(elemNoFrag), true, 'The handler should match on stanza namespace');
    assert.equal(hand.isMatch(elemWithFrag), true, 'The handler should match on stanza namespace, even with fragment');
});

test('Stanza name matching', (assert) => {
    const elem = $iq().tree();
    let hand = new Strophe.Handler(null, null, 'iq');
    assert.equal(hand.isMatch(elem), true, 'The handler should match on stanza name');

    hand = new Strophe.Handler(null, null, 'message');
    assert.notEqual(hand.isMatch(elem), true, 'The handler should not match wrong stanza name');
});

test('Stanza type matching', (assert) => {
    const elem = $iq({ type: 'error' }).tree();
    let hand = new Strophe.Handler(null, null, 'iq', 'error');
    assert.equal(hand.isMatch(elem), true, 'The handler should match on stanza type');

    hand = new Strophe.Handler(null, null, 'iq', 'result');
    assert.notEqual(hand.isMatch(elem), true, 'The handler should not match wrong stanza type');

    hand = new Strophe.Handler(null, null, 'iq', ['error', 'result']);
    assert.equal(hand.isMatch(elem), true, 'The handler should match if stanza type is in array of types');
});

QUnit.module('Misc');

test('Function binding', (assert) => {
    const spy = sinon.spy();
    const obj = {};
    const arg1 = 'foo';
    const arg2 = 'bar';
    const arg3 = 'baz';

    const f = spy.bind(obj, arg1, arg2);
    f(arg3);
    assert.equal(spy.called, true, 'bound function should be called');
    assert.equal(spy.calledOn(obj), true, 'bound function should have correct context');
    assert.equal(spy.alwaysCalledWithExactly(arg1, arg2, arg3), true, 'bound function should get all arguments');
});

test('Connfail for invalid XML', (assert) => {
    const req = new Strophe.Request('', function () {});
    req.xhr = new XHR(undefined, undefined, 'text');

    const conn = new Strophe.Connection('http://fake');
    conn.connect_callback = function (status, condition) {
        if (status === Strophe.Status.CONNFAIL) {
            assert.equal(condition, 'bad-format', 'connection should fail with condition bad-format');
        }
    };
    conn._connect_cb(req);
});

QUnit.module('XHR error handling');

// Note that these tests are pretty dependent on the actual code.

test('Aborted requests do nothing', (assert) => {
    Strophe.Connection.prototype._onIdle = () => {};
    const conn = new Strophe.Connection('http://fake');

    // simulate a finished but aborted request
    const req = { id: 43, sends: 1, xhr: new XHR(undefined, 4), abort: true };

    conn._requests = [req];
    const spy = sinon.spy();
    conn._proto._onRequestStateChange(spy, req);

    assert.equal(req.abort, false, 'abort flag should be toggled');
    assert.equal(conn._requests.length, 1, '_requests should be same length');
    assert.equal(spy.called, false, 'callback should not be called');
});

test('Incomplete requests do nothing', (assert) => {
    Strophe.Connection.prototype._onIdle = () => {};
    const conn = new Strophe.Connection('http://fake');
    // simulate a finished but aborted request
    const req = { id: 44, sends: 1, xhr: new XHR(undefined, 3) };
    conn._requests = [req];
    const spy = sinon.spy();
    conn._proto._onRequestStateChange(spy, req);
    assert.equal(conn._requests.length, 1, '_requests should be same length');
    assert.equal(spy.called, false, 'callback should not be called');
});

QUnit.module('SASL Mechanisms');

test('Default mechanisms will be registered if none are provided', (assert) => {
    const conn = new Strophe.Connection('http://localhost');
    assert.equal(Object.keys(conn.mechanisms).length, 9, 'Ten by default registered SASL mechanisms');
    assert.equal('ANONYMOUS' in conn.mechanisms, true, 'ANONYMOUS is registered');
    assert.equal('EXTERNAL' in conn.mechanisms, true, 'EXTERNAL is registered');
    assert.equal('OAUTHBEARER' in conn.mechanisms, true, 'OAUTHBEARER is registered');
    assert.equal('PLAIN' in conn.mechanisms, true, 'PLAIN is registered');
    assert.equal('SCRAM-SHA-1' in conn.mechanisms, true, 'SCRAM-SHA-1 is registered');
    assert.equal('SCRAM-SHA-256' in conn.mechanisms, true, 'SCRAM-SHA-256 is registered');
    assert.equal('SCRAM-SHA-384' in conn.mechanisms, true, 'SCRAM-SHA-384 is registered');
    assert.equal('SCRAM-SHA-512' in conn.mechanisms, true, 'SCRAM-SHA-512 is registered');
    assert.equal('X-OAUTH2' in conn.mechanisms, true, 'X-OAUTH2 is registered');
});

test('Custom mechanisms be specified when instantiating Strophe.Connection', (assert) => {
    let conn = new Strophe.Connection('http://localhost', { 'mechanisms': [SASLFoo] });
    assert.equal(Object.keys(conn.mechanisms).length, 1, 'Only one registered SASL mechanism');
    assert.equal('FOO' in conn.mechanisms, true, 'FOO is registered');
    assert.notEqual('PLAIN' in conn.mechanisms, true, 'PLAIN is not registered');

    conn = new Strophe.Connection('http://localhost', { 'mechanisms': [SASLFoo, Strophe.SASLPlain] });
    assert.equal(Object.keys(conn.mechanisms).length, 2, 'Only two registered SASL mechanisms');
    assert.equal('FOO' in conn.mechanisms, true, 'FOO is registered');
    assert.equal('PLAIN' in conn.mechanisms, true, 'PLAIN is registered');
});

test('The supported mechanism with the highest priority will be used', (assert) => {
    Strophe.SASLExternal.prototype.priority = 10;
    Strophe.SASLSHA1.prototype.priority = 20;
    const conn = new Strophe.Connection('http://localhost', { 'mechanisms': [Strophe.SASLSHA1, Strophe.SASLExternal] });
    const authSpy = sinon.spy(conn, '_attemptSASLAuth');
    assert.equal(authSpy.called, false);
    conn.connect('dummy@localhost', 'secret');

    const mechanisms = Object.values(conn.mechanisms);
    conn.authenticate(mechanisms);
    assert.equal(authSpy.called, true);
    assert.equal(authSpy.returnValues.length, 1);
    assert.equal(authSpy.returnValues[0], true);
    assert.equal(conn._sasl_mechanism.mechname, 'SCRAM-SHA-1');

    mechanisms[0].priority = 20;
    mechanisms[1].priority = 30;
    conn.connect('dummy@localhost', 'secret');
    conn.authenticate(Object.values(mechanisms));
    assert.equal(conn._sasl_mechanism.mechname, 'EXTERNAL');
});

test('SASL PLAIN Auth', async (assert) => {
    const conn = { pass: 'password', authcid: 'user', authzid: 'user@xmpp.org', domain: 'xmpp.org' };
    const saslplain = new Strophe.SASLPlain();
    saslplain.onStart(conn);
    assert.ok(saslplain.test(conn), 'PLAIN is enabled by default.');
    const response = await saslplain.onChallenge(conn);
    assert.equal(response, ['', conn.authcid, conn.pass].join('\u0000'), 'checking plain auth challenge');
    saslplain.onSuccess();
});

test('SASL PLAIN Auth with authzid', async (assert) => {
    const conn = { pass: 'password', authcid: 'user', authzid: 'admin@xmpp.org', domain: 'xmpp.org' };
    const saslplain = new Strophe.SASLPlain();
    saslplain.onStart(conn);
    assert.ok(saslplain.test(conn), 'PLAIN is enabled by default.');
    const response = await saslplain.onChallenge(conn, null);
    assert.equal(response, [conn.authzid, conn.authcid, conn.pass].join('\u0000'), 'checking plain auth challenge');
    saslplain.onSuccess();
});

test('SASL SCRAM-SHA-1 Auth', async (assert) => {
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
    const conn = {
        pass: 'pencil',
        authcid: 'user',
        authzid: 'user@xmpp.org',
        _sasl_data: [],
    };
    const saslsha1 = new Strophe.SASLSHA1();
    saslsha1.onStart(conn);
    assert.ok(saslsha1.test(conn), 'SHA-1 is enabled by default.');
    // test taken from example section on:
    // URL: http://tools.ietf.org/html/rfc5802#section-5
    let response = await saslsha1.clientChallenge(conn, 'fyko+d2lbbFgONRv9qkxdawL');
    assert.equal(response, 'n,,n=user,r=fyko+d2lbbFgONRv9qkxdawL', 'checking first auth challenge');

    response = await saslsha1.onChallenge(
        conn,
        'r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,s=QSXCR+Q6sek8bf92,i=4096'
    );
    assert.equal(
        response,
        'c=biws,r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,p=v0X8v3Bz2T0CJGbJQyF0X+HI4Ts=',
        'checking second auth challenge'
    );
    saslsha1.onSuccess();
});

test('SASL SCRAM-SHA-256 Auth', async (assert) => {
    /* This is a simple example of a SCRAM-SHA-256 authentication exchange
     * when the client doesn't support channel bindings (username 'user' and
     * password 'pencil' are used):
     *
     * C: n,,n=user,r=rOprNGfwEbeRWgbNEkqO
     * S: r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,
     * s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096
     * C: c=biws,r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,
     * p=dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ=
     * S: v=6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4=
     *
     */
    const conn = {
        pass: 'pencil',
        authcid: 'user',
        authzid: 'user@xmpp.org',
        _sasl_data: [],
    };
    const saslsha256 = new Strophe.SASLSHA256();
    saslsha256.onStart(conn);
    assert.ok(saslsha256.test(conn), 'SHA-256 is enabled by default.');
    // test taken from example section on:
    // URL: https://datatracker.ietf.org/doc/html/rfc7677#section-3
    let response = await saslsha256.clientChallenge(conn, 'rOprNGfwEbeRWgbNEkqO');
    assert.equal(response, 'n,,n=user,r=rOprNGfwEbeRWgbNEkqO', 'checking first auth challenge');

    response = await saslsha256.onChallenge(
        conn,
        'r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096'
    );
    assert.equal(
        response,
        'c=biws,r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,p=dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ=',
        'checking second auth challenge'
    );
    saslsha256.onSuccess();
});

test('SASL EXTERNAL Auth', async (assert) => {
    let conn = { pass: 'password', authcid: 'user', authzid: 'user@xmpp.org' };
    let sasl_external = new Strophe.SASLExternal();
    assert.ok(sasl_external.test(conn), 'EXTERNAL is enabled by default.');
    sasl_external.onStart(conn);

    let response = await sasl_external.clientChallenge(conn);
    assert.equal(
        response,
        conn.authzid,
        'Response to EXTERNAL auth challenge should be authzid if different authcid was passed in.'
    );
    sasl_external.onSuccess();

    conn = { pass: 'password', authcid: 'user', authzid: 'user@xmpp.org' };
    sasl_external = new Strophe.SASLExternal();
    assert.ok(sasl_external.test(conn), 'EXTERNAL is enabled by default.');
    sasl_external.onStart(conn);
    response = await sasl_external.onChallenge(conn, null);
    assert.equal(
        response,
        conn.authzid,
        'Response to EXTERNAL auth challenge should be empty string if authcid = authzid'
    );
    sasl_external.onSuccess();
});

QUnit.module('BOSH Session resumption');

test('When passing in {keepalive: true} to Strophe.Connection, then the session tokens get cached automatically', (assert) => {
    const conn = new Strophe.Connection('', { 'keepalive': true });
    conn.jid = 'dummy@localhost';
    conn._proto.sid = '5332346';
    const cacheSpy = sinon.spy(conn._proto, '_cacheSession');
    assert.equal(cacheSpy.called, false);
    conn._proto._buildBody();
    assert.equal(cacheSpy.called, true);
    assert.equal(sessionStorage.getItem('strophe-bosh-session'), null);
    conn.authenticated = true;
    conn._proto._buildBody();
    assert.ok(sessionStorage.getItem('strophe-bosh-session'));
    assert.equal(cacheSpy.called, true);
    conn.authenticated = false;
    conn._proto._buildBody();
    assert.equal(sessionStorage.getItem('strophe-bosh-session'), null);
    assert.equal(cacheSpy.called, true);
});

test('the request ID (RID) has the proper value whenever a session is restored', (assert) => {
    sessionStorage.removeItem('strophe-bosh-session');
    const conn = new Strophe.Connection('', { 'keepalive': true });
    conn.authenticated = true;
    conn.jid = 'dummy@localhost';
    conn._proto.rid = '123456';
    conn._proto.sid = '987654321';
    conn._proto._cacheSession();
    delete conn._proto.rid;
    conn.restore();
    let body = conn._proto._buildBody();
    assert.equal(body.tree().getAttribute('rid'), '123456');
    body = conn._proto._buildBody();
    assert.equal(body.tree().getAttribute('rid'), '123457');
    body = conn._proto._buildBody();
    assert.equal(body.tree().getAttribute('rid'), '123458');
    delete conn._proto.rid;
    conn.restore();
    body = conn._proto._buildBody();
    assert.equal(body.tree().getAttribute('rid'), '123459');
});

test('restore can only be called with BOSH and when {keepalive: true} is passed to Strophe.Connection', (assert) => {
    let conn = new Strophe.Connection('');
    const boshSpy = sinon.spy(conn._proto, '_restore');
    const checkSpy = sinon.spy(conn, '_sessionCachingSupported');
    assert.equal(conn.restored, false);
    try {
        conn.restore();
    } catch (e) {
        assert.equal(
            e.name,
            'StropheSessionError',
            'conn.restore() should throw an exception when keepalive is false.'
        );
        assert.equal(
            e.message,
            '_restore: no restoreable session.',
            'conn.restore() should throw an exception when keepalive is false'
        );
    }
    assert.equal(boshSpy.called, true);
    assert.equal(checkSpy.called, true);

    conn = new Strophe.Connection('ws:localhost');
    try {
        conn.restore();
    } catch (e) {
        assert.equal(
            e.name,
            'StropheSessionError',
            'conn.restore() should throw an exception when keepalive is false.'
        );
        assert.equal(
            e.message,
            'The "restore" method can only be used with a BOSH connection.',
            'The conn.restore method can only be used with a BOSH connection.'
        );
    }
    assert.equal(conn.restored, false);
});

test('the _cacheSession method caches the BOSH session tokens', (assert) => {
    sessionStorage.removeItem('strophe-bosh-session');
    const conn = new Strophe.Connection('http://fake', { 'keepalive': true });
    // Nothing gets cached if there aren't tokens to cache
    conn._proto._cacheSession();
    assert.equal(sessionStorage.getItem('strophe-bosh-session'), null);
    // Let's create some tokens to cache
    conn.authenticated = true;
    conn.jid = 'dummy@localhost';
    conn._proto.rid = '123456';
    conn._proto.sid = '987654321';
    assert.equal(sessionStorage.getItem('strophe-bosh-session'), null);
    conn._proto._cacheSession();
    assert.notEqual(sessionStorage.getItem('strophe-bosh-session'), null);
});

test('when calling "restore" without a restorable session, an exception is raised', (assert) => {
    sessionStorage.removeItem('strophe-bosh-session');
    const conn = new Strophe.Connection('', { 'keepalive': true });
    const boshSpy = sinon.spy(conn._proto, '_restore');
    const checkSpy = sinon.spy(conn, '_sessionCachingSupported');
    assert.equal(conn.restored, false);
    try {
        conn.restore();
    } catch (e) {
        assert.equal(e.name, 'StropheSessionError');
        assert.equal(e.message, '_restore: no restoreable session.');
    }
    assert.equal(conn.restored, false);
    assert.equal(boshSpy.called, true);
    assert.equal(checkSpy.called, true);
});

test('"restore" takes an optional JID argument for more precise session verification', (assert) => {
    sessionStorage.removeItem('strophe-bosh-session');
    const conn = new Strophe.Connection('', { 'keepalive': true });
    const boshSpy = sinon.spy(conn._proto, '_restore');
    const checkSpy = sinon.spy(conn, '_sessionCachingSupported');
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
        assert.equal(e.name, 'StropheSessionError');
        assert.equal(e.message, '_restore: no restoreable session.');
    }
    assert.equal(conn.restored, false);
    assert.equal(boshSpy.called, true);
    assert.equal(checkSpy.called, true);

    // Check that passing in the right jid but with a resource is not a problem.
    conn.restore('dummy@localhost/with_resource');
    assert.equal(conn.jid, 'dummy@localhost');
    assert.equal(conn._proto.rid, '1234567');
    assert.equal(conn._proto.sid, '9876543210');
    assert.equal(conn.restored, true);
});

test('when calling "restore" with a restorable session, bosh._attach is called with the session tokens', (assert) => {
    sessionStorage.removeItem('strophe-bosh-session');
    const conn = new Strophe.Connection('', { 'keepalive': true });
    conn.authenticated = true;
    conn.jid = 'dummy@localhost';
    conn._proto.rid = '123456';
    conn._proto.sid = '987654321';
    conn._proto._cacheSession();
    delete conn._proto.rid;
    delete conn._proto.sid;
    delete conn._proto.jid;
    assert.equal(conn.restored, false);

    const boshSpy = sinon.spy(conn._proto, '_restore');
    const checkSpy = sinon.spy(conn, '_sessionCachingSupported');
    const attachSpsy = sinon.spy(conn._proto, '_attach');
    conn.restore();
    assert.equal(conn.jid, 'dummy@localhost');
    assert.equal(conn._proto.rid, '123456');
    assert.equal(conn._proto.sid, '987654321');
    assert.equal(conn.restored, true);
    assert.equal(boshSpy.called, true);
    assert.equal(checkSpy.called, true);
    assert.equal(attachSpsy.called, true);
});

QUnit.module('BOSH next valid request id');

test('nextValidRid is called after successful request', (assert) => {
    Strophe.Connection.prototype._onIdle = () => {};
    const conn = new Strophe.Connection('http://fake');
    const spy = sinon.spy(conn, 'nextValidRid');
    const req = { id: 43, sends: 1, xhr: new XHR(200, 4), rid: 42 };
    conn._requests = [req];
    conn._proto._onRequestStateChange(function () {}, req);
    assert.equal(spy.calledOnce, true, 'nextValidRid was called only once');
    assert.equal(spy.calledWith(43), true, 'The RID was valid');
});

test('nextValidRid is not called after failed request', (assert) => {
    Strophe.Connection.prototype._onIdle = () => {};
    const conn = new Strophe.Connection('http://fake');
    const spy = sinon.spy(conn, 'nextValidRid');
    const req = { id: 43, sends: 1, xhr: new XHR(0, 4), rid: 42 };
    conn._requests = [req];
    conn._proto._onRequestStateChange(function () {}, req);
    assert.equal(spy.called, false, 'nextValidRid was not called');
});

test('nextValidRid is called after failed request with disconnection', (assert) => {
    sinon.stub(Math, 'random').callsFake(() => 1);
    Strophe.Connection.prototype._onIdle = () => {};
    const conn = new Strophe.Connection('http://fake');
    const spy = sinon.spy(conn, 'nextValidRid');
    const req = { id: 43, sends: 1, xhr: new XHR(404, 4), rid: 42 };
    conn._requests = [req];
    conn._proto._onRequestStateChange(function () {}, req);
    assert.equal(spy.calledOnce, true, 'nextValidRid was called only once');
    assert.equal(spy.calledWith(4294967295), true, 'The RID was valid');
    Math.random.restore();
});

test('nextValidRid is called after connection reset', (assert) => {
    sinon.stub(Math, 'random').callsFake(() => 1);
    Strophe.Connection.prototype._onIdle = () => {};
    const conn = new Strophe.Connection('http://fake');
    const spy = sinon.spy(conn, 'nextValidRid');
    conn.reset();
    assert.equal(spy.calledOnce, true, 'nextValidRid was called only once');
    assert.equal(spy.calledWith(4294967295), true, 'The RID was valid');
    Math.random.restore();
});

QUnit.module('The stx tagged template literal');

test('can be used to create Stanza objects that are equivalent to Builder objects', (assert) => {
    let templateStanza = stx`
        <iq type="result"
            to="juliet@capulet.lit/balcony"
            id="retrieve1"
            xmlns="jabber:client">
            <pubsub xmlns="http://jabber.org/protocol/pubsub">
                <items node="urn:xmpp:bookmarks:1">
                <item id="theplay@conference.shakespeare.lit">
                    <conference xmlns="urn:xmpp:bookmarks:1"
                                name="The Play&apos;s the Thing"
                                autojoin="true">
                        <nick>JC</nick>
                    </conference>
                </item>
                <item id="orchard@conference.shakespeare.lit">
                    <conference xmlns="urn:xmpp:bookmarks:1"
                                name="The Orcard"
                                autojoin="1">
                        <nick>JC</nick>
                        <extensions>
                            <state xmlns="http://myclient.example/bookmark/state" minimized="true"/>
                        </extensions>
                    </conference>
                </item>
                </items>
            </pubsub>
        </iq>`;

    // prettier-ignore
    let builderStanza = $iq({ type: "result", to: "juliet@capulet.lit/balcony", id: "retrieve1" })
        .c("pubsub", { xmlns: "http://jabber.org/protocol/pubsub" })
            .c("items", { node: "urn:xmpp:bookmarks:1" })
                .c("item", { id: "theplay@conference.shakespeare.lit" })
                    .c("conference", { xmlns: "urn:xmpp:bookmarks:1", name: "The Play's the Thing", autojoin: "true" })
                        .c("nick").t("JC").up()
                    .up()
                .up()
                .c("item", { id: "orchard@conference.shakespeare.lit" })
                    .c("conference", { xmlns: "urn:xmpp:bookmarks:1", name: "The Orcard", autojoin: "1" })
                        .c("nick").t("JC").up()
                        .c("extensions")
                            .c("state", { xmlns: "http://myclient.example/bookmark/state", minimized: "true" })
                        .up()
                    .up()
                .up()
            .up()
        .up();

    assert.equal(isEqualNode(templateStanza, builderStanza), true);

    templateStanza = stx`
        <message xmlns="jabber:client"
                from="coven@chat.shakespeare.lit/firstwitch"
                id="162BEBB1-F6DB-4D9A-9BD8-CFDCC801A0B2"
                to="hecate@shakespeare.lit/broom"
                type="groupchat">
            <body>Thrice the brinded cat hath mew'd.</body>
            <delay xmlns="urn:xmpp:delay"
                from="coven@chat.shakespeare.lit"
                stamp="2002-10-13T23:58:37Z"/>
        </message>`;

    // prettier-ignore
    builderStanza = $msg({
        from: 'coven@chat.shakespeare.lit/firstwitch',
        id: '162BEBB1-F6DB-4D9A-9BD8-CFDCC801A0B2',
        to: 'hecate@shakespeare.lit/broom',
        type: 'groupchat',
    }).c('body').t("Thrice the brinded cat hath mew'd.").up()
    .c('delay', { xmlns: 'urn:xmpp:delay', from: 'coven@chat.shakespeare.lit', stamp: '2002-10-13T23:58:37Z' });

    assert.equal(isEqualNode(templateStanza, builderStanza), true);

    templateStanza = stx`
        <presence xmlns="jabber:client"
                from="hag66@shakespeare.lit/pda"
                id="n13mt3l"
                to="coven@chat.shakespeare.lit/thirdwitch">
            <x xmlns="http://jabber.org/protocol/muc">
                <history maxchars="65000"/>
            </x>
        </presence>`;

    // prettier-ignore
    builderStanza = $pres({
        from: 'hag66@shakespeare.lit/pda',
        id: 'n13mt3l',
        to: 'coven@chat.shakespeare.lit/thirdwitch',
    }).c('x', { xmlns: 'http://jabber.org/protocol/muc' })
        .c('history', { maxchars: '65000' });

    assert.equal(isEqualNode(templateStanza, builderStanza), true);
});

test('can be nested recursively', (assert) => {
    const templateStanza = stx`
        <iq type="result"
            to="juliet@capulet.lit/balcony"
            id="retrieve1"
            xmlns="jabber:client">
            <pubsub xmlns="http://jabber.org/protocol/pubsub">
                <items node="urn:xmpp:bookmarks:1">
                ${[
                    stx`<item id="theplay@conference.shakespeare.lit">
                        <conference xmlns="urn:xmpp:bookmarks:1"
                                    name="The Play&apos;s the Thing"
                                    autojoin="true">
                            <nick>JC</nick>
                        </conference>
                    </item>`,
                    stx`<item id="orchard@conference.shakespeare.lit">
                        <conference xmlns="urn:xmpp:bookmarks:1"
                                    name="The Orcard"
                                    autojoin="1">
                            <nick>JC</nick>
                            <extensions>
                                <state xmlns="http://myclient.example/bookmark/state" minimized="true"/>
                            </extensions>
                        </conference>
                    </item>`,
                ]}
                </items>
            </pubsub>
        </iq>`;

    // prettier-ignore
    const builderStanza = $iq({ type: "result", to: "juliet@capulet.lit/balcony", id: "retrieve1" })
        .c("pubsub", { xmlns: "http://jabber.org/protocol/pubsub" })
            .c("items", { node: "urn:xmpp:bookmarks:1" })
                .c("item", { id: "theplay@conference.shakespeare.lit" })
                    .c("conference", { xmlns: "urn:xmpp:bookmarks:1", name: "The Play's the Thing", autojoin: "true" })
                        .c("nick").t("JC").up()
                    .up()
                .up()
                .c("item", { id: "orchard@conference.shakespeare.lit" })
                    .c("conference", { xmlns: "urn:xmpp:bookmarks:1", name: "The Orcard", autojoin: "1" })
                        .c("nick").t("JC").up()
                        .c("extensions")
                            .c("state", { xmlns: "http://myclient.example/bookmark/state", minimized: "true" })
                        .up()
                    .up()
                .up()
            .up()
        .up();

    assert.equal(isEqualNode(templateStanza, builderStanza), true);
});

test('can have nested Builder objects', (assert) => {
    // prettier-ignore
    const templateStanza = stx`
        <iq type="result"
            to="juliet@capulet.lit/balcony"
            id="retrieve1"
            xmlns="jabber:client">
            <pubsub xmlns="http://jabber.org/protocol/pubsub">
                <items node="urn:xmpp:bookmarks:1">
                ${[
                    new Strophe.Builder('item', { id: "theplay@conference.shakespeare.lit" })
                        .c("conference", { xmlns: "urn:xmpp:bookmarks:1", name: "The Play's the Thing", autojoin: "true" })
                            .c("nick").t("JC"),
                    new Strophe.Builder('item', { id: "orchard@conference.shakespeare.lit" })
                        .c("conference", { xmlns: "urn:xmpp:bookmarks:1", name: "The Orcard", autojoin: "1" })
                            .c("nick").t("JC").up()
                            .c("extensions")
                                .c("state", { xmlns: "http://myclient.example/bookmark/state", minimized: "true" }),
                ]}
                </items>
            </pubsub>
        </iq>`;

    // prettier-ignore
    const builderStanza = $iq({ type: "result", to: "juliet@capulet.lit/balcony", id: "retrieve1" })
        .c("pubsub", { xmlns: "http://jabber.org/protocol/pubsub" })
            .c("items", { node: "urn:xmpp:bookmarks:1" })
                .c("item", { id: "theplay@conference.shakespeare.lit" })
                    .c("conference", { xmlns: "urn:xmpp:bookmarks:1", name: "The Play's the Thing", autojoin: "true" })
                        .c("nick").t("JC").up()
                    .up()
                .up()
                .c("item", { id: "orchard@conference.shakespeare.lit" })
                    .c("conference", { xmlns: "urn:xmpp:bookmarks:1", name: "The Orcard", autojoin: "1" })
                        .c("nick").t("JC").up()
                        .c("extensions")
                            .c("state", { xmlns: "http://myclient.example/bookmark/state", minimized: "true" })
                        .up()
                    .up()
                .up()
            .up()
        .up();

    assert.equal(isEqualNode(templateStanza, builderStanza), true);
});

test('escape the values passed in to them', (assert) => {
    const status = '<script>alert("p0wned")</script>';
    const templateStanza = stx`
        <presence from="wiccarocks@shakespeare.lit/laptop"
                to="coven@chat.shakespeare.lit/oldhag"
                type="unavailable"
                xmlns="jabber:client">
            <status>${status}</status>
        </presence>`;

    assert.equal(
        templateStanza.tree().querySelector('status').innerHTML,
        '&lt;script&gt;alert("p0wned")&lt;/script&gt;'
    );
});

test('The unsafeXML directive', (assert) => {
    const templateStanza = stx`
        <presence from="juliet@example.com/chamber"
                xmlns="jabber:client">
                ${Strophe.Stanza.unsafeXML(`<status>I'm busy!</status>`)}
        </presence>`;

    assert.equal(
        isEqualNode(templateStanza, $pres({ from: 'juliet@example.com/chamber' }).c('status').t("I'm busy!")),
        true
    );
});

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

function stripEmptyTextNodes(element) {
    const childNodes = Array.from(element.childNodes ?? []);
    childNodes.forEach((node) => {
        if (node.nodeType === TEXT_NODE && !node.nodeValue.trim()) {
            element.removeChild(node);
        } else if (node.nodeType === ELEMENT_NODE) {
            stripEmptyTextNodes(node); // Recursively call for child elements
        }
    });
    return element;
}

/**
 * Given two XML or HTML elements, determine if they're equal
 * @param {Strophe.Stanza|Strophe.Builder} actual
 * @param {Strophe.Stanza|Strophe.Builder} expected
 * @returns {Boolean}
 */
function isEqualNode(actual, expected) {
    actual = stripEmptyTextNodes(actual.tree());
    expected = stripEmptyTextNodes(expected.tree());

    let isEqual = actual.isEqualNode(expected);

    if (!isEqual) {
        // XXX: This is a hack.
        // When creating two XML elements, one via DOMParser, and one via
        // createElementNS (or createElement), then "isEqualNode" doesn't match.
        //
        // For example, in the following code `isEqual` is false:
        // ------------------------------------------------------
        // const a = document.createElementNS('foo', 'div');
        // a.setAttribute('xmlns', 'foo');
        //
        // const b = (new DOMParser()).parseFromString('<div xmlns="foo"></div>', 'text/xml').firstElementChild;
        // const isEqual = a.isEqualNode(div); //  false
        //
        // The workaround here is to serialize both elements to string and then use
        // DOMParser again for both (via xmlHtmlNode).
        //
        // This is not efficient, but currently this is only being used in tests.
        //
        const { xmlHtmlNode } = Strophe;
        const actual_string = serializer.serializeToString(actual);
        const expected_string = serializer.serializeToString(expected);
        isEqual =
            actual_string === expected_string || xmlHtmlNode(actual_string).isEqualNode(xmlHtmlNode(expected_string));
    }
    return isEqual;
}

/**
 * Mock xhr, provides getAllResponseHeaders function.
 * @param status
 * @param readyState
 * @param responseText
 */
function XHR(status, readyState, responseText) {
    this.status = status;
    this.readyState = readyState;
    this.responseText = responseText;
    this.getAllResponseHeaders = () => null;
}

class SASLFoo extends Strophe.SASLMechanism {
    constructor() {
        super('FOO', false, 10);
    }

    static get name() {
        return 'FOO';
    }
}

function makeRequest(stanza) {
    const req = new Strophe.Request(stanza, () => {});
    req.getResponse = function () {
        const env = new Strophe.Builder('env', { type: 'mock' }).tree();
        env.appendChild(stanza);
        return env;
    };
    return req;
}

const _sessionStorage = {};

if (!globalThis.sessionStorage) {
    Object.defineProperty(globalThis, 'sessionStorage', {
        value: {
            setItem: (key, value) => (_sessionStorage[key] = value),
            getItem: (key) => _sessionStorage[key] ?? null,
            removeItem: (key) => delete _sessionStorage[key],
        },
    });
}
