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
});
