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

    builderStanza =
        $msg({ from: 'coven@chat.shakespeare.lit/firstwitch',
            id: '162BEBB1-F6DB-4D9A-9BD8-CFDCC801A0B2',
            to: 'hecate@shakespeare.lit/broom',
            type: 'groupchat' })
        .c('body').t('Thrice the brinded cat hath mew\'d.').up()
        .c('delay', { xmlns: 'urn:xmpp:delay',
            from: 'coven@chat.shakespeare.lit',
            stamp: '2002-10-13T23:58:37Z' });

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

    builderStanza =
        $pres({ from: 'hag66@shakespeare.lit/pda',
            id: 'n13mt3l',
            to: 'coven@chat.shakespeare.lit/thirdwitch' })
        .c('x', { xmlns: 'http://jabber.org/protocol/muc' })
            .c('history', { maxchars: '65000' });

    assert.equal(isEqualNode(templateStanza, builderStanza), true);
});


test('can be nested recursively', (assert) => {

    let templateStanza = stx`
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
});

const EMPTY_TEXT_REGEX = /\s*\n\s*/;
const serializer = new XMLSerializer();

/**
 * @param {Element|Builder|Stanza} el
 */
function stripEmptyTextNodes (el) {
    if (el instanceof Strophe.Builder || el instanceof Strophe.Stanza) {
        el = el.tree();
    }

    let n;
    const text_nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, (node) => {
        if (node.parentElement.nodeName.toLowerCase() === 'body') {
            return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
    });
    while (n = walker.nextNode()) text_nodes.push(n);
    text_nodes.forEach((n) => EMPTY_TEXT_REGEX.test(/** @type {Text} */(n).data) && n.parentElement.removeChild(n))

    return el;
}

/**
 * Given two XML or HTML elements, determine if they're equal
 * @param {Element} actual
 * @param {Element} expected
 * @returns {Boolean}
 */
function isEqualNode (actual, expected) {
    actual = stripEmptyTextNodes(actual);
    expected = stripEmptyTextNodes(expected);

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
