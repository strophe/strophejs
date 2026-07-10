/**
 * This file implements the XEP-0114 "Jabber Component Protocol" transport for
 * Strophe.js, letting a Connection attach to an XMPP server as an external
 * component (`jabber:component:accept`) over a raw TCP stream.
 *
 * It is a streaming transport modelled on {@link Websocket}. Unlike a
 * client-to-server stream there is no SASL, no TLS negotiation and no resource
 * binding. After the stream is opened the component authenticates with a single
 * SHA-1 handshake (XEP-0114 §3) and is then CONNECTED. Because it relies on
 * `node:net` and `node:crypto` it is inherently Node-only and is not included
 * in the browser build.
 *
 * @example
 *   // Creating a connection with a XEP-0114 Component
 *   const conn = new Strophe.Connection('tcp://localhost:5347', { protocol: 'component' });
 *
 *   // jid = the component's own domain; pass = the shared secret
 *   conn.connect('component.example.org', 'the-shared-secret', (status) => {
 *       if (status === Strophe.Status.CONNECTED) {
 *           // send/receive stanzas (stamp `from` under component.example.org)
 *       }
 *   });
 */
import { Buffer } from 'node:buffer';
import { connect as netConnect, type Socket } from 'node:net';
import { createHash } from 'node:crypto';
import type Connection from '../connection';
import Builder from '../builder';
import { stx } from '../stanza';
import log from '../log';
import { ErrorCondition, NS, Status } from '../constants';
import { xmlGenerator, xmlescape } from '../utils';
import ComponentParser from './component-parser';

const DEFAULT_COMPONENT_PORT = 5347;

/**
 * Extract the defined condition and optional descriptive text from a
 * `<stream:error/>` element (RFC 6120 §4.9). `condition` is the name of the
 * first child element other than `<text/>`; `text` is the content of a
 * `<text/>` child if present. Both default to an empty string so each caller
 * can apply its own fallback condition.
 * @param streamError - The `<stream:error/>` element.
 */
function parseStreamError(streamError: Element): { condition: string; text: string } {
    let condition = '';
    let text = '';
    for (let i = 0; i < streamError.childNodes.length; i++) {
        const child = streamError.childNodes[i];
        if (child.nodeType !== child.ELEMENT_NODE) {
            continue;
        }
        if (child.nodeName === 'text') {
            text = child.textContent || '';
        } else if (!condition) {
            condition = child.nodeName;
        }
    }
    return { condition, text };
}

/**
 * Helper class that handles XEP-0114 external component connections.
 *
 * Like {@link Websocket} it is used internally by {@link Connection} to
 * encapsulate a session and is not meant to be used from user code. Select it
 * with the `protocol: 'component'` connection option and a `tcp://host:port`
 * service URL.
 */
class Component {
    _conn: Connection;
    strip: string;
    socket: Socket | null;
    private _parser: ComponentParser;
    private _streamId: string | null;

    /** Whether the XEP-0114 handshake has completed successfully. */
    private _authenticated: boolean;

    /** Whether the connection has already been torn down. Guards against a
     * second DISCONNECTED when several teardown triggers coincide (see
     * {@link Component#_teardown}). */
    private _disconnected: boolean;

    /**
     * Create and initialize a Component object.
     * @param connection - The Connection that will use this component transport.
     */
    constructor(connection: Connection) {
        this._conn = connection;
        // Complete stanzas are handed to _dataRecv wrapped in a <wrapper/>, the
        // same convention the WebSocket transport uses, so downstream handling
        // is identical.
        this.strip = 'wrapper';
        this.socket = null;
        this._streamId = null;
        this._authenticated = false;
        this._disconnected = false;
        this._parser = new ComponentParser({
            onStreamStart: (attrs) => this._onStreamStart(attrs),
            onStanza: (stanza) => this._onStanza(stanza),
            onStreamEnd: () => this._onStreamEnd(),
            onError: (err) => this._onParseError(err),
        });
    }

    /**
     * Parse the component service URL into a host and port.
     *
     * Accepts `tcp://host:port` (the recommended plaintext form) and tolerates a
     * bare `host:port`. The port defaults to 5347, the conventional component
     * listener port.
     */
    _serviceUrl(): { host: string; port: number } {
        const service = this._conn.service;
        const url = new URL(service.includes('://') ? service : `tcp://${service}`);
        return {
            host: url.hostname || 'localhost',
            port: url.port ? parseInt(url.port, 10) : DEFAULT_COMPONENT_PORT,
        };
    }

    /**
     * Reset the transport. Called by {@link Connection#reset}.
     */
    _reset(): void {
        this._parser.reset();
        this._streamId = null;
        this._authenticated = false;
        this._disconnected = false;
    }

    /**
     * _Private_ function called by Connection.connect
     *
     * Opens a TCP socket to the component listener and wires up its callbacks.
     */
    _connect(): void {
        this._closeSocket();
        this._reset();

        const { host, port } = this._serviceUrl();
        log.debug(`Component connecting to ${host}:${port}`);

        const socket = netConnect({ host, port });
        this.socket = socket;
        socket.on('connect', () => this._onOpen());
        socket.on('data', (chunk: Buffer) => this._onData(chunk));
        socket.on('error', (e: Error) => this._onError(e));
        socket.on('close', () => this._onClose());
    }

    /**
     * _Private_ function called by Connection._connect_cb
     *
     * The component protocol has no <stream:features> to inspect, so there is
     * nothing to check here. Kept for interface parity with the other
     * transports.
     */
    _connect_cb(_bodyWrap: Element): number | void {}

    /**
     * _Private_ function to handle a successful TCP connection.
     * Sends the component stream header (XEP-0114 §2).
     */
    _onOpen(): void {
        log.debug('Component TCP socket connected');
        const header = this._streamHeader();
        this._conn.xmlOutput(this._streamOpenElement());
        this._conn.rawOutput(header);
        this.socket?.write(header);
    }

    /**
     * The opening `<stream:stream>` header sent to the server. `to` is the
     * component's own domain, per XEP-0114.
     */
    _streamHeader(): string {
        return (
            "<?xml version='1.0'?>" +
            `<stream:stream xmlns='${NS.COMPONENT}' ` +
            `xmlns:stream='${NS.STREAM}' ` +
            `to='${xmlescape(this._conn.domain)}'>`
        );
    }

    /**
     * A self-closed representation of the stream header, purely for the
     * `xmlOutput` debug hook (the real header sent on the wire never closes).
     */
    _streamOpenElement(): Element {
        return stx`<stream:stream xmlns="${NS.COMPONENT}" xmlns:stream="${NS.STREAM}" to="${this._conn.domain}"/>`.tree();
    }

    /**
     * _Private_ function called when raw bytes arrive on the socket.
     * Feeds them into the incremental stream parser.
     * @param chunk - The bytes received from the socket.
     */
    _onData(chunk: Buffer): void {
        this._parser.write(chunk);
    }

    /**
     * Handle the server's opening stream header. Captures the stream id and
     * replies with the SHA-1 handshake (XEP-0114 §3).
     * @param attrs - The attributes of the server's <stream:stream> header.
     */
    _onStreamStart(attrs: Record<string, string>): void {
        const streamId = attrs.id;
        if (!streamId) {
            log.error('Component stream header is missing a stream id');
            this._teardown(Status.CONNFAIL, 'Missing stream id in component stream header');
            return;
        }
        this._streamId = streamId;
        this._sendHandshake(streamId);
    }

    /**
     * Compute and send the XEP-0114 handshake digest,
     * `hex( SHA1( STREAM_ID + SHARED_SECRET ) )` in lowercase.
     * @param streamId - The stream id from the server's stream header.
     */
    _sendHandshake(streamId: string): void {
        const secret = typeof this._conn.pass === 'string' ? this._conn.pass : '';
        const digest = createHash('sha1')
            .update(streamId + secret, 'utf8')
            .digest('hex');

        const handshake = stx`<handshake>${digest}</handshake>`;
        const raw = handshake.toString();
        this._conn.xmlOutput(handshake.tree());
        this._conn.rawOutput(raw);
        this.socket?.write(raw);
    }

    /**
     * Route a complete inbound stanza. Before the handshake completes this is
     * the handshake result; afterwards it's ordinary traffic.
     * @param stanza - A complete top-level stanza element.
     */
    _onStanza(stanza: Element): void {
        if (this._authenticated) {
            this._onMessage(stanza);
        } else {
            this._handleHandshakeResult(stanza);
        }
    }

    /**
     * Inspect the server's reply to our handshake. An empty `<handshake/>`
     * means success and the component is CONNECTED; a `<stream:error/>` (e.g.
     * `<not-authorized/>`) means the shared secret was wrong.
     * @param stanza - The first stanza received after sending the handshake.
     */
    _handleHandshakeResult(stanza: Element): void {
        if (stanza.nodeName === 'handshake') {
            log.debug('Component handshake succeeded');
            this._authenticated = true;
            this._conn.connected = true;
            this._conn.authenticated = true;
            // The handshake reply arrives without us having flushed the send
            // queue, so the idle loop may have stopped while we were still
            // unconnected. Restart it so timed handlers and queued stanzas keep
            // flowing even for a component that only receives.
            this._conn._scheduleIdle();
            this._conn._changeConnectStatus(Status.CONNECTED, null);
        } else if (stanza.nodeName === 'stream:error' || stanza.nodeName === 'error') {
            const condition = parseStreamError(stanza).condition || 'not-authorized';
            log.error(`Component handshake failed: ${condition}`);
            this._teardown(Status.AUTHFAIL, condition);
        } else {
            log.error(`Unexpected stanza <${stanza.nodeName}> before component handshake completed`);
            this._teardown(Status.AUTHFAIL, 'unexpected-stanza');
        }
    }

    /**
     * _Private_ function to handle incoming stanzas once authenticated.
     * Wraps the stanza and routes it through the normal handler machinery,
     * exactly as {@link Websocket#_onMessage} does.
     * @param stanza - A complete top-level stanza element.
     */
    _onMessage(stanza: Element): void {
        if (stanza.nodeName === 'stream:error') {
            this._checkStreamError(stanza);
            return;
        }
        const raw = this._serialize(stanza);
        const wrapper = xmlGenerator().createElement('wrapper');
        wrapper.appendChild(stanza);
        this._conn._dataRecv(wrapper, raw);
    }

    /**
     * Serialize an element to a string, reusing Strophe's own serializer so
     * output matches the other transports.
     */
    _serialize(elem: Element): string {
        return Builder.serialize(elem) ?? '';
    }

    /**
     * _Private_ checks a received stream error and tears the connection down.
     * @param streamError - The <stream:error/> element.
     */
    _checkStreamError(streamError: Element): void {
        const { condition, text } = parseStreamError(streamError);
        const reason = condition || 'unknown';
        log.error(`Component stream error: ${reason}${text ? ' - ' + text : ''}`);
        this._teardown(Status.CONNFAIL, reason);
    }

    /**
     * Handle the closing `</stream:stream>` tag from the server.
     */
    _onStreamEnd(): void {
        log.debug('Component received </stream:stream>');
        if (!this._conn.disconnecting) {
            this._teardown(null);
        }
    }

    /**
     * Handle a fatal XML parse error on the inbound stream.
     * @param error - The parse error.
     */
    _onParseError(error: Error): void {
        log.error(`Component stream parse error: ${error.message}`);
        this._teardown(Status.CONNFAIL, ErrorCondition.BAD_FORMAT);
    }

    /**
     * _Private_ function called by Connection.disconnect
     * Sends an optional last stanza, then the closing stream tag, then
     * tears down the socket.
     * @param pres - This stanza will be sent before disconnecting.
     */
    _disconnect(pres?: Element | Builder): void {
        if (this.socket && !this.socket.destroyed) {
            if (pres) {
                this._conn.send(pres);
            }
            const closeString = '</stream:stream>';
            this._conn.rawOutput(closeString);
            try {
                this.socket.write(closeString);
            } catch (e) {
                log.warn(`Couldn't send </stream:stream> tag. "${(e as Error).message}"`);
            }
        }
        setTimeout(() => this._teardown(null), 0);
    }

    /**
     * Tear the connection down exactly once.
     *
     * A single parsed chunk can surface several teardown triggers back to
     * back: a `<stream:error/>` immediately followed by the closing
     * `</stream:stream>`, or a socket error and then its close event. Each
     * would otherwise call {@link Connection#_doDisconnect} again and fire a
     * second DISCONNECTED. The first call through here wins; later ones are
     * no-ops.
     * @param status - A {@link Status} to report before disconnecting, or null
     *     to disconnect without a preceding status change (e.g. a plain stream
     *     close).
     * @param condition - The accompanying error condition, if any.
     */
    _teardown(status: number | null, condition?: string | null): void {
        if (this._disconnected) {
            return;
        }
        this._disconnected = true;
        if (status !== null) {
            this._conn._changeConnectStatus(status, condition ?? null);
        }
        this._conn._doDisconnect(condition ?? undefined);
    }

    /**
     * _Private_ function to disconnect. Just closes the socket.
     */
    _doDisconnect(): void {
        this._disconnected = true;
        log.debug('Component _doDisconnect was called');
        this._closeSocket();
    }

    /**
     * _Private_ function to close the TCP socket and drop its listeners.
     */
    _closeSocket(): void {
        if (this.socket) {
            try {
                this.socket.removeAllListeners('connect');
                this.socket.removeAllListeners('data');
                this.socket.removeAllListeners('error');
                this.socket.removeAllListeners('close');
                this.socket.destroy();
            } catch (e) {
                log.debug((e as Error).message);
            }
        }
        this.socket = null;
    }

    /**
     * _Private_ function to check if the message queue is empty.
     * @returns True, because stanzas are written to the socket immediately.
     */
    _emptyQueue(): true {
        return true;
    }

    /**
     * _Private_ function to handle the socket closing.
     */
    _onClose(): void {
        if (this._conn.connected && !this._conn.disconnecting) {
            log.error('Component socket closed unexpectedly');
            this._teardown(null);
        } else if (!this._conn.connected && this.socket) {
            log.error('Component socket closed before the stream was established');
            this._teardown(Status.CONNFAIL, 'The TCP connection could not be established or was disconnected.');
        } else {
            log.debug('Component socket closed');
        }
    }

    /**
     * Called on stream start/restart when no authentication mechanism is
     * offered. Not reachable on the component path (there is no SASL), but kept
     * for interface parity.
     * @param callback
     */
    _no_auth_received(callback?: (this: Connection) => void): void {
        log.error('Component received no authentication mechanism');
        this._conn._changeConnectStatus(Status.CONNFAIL, ErrorCondition.NO_AUTH_MECH);
        callback?.call(this._conn);
        this._conn._doDisconnect();
    }

    /**
     * _Private_ timeout handler for a non-graceful disconnection.
     * Nothing to do for a plain TCP socket.
     */
    _onDisconnectTimeout(): void {}

    /**
     * _Private_ helper that makes sure all pending requests are aborted.
     * A component has no in-flight requests, so this is a no-op.
     */
    _abortAllRequests(): void {}

    /**
     * _Private_ function to handle socket errors.
     * @param error - The socket error.
     */
    _onError(error: Error): void {
        log.error('Component socket error ' + (error?.message ?? JSON.stringify(error)));
        this._teardown(Status.CONNFAIL, 'The TCP connection could not be established or was disconnected.');
    }

    /**
     * _Private_ function called by Connection._onIdle
     * Serializes queued stanzas and writes them to the socket, stamping a
     * `from` attribute under the component's domain when one is absent (the
     * server validates that a component stamps `from`, per XEP-0114).
     */
    _onIdle(): void {
        const data = this._conn._data;
        if (data.length > 0 && !this._conn.paused) {
            for (let i = 0; i < data.length; i++) {
                const stanza = data[i];
                // Components have no stream-restart concept; ignore any 'restart'
                // marker (it is only produced by the SASL/bind path).
                if (stanza === null || stanza === 'restart') {
                    continue;
                }
                this._stampFrom(stanza);
                const rawStanza = this._serialize(stanza);
                this._conn.xmlOutput(stanza);
                this._conn.rawOutput(rawStanza);
                this.socket?.write(rawStanza);
            }
            this._conn._data = [];
        }
    }

    /**
     * Ensure an outgoing stanza carries a `from` attribute under the
     * component's domain, which XEP-0114 requires the server to validate.
     * An explicit `from` (e.g. a sub-JID of the component) is left untouched.
     * @param stanza - The outgoing stanza element.
     */
    _stampFrom(stanza: Element): void {
        const name = stanza.nodeName;
        if ((name === 'message' || name === 'presence' || name === 'iq') && !stanza.getAttribute('from')) {
            stanza.setAttribute('from', (this._conn.jid || this._conn.domain) as string);
        }
    }

    /**
     * _Private_ part of the Connection.send function for the component transport.
     * Just flushes the messages that are in the queue.
     */
    _send(): void {
        this._conn.flush();
    }

    /**
     * Send an xmpp:restart stanza.
     *
     * Components never restart their stream, so this only flushes any queued
     * data. Included for interface parity with the other transports.
     */
    _sendRestart(): void {
        clearTimeout(this._conn._idleTimeout);
        this._conn._onIdle();
    }
}

export default Component;
