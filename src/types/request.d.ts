export default Request;
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
declare class Request {
    /**
     * Create and initialize a new Request object.
     *
     * @param {Element} elem - The XML data to be sent in the request.
     * @param {Function} func - The function that will be called when the
     *     XMLHttpRequest readyState changes.
     * @param {number} rid - The BOSH rid attribute associated with this request.
     * @param {number} [sends=0] - The number of times this same request has been sent.
     */
    constructor(elem: Element, func: Function, rid: number, sends?: number);
    id: number;
    xmlData: Element;
    data: string;
    origFunc: Function;
    func: Function;
    rid: number;
    date: number;
    sends: number;
    abort: boolean;
    dead: any;
    age: () => number;
    timeDead: () => number;
    xhr: XMLHttpRequest;
    /**
     * Get a response from the underlying XMLHttpRequest.
     * This function attempts to get a response from the request and checks
     * for errors.
     * @throws "parsererror" - A parser error occured.
     * @throws "bad-format" - The entity has sent XML that cannot be processed.
     * @return {Element} - The DOM element tree of the response.
     */
    getResponse(): Element;
    /**
     * _Private_ helper function to create XMLHttpRequests.
     * This function creates XMLHttpRequests across all implementations.
     * @private
     * @return {XMLHttpRequest}
     */
    private _newXHR;
}
//# sourceMappingURL=request.d.ts.map