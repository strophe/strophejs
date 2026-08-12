import { Strophe, $iq, $msg, $pres, stx } from '../dist/strophe.node.esm.js';
import { isEqualNode } from './helpers.js';
import { describe, it, expect } from 'vitest';

describe('The stx tagged template literal', () => {
    it('can be used to create Stanza objects that are equivalent to Builder objects', () => {
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

        expect(isEqualNode(templateStanza, builderStanza)).toBe(true);

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

        expect(isEqualNode(templateStanza, builderStanza)).toBe(true);

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

        expect(isEqualNode(templateStanza, builderStanza)).toBe(true);
    });

    it('can be nested recursively', () => {
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

        expect(isEqualNode(templateStanza, builderStanza)).toBe(true);
    });

    it('can have nested Builder objects', () => {
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

        expect(isEqualNode(templateStanza, builderStanza)).toBe(true);
    });

    it('escape the values passed in to them', () => {
        const status = '<script>alert("p0wned")</script>';
        const templateStanza = stx`
        <presence from="wiccarocks@shakespeare.lit/laptop"
                to="coven@chat.shakespeare.lit/oldhag"
                type="unavailable"
                xmlns="jabber:client">
            <status>${status}</status>
        </presence>`;

        // The interpolated value must be inserted as escaped text, never parsed
        // as live markup: no <script> element is injected, and the raw string
        // survives verbatim as text content.
        const statusEl = templateStanza.tree().getElementsByTagName('status')[0];
        expect(statusEl.getElementsByTagName('script').length).toBe(0);
        expect(statusEl.textContent).toBe('<script>alert("p0wned")</script>');
    });

    it('The unsafeXML directive', () => {
        const templateStanza = stx`
        <presence from="juliet@example.com/chamber"
                xmlns="jabber:client">
                ${Strophe.Stanza.unsafeXML(`<status>I'm busy!</status>`)}
        </presence>`;

        expect(
            isEqualNode(templateStanza, $pres({ from: 'juliet@example.com/chamber' }).c('status').t("I'm busy!")),
        ).toBe(true);
    });

    describe('toString', () => {
        it('gives the stanza rather than the template it was written as', () => {
            // A template is not the stanza it builds, so serializing it in
            // place of one would give two answers to what a stanza is. It goes
            // through the same tree the connection sends.
            const stanza = stx`
                <message xmlns="jabber:client" to="juliet@capulet.lit">
                    <body>${['a', '\n', 'b']}</body>
                </message>`;

            expect(stanza.toString()).toBe(Strophe.serialize(stanza.tree()));
            expect(stanza.toString()).toBe(
                '<message to="juliet@capulet.lit" xmlns="jabber:client"><body>a\nb</body></message>',
            );

            // Which is what a template literal reaches for too.
            expect(`${stanza}`).toBe(Strophe.serialize(stanza.tree()));
        });

        it('confines interpolated markup as building the stanza does', () => {
            // The template text has not been through the parser, so markup in
            // it has not yet been confined to the element it landed in. Reading
            // a stanza must not be the way round that.
            const escape = stx`<message xmlns="jabber:client"><body>${Strophe.Stanza.unsafeXML(
                '</body><evil/><body>',
            )}</body></message>`;

            expect(() => escape.toString()).toThrow(/Parser Error/);
            expect(() => escape.tree()).toThrow(/Parser Error/);
        });

        it('refuses a stanza which could not be sent', () => {
            // The namespace check ran only when the tree was built, so a
            // stanza which `send()` would reject read back as if it were fine.
            expect(() => stx`<message xmlns="wrong"/>`.toString()).toThrow(/Invalid namespaceURI/);
        });
    });
});

describe('Whitespace in stx templates', () => {
    const a = (text: string) => stx`<a href="xmpp:x@y">${text}</a>`;

    /**
     * An XHTML construct (an Atom entry title here) whose content is entirely
     * interpolated, which is how a client builds a message body containing
     * mentions and links.
     */
    const xhtml = (...parts: unknown[]) =>
        Strophe.serialize(
            stx`<title type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml">${parts as string[]}</div></title>`.tree(),
        );

    const XHTML_OPEN = '<title type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml">';
    const XHTML_CLOSE = '</div></title>';
    const wrap = (content: string) => `${XHTML_OPEN}${content}${XHTML_CLOSE}`;

    it('keeps a line break between interpolated text and an interpolated element', () => {
        expect(xhtml('oshit\nI forgot ', a('@bob'))).toBe(wrap('oshit\nI forgot <a href="xmpp:x@y">@bob</a>'));
    });

    it('keeps an interpolated line break between two interpolated elements', () => {
        expect(xhtml('WITH ', a('@ODELL'), '\n', a('@bob'))).toBe(
            wrap('WITH <a href="xmpp:x@y">@ODELL</a>\n<a href="xmpp:x@y">@bob</a>'),
        );

        // The element only has element children plus the line break, so
        // nothing about the parsed tree tells it apart from indentation.
        expect(xhtml(a('@bob'), '\n', a('https://example.org/x'))).toBe(
            wrap('<a href="xmpp:x@y">@bob</a>\n<a href="xmpp:x@y">https://example.org/x</a>'),
        );
    });

    it('keeps blank lines in interpolated text', () => {
        expect(xhtml('one\n\ntwo ', a('@bob'))).toBe(wrap('one\n\ntwo <a href="xmpp:x@y">@bob</a>'));
    });

    it('still strips the indentation of a pretty-printed template', () => {
        const stanza = stx`
            <message xmlns="jabber:client" to="juliet@capulet.lit" type="chat">
                <body>Hello</body>
                <delay xmlns="urn:xmpp:delay" stamp="2002-10-13T23:58:37Z"/>
            </message>`;

        expect(Strophe.serialize(stanza.tree())).toBe(
            '<message to="juliet@capulet.lit" type="chat" xmlns="jabber:client">' +
                '<body>Hello</body>' +
                '<delay stamp="2002-10-13T23:58:37Z" xmlns="urn:xmpp:delay"/>' +
                '</message>',
        );
    });

    it('still strips the whitespace written between two interpolations', () => {
        const item = (id: number) => stx`<item id="${id}"/>`;
        const stanza = stx`
            <items xmlns="jabber:client">
                ${item(1)}
                ${item(2)}
            </items>`;

        expect(Strophe.serialize(stanza.tree())).toBe(
            '<items xmlns="jabber:client"><item id="1"/><item id="2"/></items>',
        );
    });

    it('keeps whitespace written between interpolations in text content', () => {
        const stanza = stx`<message xmlns="jabber:client"><subject>${'Hello'} ${'world'}</subject></message>`;
        expect(Strophe.serialize(stanza.tree())).toBe(
            '<message xmlns="jabber:client"><subject>Hello world</subject></message>',
        );
    });

    it('keeps the whitespace of an element which contains nothing else', () => {
        expect(Strophe.serialize(stx`<message xmlns="jabber:client"><body>   </body></message>`.tree())).toBe(
            '<message xmlns="jabber:client"><body>   </body></message>',
        );
        expect(Strophe.serialize(stx`<message xmlns="jabber:client"><subject>${'  '}</subject></message>`.tree())).toBe(
            '<message xmlns="jabber:client"><subject>  </subject></message>',
        );

        // Whitespace written out on its own is kept whole, as it always was.
        expect(
            Strophe.serialize(stx`<message xmlns="jabber:client"><subject>
            </subject></message>`.tree()),
        ).toBe('<message xmlns="jabber:client"><subject>\n            </subject></message>');

        // Interpolate into it and only what the value put there is kept, the
        // indentation around it being formatting like any other.
        expect(
            Strophe.serialize(stx`<message xmlns="jabber:client"><subject>
            ${'  '}
            </subject></message>`.tree()),
        ).toBe('<message xmlns="jabber:client"><subject>  </subject></message>');

        expect(
            Strophe.serialize(stx`<message xmlns="jabber:client"><subject>
            ${''}
            </subject></message>`.tree()),
        ).toBe('<message xmlns="jabber:client"><subject/></message>');
    });

    it('looks past a value which is empty to whatever lies beyond it', () => {
        // An empty value puts nothing against the indentation, so it must not
        // decide what happens to it. Otherwise the conditional idiom below
        // would keep or lose its line break according to whether an unrelated
        // optional value happened to be set.
        const leading = (prefix: string) => stx`<message xmlns="jabber:client"><body>
            ${prefix}${'hello'}</body></message>`;

        expect(Strophe.serialize(leading('Re: ').tree())).toBe(
            '<message xmlns="jabber:client"><body>\n            Re: hello</body></message>',
        );
        expect(Strophe.serialize(leading('').tree())).toBe(
            '<message xmlns="jabber:client"><body>\n            hello</body></message>',
        );

        // The same the other way round, where the whitespace follows the value.
        const trailing = (suffix: string) => stx`<message xmlns="jabber:client"><body>${'hello'}${suffix}
            </body></message>`;

        expect(Strophe.serialize(trailing(' !').tree())).toBe(
            '<message xmlns="jabber:client"><body>hello !\n            </body></message>',
        );
        expect(Strophe.serialize(trailing('').tree())).toBe(
            '<message xmlns="jabber:client"><body>hello\n            </body></message>',
        );

        // An empty value between two elements still leaves the indentation as
        // the formatting it is.
        expect(
            Strophe.serialize(stx`<message xmlns="jabber:client"><body>
                ${''}${Strophe.Stanza.unsafeXML('<b/>')}</body></message>`.tree()),
        ).toBe('<message xmlns="jabber:client"><body><b/></body></message>');
    });

    it('keeps the template indentation around a value which puts text against it', () => {
        // What the value puts against the indentation decides, not how the
        // value was written, so a string and a fragment which is text lay out
        // alike where they hold the same thing.
        const wrap = (value: unknown) => stx`<message xmlns="jabber:client"><c>
                    ${value as string}
                </c></message>`;
        const indented = '<message xmlns="jabber:client"><c>\n                    hello\n                </c></message>';

        expect(Strophe.serialize(wrap('hello').tree())).toBe(indented);
        expect(Strophe.serialize(wrap(Strophe.Stanza.unsafeXML('hello')).tree())).toBe(indented);

        // Indentation against an element separates elements, so it is
        // formatting and goes, whichever kind of value put the element there.
        expect(Strophe.serialize(wrap(Strophe.Stanza.unsafeXML('<p>a</p>')).tree())).toBe(
            '<message xmlns="jabber:client"><c><p>a</p></c></message>',
        );
        expect(Strophe.serialize(wrap(Strophe.Builder.fromString('<p>a</p>')).tree())).toBe(
            '<message xmlns="jabber:client"><c><p>a</p></c></message>',
        );

        // Each end is read on its own, so a fragment which begins in text and
        // ends in an element keeps the indentation before it and not after it.
        expect(Strophe.serialize(wrap(Strophe.Stanza.unsafeXML('see <p>a</p>')).tree())).toBe(
            '<message xmlns="jabber:client"><c>\n                    see <p>a</p></c></message>',
        );
        expect(Strophe.serialize(wrap(Strophe.Stanza.unsafeXML('<p>a</p> see')).tree())).toBe(
            '<message xmlns="jabber:client"><c><p>a</p> see\n                </c></message>',
        );

        // A fragment whose ends are whitespace keeps that whitespace and is
        // not text at either end, so the template's indentation still goes.
        expect(Strophe.serialize(wrap(Strophe.Stanza.unsafeXML('  <p>a</p>  ')).tree())).toBe(
            '<message xmlns="jabber:client"><c>  <p>a</p>  </c></message>',
        );
    });

    it('keeps the whitespace of spliced-in markup', () => {
        // The XHTML of a rich post, serialized from a DOM elsewhere: the space
        // between the two anchors is content, not indentation.
        const spliced = Strophe.Stanza.unsafeXML('<a href="xmpp:bob@y">@bob</a> <a href="https://x/y">a link</a>');
        const stanza = stx`<message xmlns="jabber:client"><content>${spliced}</content></message>`;

        expect(Strophe.serialize(stanza.tree())).toBe(
            '<message xmlns="jabber:client"><content>' +
                '<a href="xmpp:bob@y">@bob</a> <a href="https://x/y">a link</a>' +
                '</content></message>',
        );

        const builder = Strophe.Builder.fromString('<p><em>a</em> <em>b</em></p>');
        expect(
            Strophe.serialize(stx`<message xmlns="jabber:client"><content>${builder}</content></message>`.tree()),
        ).toBe('<message xmlns="jabber:client"><content><p><em>a</em> <em>b</em></p></content></message>');
    });

    it('keeps whitespace interpolated into an attribute', () => {
        // An attribute value is the one position a value cannot be stood in
        // for, so it goes through the parser, which normalises the whitespace
        // in one (XML 1.0 § 3.3.3): written literally, `a\nb` came back `a b`.
        // Writing it as a character reference is what carries it, and is what
        // makes an attribute keep what a value put there like everywhere else.
        const stanza = stx`<message xmlns="jabber:client" id="${'a\nb'}" to="${'\t'}"/>`;
        expect(stanza.tree().getAttribute('id')).toBe('a\nb');
        expect(stanza.tree().getAttribute('to')).toBe('\t');
    });

    it('normalises the line endings of a value interpolated into an attribute', () => {
        // As it does an interpolated value's line endings everywhere else, so
        // a CRLF is a line feed rather than both.
        const crlf = stx`<message xmlns="jabber:client" id="${'a\r\nb'}" to="${'a\rb'}"/>`;
        expect(crlf.tree().getAttribute('id')).toBe('a\nb');
        expect(crlf.tree().getAttribute('to')).toBe('a\nb');
    });

    it('leaves the rest of a tag, and markup inside an attribute, alone', () => {
        // A value elsewhere in a tag is markup rather than an attribute value,
        // which is what the conditional-attribute idiom relies on.
        const attr = Strophe.Stanza.unsafeXML(`to="juliet@capulet.lit"`);
        expect(Strophe.serialize(stx`<message xmlns="jabber:client" ${attr}/>`.tree())).toBe(
            '<message to="juliet@capulet.lit" xmlns="jabber:client"/>',
        );

        // Markup inside the quotes is left as it stands too. An attribute value
        // holds none, so unsafeXML there says the text is already written the
        // way it is meant to be read.
        expect(
            stx`<message xmlns="jabber:client" id="${Strophe.Stanza.unsafeXML('a&#xA;b')}"/>`
                .tree()
                .getAttribute('id'),
        ).toBe('a\nb');
    });

    it('refuses a character XML cannot represent in an attribute, as it does in content', () => {
        expect(() => stx`<message xmlns="jabber:client" id="${'a' + String.fromCharCode(0) + 'b'}"/>`.tree()).toThrow(
            /An interpolated value holds U\+0000 at index 1/,
        );
    });

    it('never leaks the placeholder it stands values in through', () => {
        const stanza = stx`<message xmlns="jabber:client"><body>${['a', '\n', 'b']}</body></message>`;
        expect(stanza.toString()).not.toContain('strophe-slot');
        expect(Strophe.serialize(stanza.tree())).not.toContain('strophe-slot');

        // A value is put into the tree rather than into the text which is
        // parsed, so it can hold anything, including the placeholder itself.
        const slot = stx`<message xmlns="jabber:client"><body>${'<?strophe-slot 0?>'}</body></message>`;
        expect(Strophe.serialize(slot.tree())).toBe(
            '<message xmlns="jabber:client"><body>&lt;?strophe-slot 0?&gt;</body></message>',
        );
    });

    it('builds a fragment which carries a processing instruction of its own', () => {
        // A value's nodes are inserted where its slot was and are never walked
        // again, so a processing instruction among them is content like any
        // other node, whatever it happens to be called.
        const stanza = stx`<message xmlns="jabber:client"><c>${Strophe.Stanza.unsafeXML(
            '<?strophe-slot-0 0?><p>hi</p>',
        )}</c></message>`;

        // Strophe.serialize has no case for a processing instruction, so read
        // the node itself to see that it survived rather than being consumed.
        const pi = Array.from(stanza.tree().getElementsByTagName('c')[0].childNodes).find(
            (n) => n.nodeType === Strophe.ElementType.PROCESSING_INSTRUCTION,
        );
        expect((pi as ProcessingInstruction)?.target).toBe('strophe-slot-0');
        expect(Strophe.serialize(stanza.tree())).toBe('<message xmlns="jabber:client"><c><p>hi</p></c></message>');
    });

    it('keeps the whitespace of a subtree marked xml:space="preserve"', () => {
        const stanza = stx`
            <message xmlns="jabber:client">
                <content xml:space="preserve">
                    <em>a</em> <em>b</em>
                </content>
            </message>`;

        expect(Strophe.serialize(stanza.tree())).toBe(
            '<message xmlns="jabber:client">' +
                '<content xml:space="preserve">\n                    <em>a</em> <em>b</em>\n                </content>' +
                '</message>',
        );

        // Hand-written XML gets the same treatment, and a descendant may opt
        // back out again (XML 1.0 § 2.10).
        const el = Strophe.Stanza.toElement(
            '<x xmlns="ns"><y xml:space="preserve"><a/>\n<b/></y><z>\n  <q/>\n</z></x>',
        );
        expect(Strophe.serialize(el)).toBe('<x xmlns="ns"><y xml:space="preserve"><a/>\n<b/></y><z><q/></z></x>');

        const nested = Strophe.Stanza.toElement(
            '<x xmlns="ns" xml:space="preserve">\n<y xml:space="default">\n  <b/>\n</y>\n</x>',
        );
        expect(Strophe.serialize(nested)).toBe(
            '<x xml:space="preserve" xmlns="ns">\n<y xml:space="default"><b/></y>\n</x>',
        );
    });

    /**
     * The whitespace which came from a value ends up in the same text node as
     * the indentation written around it, so keeping the value's whitespace has
     * to mean keeping only that and not the whole node.
     */
    describe('when the template around it is indented', () => {
        const message = (parts: unknown[]) => stx`
            <message xmlns="jabber:client">
                <div xmlns="http://www.w3.org/1999/xhtml">
                    ${parts as string[]}
                </div>
            </message>`;

        const wrap = (content: string) =>
            `<message xmlns="jabber:client"><div xmlns="http://www.w3.org/1999/xhtml">${content}</div></message>`;

        it('keeps a leading interpolated line break without the indentation next to it', () => {
            expect(Strophe.serialize(message(['\n', a('@bob')]).tree())).toBe(wrap('\n<a href="xmpp:x@y">@bob</a>'));
        });

        it('keeps a trailing interpolated line break without the indentation next to it', () => {
            expect(Strophe.serialize(message([a('@bob'), '\n']).tree())).toBe(wrap('<a href="xmpp:x@y">@bob</a>\n'));
        });

        it('keeps an interpolated line break written on a line of its own', () => {
            const stanza = stx`
                <div xmlns="jabber:client">
                    ${a('one')}
                    ${'\n'}
                    ${a('two')}
                </div>`;

            expect(Strophe.serialize(stanza.tree())).toBe(
                '<div xmlns="jabber:client"><a href="xmpp:x@y">one</a>\n<a href="xmpp:x@y">two</a></div>',
            );
        });

        it('still keeps a whole text node which has content in it', () => {
            const stanza = stx`
                <message xmlns="jabber:client">
                    <content>
                        ${['x', '\n', 'y'] as string[]}
                    </content>
                </message>`;

            expect(Strophe.serialize(stanza.tree())).toBe(
                '<message xmlns="jabber:client"><content>' +
                    '\n                        x\ny\n                    ' +
                    '</content></message>',
            );
        });

        it('leaves a preserved subtree alone', () => {
            const preserved = stx`
                <message xmlns="jabber:client">
                    <content xml:space="preserve">
                        ${['\n', a('@bob')] as string[]}
                    </content>
                </message>`;

            expect(Strophe.serialize(preserved.tree())).toBe(
                '<message xmlns="jabber:client"><content xml:space="preserve">' +
                    '\n                        \n<a href="xmpp:x@y">@bob</a>\n                    ' +
                    '</content></message>',
            );

            const xhtml = stx`
                <message xmlns="jabber:client">
                    <html xmlns="http://jabber.org/protocol/xhtml-im">
                        <body xmlns="http://www.w3.org/1999/xhtml">
                            ${['\n', 'hello'] as string[]}
                        </body>
                    </html>
                </message>`;

            expect(Strophe.serialize(xhtml.tree())).toBe(
                '<message xmlns="jabber:client"><html xmlns="http://jabber.org/protocol/xhtml-im">' +
                    '<body xmlns="http://www.w3.org/1999/xhtml">' +
                    '\n                            \nhello\n                        ' +
                    '</body></html></message>',
            );
        });

        it('tells an XHTML-IM body apart from one which only shares the name', () => {
            // The space between the two <em>s separates words, which is what
            // the exemption is for and why it reads the namespace.
            const im = stx`
                <message xmlns="jabber:client">
                    <html xmlns="http://jabber.org/protocol/xhtml-im">
                        <body xmlns="http://www.w3.org/1999/xhtml"><em>a</em> <em>b</em></body>
                    </html>
                </message>`;

            expect(Strophe.serialize(im.tree())).toContain('<em>a</em> <em>b</em>');

            // A <body> which is not that one is laid out by the template like
            // anything else, so its indentation goes.
            const plain = stx`
                <message xmlns="jabber:client">
                    <body>
                        <em>a</em> <em>b</em>
                    </body>
                </message>`;

            expect(Strophe.serialize(plain.tree())).toBe(
                '<message xmlns="jabber:client"><body><em>a</em><em>b</em></body></message>',
            );
        });
    });

    it('accepts a whitespace-only value which lands inside a tag', () => {
        // There is nothing to stand in for there, and a placeholder written
        // inside a tag would be read as the start of an attribute name.
        expect(Strophe.serialize(stx`<message xmlns="jabber:client"${' '}to="juliet@capulet.lit"/>`.tree())).toBe(
            '<message to="juliet@capulet.lit" xmlns="jabber:client"/>',
        );

        expect(Strophe.serialize(stx`<message xmlns="jabber:client" id="x${' '}"/>`.tree())).toBe(
            '<message id="x " xmlns="jabber:client"/>',
        );

        // A `>` inside an attribute value doesn't end the tag.
        expect(
            Strophe.serialize(stx`<message xmlns="jabber:client" id="a>b"${' '}to="x"><body>c</body></message>`.tree()),
        ).toBe('<message id="a&gt;b" to="x" xmlns="jabber:client"><body>c</body></message>');
    });

    it('splices a fragment in whole, including the whitespace at its ends', () => {
        const spliced = (xml: string) =>
            Strophe.serialize(
                stx`<message xmlns="jabber:client"><c>${Strophe.Stanza.unsafeXML(xml)}</c></message>`.tree(),
            );

        expect(spliced('  <a/>')).toBe('<message xmlns="jabber:client"><c>  <a/></c></message>');
        expect(spliced('<a/>  ')).toBe('<message xmlns="jabber:client"><c><a/>  </c></message>');
        expect(spliced('\n  <a/>\n')).toBe('<message xmlns="jabber:client"><c>\n  <a/>\n</c></message>');
    });

    it('confines a fragment to the element it was interpolated into', () => {
        // The fragment is parsed on its own rather than concatenated into the
        // template, so it cannot close an element the template opened. This
        // used to yield an <evil/> sibling of <body> which the template never
        // wrote; it is now a parser error.
        const escape = stx`<message xmlns="jabber:client"><body>${Strophe.Stanza.unsafeXML(
            '</body><evil/><body>',
        )}</body></message>`;

        let error: Error | undefined;
        try {
            escape.tree();
        } catch (e) {
            error = e as Error;
        }
        expect(error?.message).toMatch(/Parser Error/);
        expect(error?.message).toContain('</body><evil/><body>');
        expect(error?.message).not.toContain('strophe-fragment');

        // A fragment which stays inside the element it landed in is fine.
        const wellformed = stx`<message xmlns="jabber:client"><body>${Strophe.Stanza.unsafeXML(
            '<b>hi</b>',
        )}</body></message>`;
        expect(Strophe.serialize(wellformed.tree())).toBe(
            '<message xmlns="jabber:client"><body><b>hi</b></body></message>',
        );
    });

    it('gives an interpolated element the namespace of where it lands', () => {
        // The value is parsed where it is spliced, so it inherits the
        // declarations in scope there rather than landing in no namespace.
        const stanza = stx`<title><div xmlns="http://www.w3.org/1999/xhtml">${[a('@bob')] as string[]}</div></title>`;
        expect(stanza.tree().getElementsByTagName('a')[0].namespaceURI).toBe('http://www.w3.org/1999/xhtml');

        const spliced = stx`<title><div xmlns="http://www.w3.org/1999/xhtml">${Strophe.Stanza.unsafeXML(
            '<a href="x">@bob</a>',
        )}</div></title>`;
        expect(spliced.tree().getElementsByTagName('a')[0].namespaceURI).toBe('http://www.w3.org/1999/xhtml');

        // Prefixes too, and the nearest declaration wins.
        const prefixed = stx`<x xmlns:p="urn:outer"><c xmlns:p="urn:inner">${Strophe.Stanza.unsafeXML(
            '<p:y/>',
        )}</c></x>`;
        expect(prefixed.tree().getElementsByTagName('p:y')[0].namespaceURI).toBe('urn:inner');
    });

    it('leaves a processing instruction written in the template alone', () => {
        // Each expansion stands its values in a target of its own, so a
        // processing instruction written out here is never one of them and is
        // passed over rather than substituted.
        const stanza = stx`<message xmlns="jabber:client"><c><?strophe-slot 0?>${'VALUE'}</c></message>`;
        expect(Strophe.serialize(stanza.tree())).toBe('<message xmlns="jabber:client"><c>VALUE</c></message>');

        const pi = Array.from(stanza.tree().getElementsByTagName('c')[0].childNodes).find((n) => n.nodeType === 7);
        expect((pi as ProcessingInstruction).target).toBe('strophe-slot');

        // Including one which guesses at the numbering.
        const guess = stx`<message xmlns="jabber:client"><c><?strophe-slot-0 0?><?strophe-slot-1 0?>${'VALUE'}</c></message>`;
        const targets = Array.from(guess.tree().getElementsByTagName('c')[0].childNodes)
            .filter((n) => n.nodeType === 7)
            .map((n) => (n as ProcessingInstruction).target);
        expect(targets).toEqual(['strophe-slot-0', 'strophe-slot-1']);
        expect(Strophe.serialize(guess.tree())).toBe('<message xmlns="jabber:client"><c>VALUE</c></message>');
    });

    it('leaves a slot written inside a CDATA section alone', () => {
        // The characters are content there, not a processing instruction.
        const stanza = stx`<message xmlns="jabber:client"><c><![CDATA[<?strophe-slot 0?>]]>${'VALUE'}</c></message>`;
        expect(Strophe.serialize(stanza.tree())).toBe(
            '<message xmlns="jabber:client"><c><![CDATA[<?strophe-slot 0?>]]>VALUE</c></message>',
        );
    });

    it('leaves a slot written inside a comment alone', () => {
        const stanza = stx`<message xmlns="jabber:client"><c><!-- <?strophe-slot 0?> -->${'VALUE'}</c></message>`;

        // Strophe.serialize drops comments, so read the node itself.
        const comment = Array.from(stanza.tree().getElementsByTagName('c')[0].childNodes).find((n) => n.nodeType === 8);
        expect(comment?.nodeValue).toBe(' <?strophe-slot 0?> ');
        expect(Strophe.serialize(stanza.tree())).toBe('<message xmlns="jabber:client"><c>VALUE</c></message>');
    });

    it('still places a value which follows a comment or a CDATA section', () => {
        // Where a value lands is read off the template text, so the cursor has
        // to come back out of a comment and a CDATA section correctly to know
        // that what follows them is element content.
        const stanza = stx`<message xmlns="jabber:client"><c><!-- <?strophe-slot 9?> --><![CDATA[<?strophe-slot 9?>]]><?strophe-slot 9?>${['a', '\n', 'b']}</c></message>`;
        const children = Array.from(stanza.tree().getElementsByTagName('c')[0].childNodes);

        expect(children.find((n) => n.nodeType === 8)?.nodeValue).toBe(' <?strophe-slot 9?> ');
        expect(children.find((n) => n.nodeType === 4)?.nodeValue).toBe('<?strophe-slot 9?>');
        expect((children.find((n) => n.nodeType === 7) as ProcessingInstruction)?.target).toBe('strophe-slot');

        // The value became nodes, so its line break survived.
        expect(Strophe.serialize(stanza.tree())).toBe(
            '<message xmlns="jabber:client"><c><![CDATA[<?strophe-slot 9?>]]>a\nb</c></message>',
        );
    });

    it('gives each expansion a slot of its own', () => {
        // Two stanzas built from the same template must not share a target,
        // or a stray processing instruction could address the wrong one.
        const build = () => stx`<message xmlns="jabber:client"><c>${'V'}</c></message>`.tree();
        expect(Strophe.serialize(build())).toBe(Strophe.serialize(build()));
    });
});

describe('A value which is not inside an element', () => {
    // A value only becomes nodes if there is an element for those nodes to
    // land in. At document level the value is the stanza itself rather than
    // content inside one, so it is written into the text and parsed as the
    // markup it is.

    it('is the whole stanza when the template is nothing else', () => {
        expect(Strophe.serialize(stx`${$msg({ to: 'juliet@capulet.lit' })}`.tree())).toBe(
            '<message to="juliet@capulet.lit" xmlns="jabber:client"/>',
        );

        const raw = '<message xmlns="jabber:client"><body>Hello</body></message>';
        expect(Strophe.serialize(stx`${Strophe.Stanza.unsafeXML(raw)}`.tree())).toBe(raw);

        expect(Strophe.serialize(stx`${stx`<presence xmlns="jabber:client"/>`}`.tree())).toBe(
            '<presence xmlns="jabber:client"/>',
        );
    });

    it('is still the whole stanza with the template indented around it', () => {
        const stanza = stx`
            ${$msg({ to: 'juliet@capulet.lit' })}
        `;
        expect(Strophe.serialize(stanza.tree())).toBe('<message to="juliet@capulet.lit" xmlns="jabber:client"/>');
    });

    it('is pretty-printed markup which gets stripped like any other template', () => {
        // It is markup rather than content, so its indentation is formatting.
        const raw = '<message xmlns="jabber:client">\n    <body>Hello</body>\n</message>';
        expect(Strophe.serialize(stx`${Strophe.Stanza.unsafeXML(raw)}`.tree())).toBe(
            '<message xmlns="jabber:client"><body>Hello</body></message>',
        );
    });

    it('is not silently dropped when it sits beside the root element', () => {
        // Two roots is not a document, and saying so beats discarding the value.
        expect(() => stx`<message xmlns="jabber:client"/>${Strophe.Stanza.unsafeXML('<x/>')}`.tree()).toThrow(
            /Parser Error/,
        );
        expect(() => stx`${Strophe.Stanza.unsafeXML('<x/>')}<message xmlns="jabber:client"/>`.tree()).toThrow(
            /Parser Error/,
        );
    });

    it('still becomes nodes as soon as an element encloses it', () => {
        // The enclosing element is what the fix above keys on, so check that
        // the depth it tracks comes back down again: a self-closing tag and a
        // closing tag both leave the value after them inside <message>.
        const stanza = stx`<message xmlns="jabber:client"><delay/><subject>s</subject><body>${['a', '\n', 'b']}</body></message>`;
        expect(Strophe.serialize(stanza.tree())).toBe(
            '<message xmlns="jabber:client"><delay/><subject>s</subject><body>a\nb</body></message>',
        );

        // A processing instruction and a comment are not elements and must not
        // be counted as enclosing anything.
        const pi = stx`<message xmlns="jabber:client"><?pi data?><!-- c --><body>${['a', '\n', 'b']}</body></message>`;
        expect(Strophe.serialize(pi.tree())).toBe('<message xmlns="jabber:client"><body>a\nb</body></message>');

        // A `/` which is part of an attribute value does not close the tag.
        const attr = stx`<message xmlns="jabber:client" id="a/"><body>${['a', '\n', 'b']}</body></message>`;
        expect(Strophe.serialize(attr.tree())).toBe(
            '<message id="a/" xmlns="jabber:client"><body>a\nb</body></message>',
        );
    });
});

describe('A value which is written into the template text rather than stood in for', () => {
    // Where a value lands is read off the template text by a cursor which runs
    // ahead of the parser. A value in a tag, in a comment, in a CDATA section
    // or at document level is written into that text verbatim, so it can open
    // and close tags exactly as a static part of the template can. The cursor
    // has to read what it writes, or the two disagree about where the next
    // value lands and a value stops being stood in for at all.
    const XHTML = 'http://www.w3.org/1999/xhtml';

    it('keeps the cursor in step when a value closes a tag the template opened', () => {
        const spliced = Strophe.Stanza.unsafeXML(`to="juliet@capulet.lit"><div xmlns="${XHTML}">`);
        const stanza = stx`<message xmlns="jabber:client" ${spliced}<b/>${'\n'}<i/></div></message>`;

        // The interpolated line break survives, exactly as it does when the
        // same stanza is written out without splicing the tags in.
        expect(Strophe.serialize(stanza.tree())).toBe(
            '<message to="juliet@capulet.lit" xmlns="jabber:client">' +
                `<div xmlns="${XHTML}"><b/>\n<i/></div>` +
                '</message>',
        );

        const written = stx`<message xmlns="jabber:client" to="juliet@capulet.lit"><div xmlns="${XHTML}"><b/>${'\n'}<i/></div></message>`;
        expect(Strophe.serialize(stanza.tree())).toBe(Strophe.serialize(written.tree()));
    });

    it('counts the elements a spliced-in value opens and closes', () => {
        // Several self-closing tags after the splice would drive the depth the
        // cursor tracks to zero, and a value at zero is read as the stanza
        // itself rather than as content inside one.
        const spliced = Strophe.Stanza.unsafeXML(`to="x"><div xmlns="${XHTML}">`);
        const stanza = stx`<message xmlns="jabber:client" ${spliced}<b/><i/><em/>${'\n'}<u/></div></message>`;

        expect(Strophe.serialize(stanza.tree())).toBe(
            '<message to="x" xmlns="jabber:client">' +
                `<div xmlns="${XHTML}"><b/><i/><em/>\n<u/></div>` +
                '</message>',
        );
    });

    it('reads a quote which a value opens and a later static part closes', () => {
        const stanza = stx`<message xmlns="jabber:client" ${Strophe.Stanza.unsafeXML('id="a>b')}"><body>${['x', '\n', 'y']}</body></message>`;
        expect(Strophe.serialize(stanza.tree())).toBe(
            '<message id="a&gt;b" xmlns="jabber:client"><body>x\ny</body></message>',
        );
    });

    it('lets a value at document level go on spanning the stanza', () => {
        // The one place the cursor deliberately does not read what is written.
        // A stanza may be opened by one value and closed by another, so the
        // cursor must not follow the first one inside the element it opened,
        // or the second would be stood in for instead of written out.
        const open = Strophe.Stanza.unsafeXML('<message xmlns="jabber:client">');
        const close = Strophe.Stanza.unsafeXML('</message>');

        expect(Strophe.serialize(stx`${open}<body/>${close}`.tree())).toBe(
            '<message xmlns="jabber:client"><body/></message>',
        );

        // The template's own tags are still counted, so a value written
        // between them is content and is stood in for as usual.
        expect(Strophe.serialize(stx`${open}<body>${['a', '\n', 'b']}</body>${close}`.tree())).toBe(
            '<message xmlns="jabber:client"><body>a\nb</body></message>',
        );
    });

    it('is the pattern converse.js uses to add an attribute conditionally', () => {
        const attr = (name: string, value: string) =>
            value ? Strophe.Stanza.unsafeXML(`${name}="${Strophe.xmlescape(value)}"`) : '';

        const present = stx`<presence ${attr('to', 'lounge@muc.lit/romeo')} ${attr('type', 'unavailable')} xmlns="jabber:client">
                <status>${'gone'}</status>
            </presence>`;
        expect(Strophe.serialize(present.tree())).toBe(
            '<presence to="lounge@muc.lit/romeo" type="unavailable" xmlns="jabber:client">' +
                '<status>gone</status></presence>',
        );

        const absent = stx`<presence ${attr('to', '')} ${attr('type', '')} xmlns="jabber:client">
                <status>${'gone'}</status>
            </presence>`;
        expect(Strophe.serialize(absent.tree())).toBe(
            '<presence xmlns="jabber:client"><status>gone</status></presence>',
        );
    });

    it('is the pattern converse.js uses to name an element', () => {
        // No placeholder can stand in an element name or in an attribute name,
        // since neither position accepts one that XML will parse. Both are
        // written into the text, and the cursor has to read them.
        const stanza = stx`<message xmlns="jabber:client">
                <${Strophe.Stanza.unsafeXML('composing')} xmlns="http://jabber.org/protocol/chatstates"/>
                <body>${['a', '\n', 'b']}</body>
            </message>`;

        expect(Strophe.serialize(stanza.tree())).toBe(
            '<message xmlns="jabber:client">' +
                '<composing xmlns="http://jabber.org/protocol/chatstates"/>' +
                '<body>a\nb</body></message>',
        );
    });

    it('never leaves a value unsubstituted', () => {
        // Strophe.serialize has no case for a processing instruction, so a slot
        // which outlived substitution would go out as nothing at all. Building
        // a tree which still holds one has to fail loudly instead.
        const stanza = stx`<message xmlns="jabber:client"><body>${['a', '\n', 'b']}</body></message>`;
        const tree = stanza.tree();

        const slot = Array.from(tree.getElementsByTagName('body')[0].childNodes).find(
            (n) => n.nodeType === Strophe.ElementType.PROCESSING_INSTRUCTION
        );
        expect(slot).toBeUndefined();
        expect(Strophe.serialize(tree)).toBe('<message xmlns="jabber:client"><body>a\nb</body></message>');
    });

    it('says so when it leaves a value inside a comment which a value opened', () => {
        // The cursor deliberately does not read a value at document level, so
        // it still counts the template's own <body> as element content while
        // the parser is inside the comment this one opened. The slot written
        // for the value in that <body> is character data there rather than a
        // node, so nothing substitutes it and the value would go out as
        // nothing at all. 5.0.0 dropped it in silence; say so instead.
        expect(() =>
            stx`${Strophe.Stanza.unsafeXML('<message xmlns="jabber:client"><!--')}<body>${'SECRET'}</body>${Strophe.Stanza.unsafeXML(
                '--></message>',
            )}`.tree(),
        ).toThrow(/never made it into the stanza/);
    });

    it('says so when it leaves a value inside a CDATA section which a value opened', () => {
        // The same, except that the slot is not even dropped: it goes out on
        // the wire as the placeholder's own text.
        expect(() =>
            stx`${Strophe.Stanza.unsafeXML('<message xmlns="jabber:client"><c><![CDATA[')}<body>${'SECRET'}</body>${Strophe.Stanza.unsafeXML(
                ']]></c></message>',
            )}`.tree(),
        ).toThrow(/never made it into the stanza/);
    });
});

describe('A character an interpolated value cannot carry', () => {
    // Written with fromCharCode so the source of this file stays free of the
    // control characters under test.
    const ch = (code: number) => String.fromCharCode(code);
    const body = (value: string) => stx`<message xmlns="jabber:client"><body>${value}</body></message>`;
    const textOf = (stanza: ReturnType<typeof stx>) => stanza.tree().getElementsByTagName('body')[0].textContent;

    it('normalises the line endings the parser used to normalise', () => {
        // XML 1.0 § 2.11. Without this the sender keeps the CRLF while every
        // recipient's parser turns it into a line feed, so the two disagree
        // about a message they both received whole.
        expect(textOf(body('a' + ch(13) + ch(10) + 'b'))).toBe('a\nb');
        expect(textOf(body('a' + ch(13) + 'b'))).toBe('a\nb');
        expect(textOf(body('a' + ch(10) + 'b'))).toBe('a\nb');

        // It reaches the wire the same way round.
        expect(Strophe.serialize(body('a' + ch(13) + ch(10) + 'b').tree())).toBe(
            '<message xmlns="jabber:client"><body>a\nb</body></message>',
        );
    });

    it('refuses a character XML cannot represent', () => {
        // No escape stands in for these, so a stanza carrying one is
        // unsendable: the server answers not-well-formed and drops the stream.
        // Failing here costs the one message instead of the connection.
        expect(() => body('a' + ch(0) + 'b').tree()).toThrow(/U\+0000 at index 1/);
        expect(() => body(ch(11)).tree()).toThrow(/U\+000B at index 0/);
        expect(() => body(ch(12)).tree()).toThrow(/U\+000C at index 0/);
        expect(() => body('ab' + ch(27)).tree()).toThrow(/U\+001B at index 2/);
        expect(() => body(ch(0xfffe)).tree()).toThrow(/U\+FFFE at index 0/);

        // A surrogate on its own is not a character at all.
        expect(() => body('a' + ch(0xd800) + 'b').tree()).toThrow(/U\+D800 at index 1/);
    });

    it('carries every character XML does allow', () => {
        // Tab and line feed are the two control characters that are legal, and
        // an astral character is one code point rather than the surrogate pair
        // it is stored as.
        expect(textOf(body('a' + ch(9) + 'b'))).toBe('a\tb');
        expect(textOf(body('a' + ch(10) + 'b'))).toBe('a\nb');
        expect(textOf(body('hello ' + String.fromCodePoint(0x1f600)))).toBe('hello ' + String.fromCodePoint(0x1f600));
        expect(textOf(body(ch(0xe000) + ch(0xfffd)))).toBe(ch(0xe000) + ch(0xfffd));
    });

    it('checks a value wherever in the stanza it was interpolated', () => {
        expect(() => stx`<message xmlns="jabber:client"><subject>${ch(0)}</subject></message>`.tree()).toThrow(
            /XML cannot represent/,
        );

        expect(() => stx`<message xmlns="jabber:client"><body>${['ok', ch(0)]}</body></message>`.tree()).toThrow(
            /XML cannot represent/,
        );
    });
});

describe('The scope an interpolated fragment is parsed in', () => {
    const frag = (xml: string) => Strophe.Stanza.unsafeXML(xml);

    it('is the element the value landed under, worked out once for all of them', () => {
        // The declarations are gathered once per element rather than once per
        // value, so two values under one element must both still get them and
        // an element with a scope of its own must not be handed its sibling's.
        const tree = stx`<x xmlns:p="urn:outer">
            <a xmlns:p="urn:one">${frag('<p:first/>')}${frag('<p:second/>')}</a>
            <b xmlns:p="urn:two">${frag('<p:third/>')}</b>
            <c>${frag('<p:fourth/>')}</c>
        </x>`.tree();

        const ns = (name: string) => tree.getElementsByTagName(name)[0].namespaceURI;
        expect(ns('p:first')).toBe('urn:one');
        expect(ns('p:second')).toBe('urn:one');
        expect(ns('p:third')).toBe('urn:two');
        expect(ns('p:fourth')).toBe('urn:outer');
    });

    it('reaches an element which declares nothing of its own', () => {
        const tree = stx`<x xmlns="urn:outer"><deep><deeper>${frag('<y/>')}</deeper></deep></x>`.tree();
        expect(tree.getElementsByTagName('y')[0].namespaceURI).toBe('urn:outer');
    });

    it('moves the fragment in rather than copying it', () => {
        // The fragment's own document is dropped as soon as it has been read,
        // so the nodes are moved. What matters to a caller is that they end up
        // belonging to the stanza.
        const tree = stx`<message xmlns="jabber:client"><c>${frag('<b><i/></b>')}</c></message>`.tree();
        const b = tree.getElementsByTagName('b')[0];
        expect(b.ownerDocument).toBe(tree.ownerDocument);
        expect(b.getElementsByTagName('i')[0].ownerDocument).toBe(tree.ownerDocument);
        expect(Strophe.serialize(tree)).toBe('<message xmlns="jabber:client"><c><b><i/></b></c></message>');
    });
});

describe('A nested template which does not end where it began', () => {
    // The cursor reads every run as it is written, so nothing may be cut from
    // a nested expansion afterwards: it would leave the cursor holding a state
    // for text which is no longer there.

    it('keeps the space between a tag it opened and what the outer template writes', () => {
        // The trim used to take this space, gluing the element's name to the
        // attribute and leaving `<ahref="x"/>` for the parser to make of.
        const open = stx`<a `;
        expect(Strophe.serialize(stx`<message xmlns="jabber:client">${open}href="x"/></message>`.tree())).toBe(
            '<message xmlns="jabber:client"><a href="x"/></message>',
        );

        const oneAttr = stx`<a href="x" `;
        expect(Strophe.serialize(stx`<message xmlns="jabber:client">${oneAttr}id="y"/></message>`.tree())).toBe(
            '<message xmlns="jabber:client"><a href="x" id="y"/></message>',
        );
    });

    it('leaves the cursor counting the elements the text actually opened', () => {
        // A nested template ending in a tag leaves the cursor inside it, and
        // the outer template closes it. Trimming the space before the `>` used
        // to leave the cursor believing the element was still open, which put
        // every later value on the wrong side of the document-level rule.
        const open = stx`<c `;
        const stanza = stx`<message xmlns="jabber:client">${open}id="1">${'text'}</c></message>`;
        expect(Strophe.serialize(stanza.tree())).toBe('<message xmlns="jabber:client"><c id="1">text</c></message>');
    });

    it('still lets the ends of an indented nested template go', () => {
        // Nothing is lost by leaving the whitespace in: between tags it is
        // formatting, and strip takes it as it takes any other.
        const item = (id: number) => stx`
            <item id="${id}"/>`;
        expect(Strophe.serialize(stx`<items xmlns="jabber:client">${item(1)}${item(2)}</items>`.tree())).toBe(
            '<items xmlns="jabber:client"><item id="1"/><item id="2"/></items>',
        );
    });

    it('keeps the whitespace at its ends where that whitespace is content', () => {
        // Which is the judgement strip makes everywhere else. The trim could
        // not tell the two apart and took this as readily as the indentation.
        const spaced = stx` hello `;
        expect(
            Strophe.serialize(stx`<message xmlns="jabber:client"><body>${spaced}world</body></message>`.tree()),
        ).toBe('<message xmlns="jabber:client"><body> hello world</body></message>');
    });
});
