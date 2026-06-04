import { Strophe, type Builder, type Stanza } from '../dist/strophe.node.esm.js';

const _sessionStorage: Record<string, string> = {};

if (!globalThis.sessionStorage) {
    Object.defineProperty(globalThis, 'sessionStorage', {
        value: {
            setItem: (key: string, value: string) => (_sessionStorage[key] = value),
            getItem: (key: string) => _sessionStorage[key] ?? null,
            removeItem: (key: string) => delete _sessionStorage[key],
        },
    });
}

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

function stripEmptyTextNodes(element: Element): Element {
    const childNodes = Array.from(element.childNodes ?? []);
    childNodes.forEach((node) => {
        if (node.nodeType === TEXT_NODE && !node.nodeValue?.trim()) {
            element.removeChild(node);
        } else if (node.nodeType === ELEMENT_NODE) {
            stripEmptyTextNodes(node as Element);
        }
    });
    return element;
}

/**
 * Given two XML or HTML elements, determine if they're equal.
 */
export function isEqualNode(actual: Builder | Stanza, expected: Builder | Stanza): boolean {
    const actualEl = stripEmptyTextNodes(actual.tree());
    const expectedEl = stripEmptyTextNodes(expected.tree());

    let isEqual = actualEl.isEqualNode(expectedEl);

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
        const serializer = new XMLSerializer();
        const { xmlHtmlNode } = Strophe;
        const actual_string = serializer.serializeToString(actualEl);
        const expected_string = serializer.serializeToString(expectedEl);
        isEqual =
            actual_string === expected_string || xmlHtmlNode(actual_string).isEqualNode(xmlHtmlNode(expected_string));
    }
    return isEqual;
}

/** Mock XMLHttpRequest for tests that need to inspect BOSH request state. */
export class XHR {
    status: number | undefined;
    readyState: number | undefined;
    responseText: string | undefined;
    getAllResponseHeaders = (): null => null;

    constructor(status?: number, readyState?: number, responseText?: string) {
        this.status = status;
        this.readyState = readyState;
        this.responseText = responseText;
    }
}

export class SASLFoo extends Strophe.SASLMechanism {
    constructor() {
        super('FOO', false, 10);
    }

}

export function makeRequest(stanza: Element): InstanceType<typeof Strophe.Request> {
    const req = new Strophe.Request(stanza, () => {}, 0);
    req.getResponse = function () {
        const env = new Strophe.Builder('env', { type: 'mock' }).tree();
        env.appendChild(stanza);
        return env;
    };
    return req;
}
