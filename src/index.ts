import * as utils from './utils.js';
import Bosh from './transports/bosh.js';
import Builder, { $build, $msg, $pres, $iq } from './builder.js';
import Connection from './connection.js';
import Handler from './handler.js';
import Request from './request.js';
import SASLAnonymous from './sasl-anon.js';
import SASLExternal from './sasl-external.js';
import SASLMechanism from './sasl.js';
import SASLOAuthBearer from './sasl-oauthbearer.js';
import SASLPlain from './sasl-plain.js';
import SASLSHA1 from './sasl-sha1.js';
import SASLSHA256 from './sasl-sha256.js';
import SASLSHA384 from './sasl-sha384.js';
import SASLSHA512 from './sasl-sha512.js';
import SASLXOAuth2 from './sasl-xoauth2.js';
import StreamManagement, { MemoryStorageBackend, SessionStorageBackend, StreamManagementMirror } from './stream-management/index.js';
import TimedHandler from './timed-handler.js';
import Websocket from './transports/websocket.js';
import WorkerWebsocket from './transports/worker-websocket.js';
import log from './log.js';
import { ElementType, ErrorCondition, LOG_LEVELS, LogLevel, NS, Status, XHTML } from './constants.js';
import { stx, Stanza } from './stanza.js';

type StropheType = {
    VERSION: string;
    TIMEOUT: number;
    SECONDARY_TIMEOUT: number;
    Request: typeof Request;
    Bosh: typeof Bosh;
    Websocket: typeof Websocket;
    WorkerWebsocket: typeof WorkerWebsocket;
    Connection: typeof Connection;
    Handler: typeof Handler;
    SASLAnonymous: typeof SASLAnonymous;
    SASLPlain: typeof SASLPlain;
    SASLSHA1: typeof SASLSHA1;
    SASLSHA256: typeof SASLSHA256;
    SASLSHA384: typeof SASLSHA384;
    SASLSHA512: typeof SASLSHA512;
    SASLOAuthBearer: typeof SASLOAuthBearer;
    SASLExternal: typeof SASLExternal;
    SASLXOAuth2: typeof SASLXOAuth2;
    Stanza: typeof Stanza;
    StreamManagement: typeof StreamManagement;
    MemoryStorageBackend: typeof MemoryStorageBackend;
    SessionStorageBackend: typeof SessionStorageBackend;
    Builder: typeof Builder;
    ElementType: typeof ElementType;
    ErrorCondition: typeof ErrorCondition;
    LogLevel: typeof LOG_LEVELS;
    NS: typeof NS;
    SASLMechanism: typeof SASLMechanism;
    Status: typeof Status;
    TimedHandler: typeof TimedHandler;
    XHTML: typeof XHTML & {
        validTag: typeof utils.validTag;
        validCSS: typeof utils.validCSS;
        validAttribute: typeof utils.validAttribute;
    };
    serialize(elem: Element | Builder): string;
    setLogLevel(level: LogLevel): void;
    addNamespace(name: string, value: string): void;
    addConnectionPlugin(name: string, ptype: object): void;
} & typeof utils &
    typeof log;

const Strophe: StropheType = {
    VERSION: '6.0.0',

    get TIMEOUT() {
        return Bosh.getTimeoutMultplier();
    },

    set TIMEOUT(n) {
        Bosh.setTimeoutMultiplier(n);
    },

    get SECONDARY_TIMEOUT() {
        return Bosh.getSecondaryTimeoutMultplier();
    },

    set SECONDARY_TIMEOUT(n) {
        Bosh.setSecondaryTimeoutMultiplier(n);
    },

    ...utils,
    ...log,

    Request,

    Bosh,
    Websocket,
    WorkerWebsocket,
    Connection,
    Handler,

    SASLAnonymous,
    SASLPlain,
    SASLSHA1,
    SASLSHA256,
    SASLSHA384,
    SASLSHA512,
    SASLOAuthBearer,
    SASLExternal,
    SASLXOAuth2,

    Stanza,
    StreamManagement,
    MemoryStorageBackend,
    SessionStorageBackend,
    Builder,
    ElementType,
    ErrorCondition,
    LogLevel: LOG_LEVELS,
    NS,
    SASLMechanism,
    Status,
    TimedHandler,

    XHTML: {
        ...XHTML,
        validTag: utils.validTag,
        validCSS: utils.validCSS,
        validAttribute: utils.validAttribute,
    },

    serialize(elem: Element | Builder): string {
        return Builder.serialize(elem)!;
    },

    setLogLevel(level: LogLevel): void {
        log.setLogLevel(level);
    },

    addNamespace(name: string, value: string): void {
        (Strophe.NS as Record<string, string>)[name] = value;
    },

    addConnectionPlugin(name: string, ptype: object): void {
        Connection.addConnectionPlugin(name, ptype);
    },
};

(globalThis as any).$build = $build;
(globalThis as any).$iq = $iq;
(globalThis as any).$msg = $msg;
(globalThis as any).$pres = $pres;
(globalThis as any).Strophe = Strophe;
(globalThis as any).stx = stx;

const toStanza = Stanza.toElement;
(globalThis as any).toStanza = Stanza.toElement;

export {
    Builder,
    $build,
    $iq,
    $msg,
    $pres,
    Strophe,
    Stanza,
    stx,
    toStanza,
    Request,
    StreamManagement,
    StreamManagementMirror,
    MemoryStorageBackend,
    SessionStorageBackend,
};
export type {
    StanzaView,
    QueuedStanza,
    SMState,
    SMStorageBackend,
    StreamManagementController,
    StreamManagementOptions,
} from './stream-management/index.js';
export type { ConnectCallback, ConnectionOptions } from './connection.js';
