import { Strophe } from '../dist/strophe.node.esm.js';
import { XHR } from './helpers.js';
import { describe, it, expect } from 'vitest';

describe('Utility Methods', () => {
    it('xvalidTag', () => {
        // Tags must always be lower case (as per XHMTL)
        expect(Strophe.XHTML.validTag('BODY')).toBe(false);
        expect(Strophe.XHTML.validTag('A')).toBe(false);
        expect(Strophe.XHTML.validTag('Img')).toBe(false);
        expect(Strophe.XHTML.validTag('IMg')).toBe(false);

        // Check all tags mentioned in XEP-0071
        expect(Strophe.XHTML.validTag('a')).toBe(true);
        expect(Strophe.XHTML.validTag('blockquote')).toBe(true);
        expect(Strophe.XHTML.validTag('body')).toBe(true);
        expect(Strophe.XHTML.validTag('br')).toBe(true);
        expect(Strophe.XHTML.validTag('cite')).toBe(true);
        expect(Strophe.XHTML.validTag('em')).toBe(true);
        expect(Strophe.XHTML.validTag('img')).toBe(true);
        expect(Strophe.XHTML.validTag('li')).toBe(true);
        expect(Strophe.XHTML.validTag('ol')).toBe(true);
        expect(Strophe.XHTML.validTag('p')).toBe(true);
        expect(Strophe.XHTML.validTag('span')).toBe(true);
        expect(Strophe.XHTML.validTag('strong')).toBe(true);
        expect(Strophe.XHTML.validTag('ul')).toBe(true);

        // Check tags not mentioned in XEP-0071
        expect(Strophe.XHTML.validTag('script')).toBe(false);
        expect(Strophe.XHTML.validTag('blink')).toBe(false);
        expect(Strophe.XHTML.validTag('article')).toBe(false);
    });

    it('_getRequestStatus', () => {
        const req = new Strophe.Request('' as any, function () {}, 0);
        req.xhr = new XHR(200, 4) as unknown as XMLHttpRequest;
        expect(Strophe.Bosh._getRequestStatus(req)).toBe(200);
        req.xhr = new XHR(500, 4) as unknown as XMLHttpRequest;
        expect(Strophe.Bosh._getRequestStatus(req)).toBe(500);

        req.xhr = new XHR(200, 3) as unknown as XMLHttpRequest;
        expect(Strophe.Bosh._getRequestStatus(req)).toBe(0);

        req.xhr = new XHR(undefined, 4) as unknown as XMLHttpRequest;
        expect(Strophe.Bosh._getRequestStatus(req, -1)).toBe(-1);
        expect(Strophe.Bosh._getRequestStatus(req, 0)).toBe(0);
    });
});
