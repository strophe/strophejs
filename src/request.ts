import log from './log';
import Builder from './builder';
import { ErrorCondition } from './constants';
import { getParserError, xmlHtmlNode } from './utils';

/**
 * _Private_ variable that keeps track of the request ids for connections.
 */
let _requestId = 0;

/**
 * Helper class that provides a cross implementation abstraction
 * for a BOSH related XMLHttpRequest.
 *
 * The Request class is used internally to encapsulate BOSH request
 * information.  It is not meant to be used from user's code.
 */
class Request {
    id: number;
    xmlData: Element;
    data: string;
    origFunc: (req: Request) => void;
    func: (req: Request) => void;
    rid: number;
    date: number;
    sends: number;
    abort: boolean;
    dead: Date | null;
    age: () => number;
    timeDead: () => number;
    xhr: XMLHttpRequest;

    /**
     * Create and initialize a new Request object.
     *
     * @param elem - The XML data to be sent in the request.
     * @param func - The function that will be called when the
     *     XMLHttpRequest readyState changes.
     * @param rid - The BOSH rid attribute associated with this request.
     * @param sends - The number of times this same request has been sent.
     */
    constructor(elem: Element, func: (req: Request) => void, rid: number, sends = 0) {
        this.id = ++_requestId;
        this.xmlData = elem;
        this.data = Builder.serialize(elem);
        this.origFunc = func;
        this.func = func;
        this.rid = rid;
        this.date = NaN;
        this.sends = sends;
        this.abort = false;
        this.dead = null;

        this.age = () => (this.date ? (new Date().valueOf() - this.date.valueOf()) / 1000 : 0);
        this.timeDead = () => (this.dead ? (new Date().valueOf() - this.dead.valueOf()) / 1000 : 0);
        this.xhr = this._newXHR();
    }

    /**
     * Get a response from the underlying XMLHttpRequest.
     * This function attempts to get a response from the request and checks
     * for errors.
     * @throws "parsererror" - A parser error occured.
     * @throws "bad-format" - The entity has sent XML that cannot be processed.
     * @returns The DOM element tree of the response.
     */
    getResponse(): Element | null {
        const node = this.xhr.responseXML?.documentElement;
        if (node) {
            if (node.tagName === 'parsererror') {
                log.error('invalid response received');
                log.error('responseText: ' + this.xhr.responseText);
                log.error('responseXML: ' + Builder.serialize(node));
                throw new Error('parsererror');
            }
        } else if (this.xhr.responseText) {
            log.debug('Got responseText but no responseXML; attempting to parse it with DOMParser...');

            const doc = xmlHtmlNode(this.xhr.responseText);
            const parserError = getParserError(doc);

            if (!doc || parserError) {
                if (parserError) {
                    log.error('invalid response received: ' + parserError);
                    log.error('responseText: ' + this.xhr.responseText);
                }
                const error = new Error();
                error.name = ErrorCondition.BAD_FORMAT;
                throw error;
            }
        }
        return node ?? null;
    }

    /**
     * _Private_ helper function to create XMLHttpRequests.
     * This function creates XMLHttpRequests across all implementations.
     * @private
     */
    _newXHR(): XMLHttpRequest {
        const xhr = new XMLHttpRequest();
        if (xhr.overrideMimeType) {
            xhr.overrideMimeType('text/xml; charset=utf-8');
        }
        xhr.onreadystatechange = this.func.bind(null, this);
        return xhr;
    }
}

export default Request;
