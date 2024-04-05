import { DOMParser } from './shims';
import log from './log.js';
import Builder from './builder.js';
import { ErrorCondition } from './constants.js';

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
 *
 * @property {number} id
 * @property {number} sends
 * @property {XMLHttpRequest} xhr
 */
class Request {
    /**
     * Create and initialize a new Request object.
     *
     * @param {Element} elem - The XML data to be sent in the request.
     * @param {Function} func - The function that will be called when the
     *     XMLHttpRequest readyState changes.
     * @param {number} rid - The BOSH rid attribute associated with this request.
     * @param {number} [sends=0] - The number of times this same request has been sent.
     */
    constructor(elem, func, rid, sends = 0) {
        this.id = ++_requestId;
        this.xmlData = elem;
        this.data = Builder.serialize(elem);
        // save original function in case we need to make a new request
        // from this one.
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
     * @return {Element} - The DOM element tree of the response.
     */
    getResponse() {
        let node = this.xhr.responseXML?.documentElement;
        if (node) {
            if (node.tagName === 'parsererror') {
                log.error('invalid response received');
                log.error('responseText: ' + this.xhr.responseText);
                log.error('responseXML: ' + Builder.serialize(node));
                throw new Error('parsererror');
            }
        } else if (this.xhr.responseText) {
            // In Node (with xhr2) or React Native, we may get responseText but no responseXML.
            // We can try to parse it manually.
            log.debug('Got responseText but no responseXML; attempting to parse it with DOMParser...');
            node = new DOMParser().parseFromString(this.xhr.responseText, 'application/xml').documentElement;

            const parserError = node?.getElementsByTagName('parsererror').item(0);
            if (!node || parserError) {
                if (parserError) {
                    log.error('invalid response received: ' + parserError.textContent);
                    log.error('responseText: ' + this.xhr.responseText);
                }
                const error = new Error();
                error.name = ErrorCondition.BAD_FORMAT;
                throw error;
            }
        }
        return node;
    }

    /**
     * _Private_ helper function to create XMLHttpRequests.
     * This function creates XMLHttpRequests across all implementations.
     * @private
     * @return {XMLHttpRequest}
     */
    _newXHR() {
        const xhr = new XMLHttpRequest();
        if (xhr.overrideMimeType) {
            xhr.overrideMimeType('text/xml; charset=utf-8');
        }
        // use Function.bind() to prepend ourselves as an argument
        xhr.onreadystatechange = this.func.bind(null, this);
        return xhr;
    }
}

export default Request;
