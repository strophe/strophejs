/**
 * This file implements XMPP over WebSockets for Strophejs.
 *
 * If a Connection is established with a Websocket url (ws://...)
 * Strophe will use WebSockets.
 *
 * For more information on XMPP-over-WebSocket see RFC 7395:
 * http://tools.ietf.org/html/rfc7395
 */
import type Connection from './connection';
import Builder, { $build } from './builder';
import log from './log';
import { NS, ErrorCondition, Status } from './constants';
import {WebsocketLike} from 'types';

/**
 * Helper class that handles WebSocket Connections
 *
 * The WebSocket class is used internally by Connection
 * to encapsulate WebSocket sessions. It is not meant to be used from user's code.
 */
class Websocket {
    _conn: Connection;
    strip: string;
    socket: WebSocket | WebsocketLike | null;
    _messageHandler: (message: MessageEvent) => void;

    /**
     * Create and initialize a WebSocket object.
     * Currently only sets the connection Object.
     * @param connection - The Connection that will use WebSockets.
     */
    constructor(connection: Connection) {
        this._conn = connection;
        this.strip = 'wrapper';

        const service = connection.service;
        if (service.indexOf('ws:') !== 0 && service.indexOf('wss:') !== 0) {
            let new_service = '';
            if (connection.options.protocol === 'ws' && location.protocol !== 'https:') {
                new_service += 'ws';
            } else {
                new_service += 'wss';
            }

            new_service += '://' + location.host;
            if (service.indexOf('/') !== 0) {
                new_service += location.pathname + service;
            } else {
                new_service += service;
            }
            connection.service = new_service;
        }
    }

    /**
     * _Private_ helper function to generate the <stream> start tag for WebSockets
     * @private
     * @returns A Builder with a <stream> element.
     */
    _buildStream(): Builder {
        return $build('open', {
            'xmlns': NS.FRAMING,
            'to': this._conn.domain,
            'version': '1.0',
        });
    }

    /**
     * _Private_ checks a message for stream:error
     * @private
     * @param bodyWrap - The received stanza.
     * @param connectstatus - The ConnectStatus that will be set on error.
     * @returns true if there was a streamerror, false otherwise.
     */
    _checkStreamError(bodyWrap: Element, connectstatus: number): boolean {
        let errors: HTMLCollectionOf<Element>;
        if (bodyWrap.getElementsByTagNameNS) {
            errors = bodyWrap.getElementsByTagNameNS(NS.STREAM, 'error') as HTMLCollectionOf<Element>;
        } else {
            errors = bodyWrap.getElementsByTagName('stream:error');
        }
        if (errors.length === 0) {
            return false;
        }

        const error = errors[0];

        let condition = '';
        let text = '';

        const ns = 'urn:ietf:params:xml:ns:xmpp-streams';
        for (let i = 0; i < error.childNodes.length; i++) {
            const e = error.childNodes[i];
            if (e.nodeType === e.ELEMENT_NODE) {
                const el = e as Element;
                if (el.getAttribute('xmlns') !== ns) {
                    break;
                }
            }
            if (e.nodeName === 'text') {
                text = e.textContent || '';
            } else {
                condition = e.nodeName;
            }
        }

        let errorString = 'WebSocket stream error: ';
        if (condition) {
            errorString += condition;
        } else {
            errorString += 'unknown';
        }
        if (text) {
            errorString += ' - ' + text;
        }
        log.error(errorString);

        this._conn._changeConnectStatus(connectstatus, condition);
        this._conn._doDisconnect();
        return true;
    }

    /**
     * Reset the connection.
     *
     * This function is called by the reset function of the Strophe Connection.
     * Is not needed by WebSockets.
     */
    _reset(): void {
        return;
    }

    /**
     * _Private_ function called by Connection.connect
     *
     * Creates a WebSocket for a connection and assigns Callbacks to it.
     * Does nothing if there already is a WebSocket.
     */
    _connect(): void {
        this._closeSocket();

        this.socket = new WebSocket(this._conn.service, 'xmpp');
        this.socket.onopen = () => this._onOpen();
        this.socket.onerror = (e) => this._onError(e);
        this.socket.onclose = (e) => this._onClose(e);
        this.socket.onmessage = (message) => this._onInitialMessage(message);
    }

    /**
     * _Private_ function called by Connection._connect_cb
     * checks for stream:error
     * @param bodyWrap - The received stanza.
     */
    _connect_cb(bodyWrap: Element): number | void {
        const error = this._checkStreamError(bodyWrap, Status.CONNFAIL);
        if (error) {
            return Status.CONNFAIL;
        }
    }

    /**
     * _Private_ function that checks the opening <open /> tag for errors.
     *
     * Disconnects if there is an error and returns false, true otherwise.
     * @private
     * @param message - Stanza containing the <open /> tag.
     */
    _handleStreamStart(message: Element): boolean {
        let error: string | null = null;

        const ns = message.getAttribute('xmlns');
        if (typeof ns !== 'string') {
            error = 'Missing xmlns in <open />';
        } else if (ns !== NS.FRAMING) {
            error = 'Wrong xmlns in <open />: ' + ns;
        }

        const ver = message.getAttribute('version');
        if (typeof ver !== 'string') {
            error = 'Missing version in <open />';
        } else if (ver !== '1.0') {
            error = 'Wrong version in <open />: ' + ver;
        }

        if (error) {
            this._conn._changeConnectStatus(Status.CONNFAIL, error);
            this._conn._doDisconnect();
            return false;
        }
        return true;
    }

    /**
     * _Private_ function that handles the first connection messages.
     *
     * On receiving an opening stream tag this callback replaces itself with the real
     * message handler. On receiving a stream error the connection is terminated.
     * @param message
     */
    _onInitialMessage(message: MessageEvent): void {
        if (message.data.indexOf('<open ') === 0 || message.data.indexOf('<?xml') === 0) {
            const data = message.data.replace(/^(<\?.*?\?>\s*)*/, '');
            if (data === '') return;

            const streamStart = new DOMParser().parseFromString(data, 'text/xml').documentElement;
            this._conn.xmlInput(streamStart);
            this._conn.rawInput(message.data);

            if (this._handleStreamStart(streamStart)) {
                this._connect_cb(streamStart);
            }
        } else if (message.data.indexOf('<close ') === 0) {
            const parsedMessage = new DOMParser().parseFromString(message.data, 'text/xml').documentElement;
            this._conn.xmlInput(parsedMessage);
            this._conn.rawInput(message.data);
            const see_uri = parsedMessage.getAttribute('see-other-uri');
            if (see_uri) {
                const service = this._conn.service;
                const isSecureRedirect =
                    (service.indexOf('wss:') >= 0 && see_uri.indexOf('wss:') >= 0) || service.indexOf('ws:') >= 0;
                if (isSecureRedirect) {
                    this._conn._changeConnectStatus(
                        Status.REDIRECT,
                        'Received see-other-uri, resetting connection'
                    );
                    this._conn.reset();
                    this._conn.service = see_uri;
                    this._connect();
                }
            } else {
                this._conn._changeConnectStatus(Status.CONNFAIL, 'Received closing stream');
                this._conn._doDisconnect();
            }
        } else {
            this._replaceMessageHandler();
            const string = this._streamWrap(message.data);
            const elem = new DOMParser().parseFromString(string, 'text/xml').documentElement;
            this._conn._connect_cb(elem, null, message.data);
        }
    }

    /**
     * Called by _onInitialMessage in order to replace itself with the general message handler.
     * This method is overridden by WorkerWebsocket, which manages a
     * websocket connection via a service worker and doesn't have direct access
     * to the socket.
     */
    _replaceMessageHandler(): void {
        (this.socket as WebSocket).onmessage = (m) => this._onMessage(m);
    }

    /**
     * _Private_ function called by Connection.disconnect
     * Disconnects and sends a last stanza if one is given
     * @param pres - This stanza will be sent before disconnecting.
     */
    _disconnect(pres?: Element | Builder): void {
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
            if (pres) {
                this._conn.send(pres);
            }
            const close = $build('close', { 'xmlns': NS.FRAMING });
            this._conn.xmlOutput(close.tree());
            const closeString = Builder.serialize(close);
            this._conn.rawOutput(closeString);
            try {
                this.socket.send(closeString);
            } catch (e) {
                log.warn(`Couldn't send <close /> tag. "${(e as Error).message}"`);
            }
        }
        setTimeout(() => this._conn._doDisconnect(), 0);
    }

    /**
     * _Private_ function to disconnect.
     * Just closes the Socket for WebSockets
     */
    _doDisconnect(): void {
        log.debug('WebSockets _doDisconnect was called');
        this._closeSocket();
    }

    /**
     * PrivateFunction _streamWrap
     * _Private_ helper function to wrap a stanza in a <stream> tag.
     * This is used so Strophe can process stanzas from WebSockets like BOSH
     * @param stanza
     */
    _streamWrap(stanza: string): string {
        return '<wrapper>' + stanza + '</wrapper>';
    }

    /**
     * _Private_ function to close the WebSocket.
     *
     * Closes the socket if it is still open and deletes it
     */
    _closeSocket(): void {
        if (this.socket) {
            try {
                this.socket.onclose = null;
                this.socket.onerror = null;
                this.socket.onmessage = null;
                this.socket.close();
            } catch (e) {
                log.debug((e as Error).message);
            }
        }
        this.socket = null;
    }

    /**
     * _Private_ function to check if the message queue is empty.
     * @returns True, because WebSocket messages are send immediately after queueing.
     */
    _emptyQueue(): true {
        return true;
    }

    /**
     * _Private_ function to handle websockets closing.
     * @param e
     */
    _onClose(e?: CloseEvent): void {
        if (this._conn.connected && !this._conn.disconnecting) {
            log.error('Websocket closed unexpectedly');
            this._conn._doDisconnect();
        } else if (e && e.code === 1006 && !this._conn.connected && this.socket) {
            log.error('Websocket closed unexcectedly');
            this._conn._changeConnectStatus(
                Status.CONNFAIL,
                'The WebSocket connection could not be established or was disconnected.'
            );
            this._conn._doDisconnect();
        } else {
            log.debug('Websocket closed');
        }
    }

    /**
     * Called on stream start/restart when no stream:features
     * has been received.
     * @param callback
     */
    _no_auth_received(callback?: (this: Connection) => void): void {
        log.error('Server did not offer a supported authentication mechanism');
        this._conn._changeConnectStatus(Status.CONNFAIL, ErrorCondition.NO_AUTH_MECH);
        callback?.call(this._conn);
        this._conn._doDisconnect();
    }

    /**
     * _Private_ timeout handler for handling non-graceful disconnection.
     *
     * This does nothing for WebSockets
     */
    _onDisconnectTimeout(): void {}

    /**
     * _Private_ helper function that makes sure all pending requests are aborted.
     */
    _abortAllRequests(): void {}

    /**
     * _Private_ function to handle websockets errors.
     * @param error - The websocket error.
     */
    _onError(error: Event): void {
        log.error('Websocket error ' + JSON.stringify(error));
        this._conn._changeConnectStatus(
            Status.CONNFAIL,
            'The WebSocket connection could not be established or was disconnected.'
        );
        this._disconnect();
    }

    /**
     * _Private_ function called by Connection._onIdle
     * sends all queued stanzas
     */
    _onIdle(): void {
        const data = this._conn._data;
        if (data.length > 0 && !this._conn.paused) {
            for (let i = 0; i < data.length; i++) {
                if (data[i] !== null) {
                    const stanza = data[i] === 'restart' ? this._buildStream().tree() : data[i];
                    if (stanza === 'restart') throw new Error('Wrong type for stanza');
                    const rawStanza = Builder.serialize(stanza);
                    this._conn.xmlOutput(stanza);
                    this._conn.rawOutput(rawStanza);
                    this.socket!.send(rawStanza);
                }
            }
            this._conn._data = [];
        }
    }

    /**
     * _Private_ function to handle websockets messages.
     *
     * This function parses each of the messages as if they are full documents.
     * [TODO : We may actually want to use a SAX Push parser].
     *
     * Since all XMPP traffic starts with
     * <stream:stream version='1.0'
     *                xml:lang='en'
     *                xmlns='jabber:client'
     *                xmlns:stream='http://etherx.jabber.org/streams'
     *                id='3697395463'
     *                from='SERVER'>
     *
     * The first stanza will always fail to be parsed.
     *
     * Additionally, the seconds stanza will always be <stream:features> with
     * the stream NS defined in the previous stanza, so we need to 'force'
     * the inclusion of the NS in this stanza.
     *
     * @param message - The websocket message event
     */
    _onMessage(message: MessageEvent): void {
        let elem: Element;
        const close = '<close xmlns="urn:ietf:params:xml:ns:xmpp-framing" />';
        if (message.data === close) {
            this._conn.rawInput(close);
            this._conn.xmlInput(message);
            if (!this._conn.disconnecting) {
                this._conn._doDisconnect();
            }
            return;
        } else if (message.data.search('<open ') === 0) {
            elem = new DOMParser().parseFromString(message.data, 'text/xml').documentElement;
            if (!this._handleStreamStart(elem)) {
                return;
            }
        } else {
            const data = this._streamWrap(message.data);
            elem = new DOMParser().parseFromString(data, 'text/xml').documentElement;
        }

        if (this._checkStreamError(elem, Status.ERROR)) {
            return;
        }

        if (
            this._conn.disconnecting &&
            elem.firstElementChild!.nodeName === 'presence' &&
            elem.firstElementChild!.getAttribute('type') === 'unavailable'
        ) {
            this._conn.xmlInput(elem);
            this._conn.rawInput(Builder.serialize(elem));
            return;
        }
        this._conn._dataRecv(elem, message.data);
    }

    /**
     * _Private_ function to handle websockets connection setup.
     * The opening stream tag is sent here.
     * @private
     */
    _onOpen(): void {
        log.debug('Websocket open');
        const start = this._buildStream();
        this._conn.xmlOutput(start.tree());

        const startString = Builder.serialize(start);
        this._conn.rawOutput(startString);
        this.socket!.send(startString);
    }

    /**
     * _Private_ part of the Connection.send function for WebSocket
     * Just flushes the messages that are in the queue
     */
    _send(): void {
        this._conn.flush();
    }

    /**
     * Send an xmpp:restart stanza.
     */
    _sendRestart(): void {
        clearTimeout(this._conn._idleTimeout);
        this._conn._onIdle.bind(this._conn)();
    }
}

export default Websocket;
