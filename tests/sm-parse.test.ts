import { peekElement } from '../src/stream-management/parse';
import { describe, it, expect } from 'vitest';

describe('peekElement', () => {
    it('parses stanzas with attributes and children', () => {
        const frame =
            "<message from='juliet@example.net/balcony' to=\"romeo@example.net\" type='chat'><body>hi</body></message>";
        const view = peekElement(frame);
        expect(view.name).toBe('message');
        expect(view.attrs).toEqual({
            from: 'juliet@example.net/balcony',
            to: 'romeo@example.net',
            type: 'chat',
        });
        expect(view.serialized).toBe(frame);
    });

    it('parses real SM nonza frames', () => {
        // verbatim Prosody frames
        expect(peekElement("<enabled xmlns='urn:xmpp:sm:3' max='600' resume='true' id='uaojrU5jIfN7'/>")).toMatchObject(
            { name: 'enabled', attrs: { xmlns: 'urn:xmpp:sm:3', max: '600', resume: 'true', id: 'uaojrU5jIfN7' } },
        );
        expect(peekElement("<a xmlns='urn:xmpp:sm:3' h='1'/>")).toMatchObject({ name: 'a', attrs: { h: '1' } });
        expect(peekElement("<r xmlns='urn:xmpp:sm:3'/>").name).toBe('r');
        expect(peekElement("<resumed xmlns='urn:xmpp:sm:3' h='1' previd='uaojrU5jIfN7'/>").attrs.previd).toBe(
            'uaojrU5jIfN7',
        );
    });

    it('tolerates leading whitespace and newlines between attributes', () => {
        const view = peekElement('\n  <presence\n     from="a@b/c"\n     type="unavailable"/>');
        expect(view.name).toBe('presence');
        expect(view.attrs).toEqual({ from: 'a@b/c', type: 'unavailable' });
    });

    it('strips namespace prefixes from the tag name', () => {
        const view = peekElement(
            "<stream:features xmlns:stream='http://etherx.jabber.org/streams'><bind/></stream:features>",
        );
        expect(view.name).toBe('features');
    });

    it('unescapes attribute values', () => {
        const view = peekElement('<resume xmlns="urn:xmpp:sm:3" h="1" previd="ab&quot;&amp;&lt;c"/>');
        expect(view.attrs.previd).toBe('ab"&<c');
    });

    it('parses frames without attributes', () => {
        expect(peekElement('<iq><query/></iq>')).toMatchObject({ name: 'iq', attrs: {} });
    });

    it('returns null for junk', () => {
        expect(peekElement('')).toBeNull();
        expect(peekElement('plain text')).toBeNull();
        expect(peekElement('<!-- comment -->')).toBeNull();
        expect(peekElement('<?xml version="1.0"?>')).toBeNull();
    });
});
