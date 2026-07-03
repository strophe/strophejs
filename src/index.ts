import * as utils from './utils';
import Bosh from './bosh';
import Builder, { $build, $msg, $pres, $iq } from './builder';
import Connection from './connection';
import Handler from './handler';
import Request from './request';
import SASLAnonymous from './sasl-anon';
import SASLExternal from './sasl-external';
import SASLMechanism from './sasl';
import SASLOAuthBearer from './sasl-oauthbearer';
import SASLPlain from './sasl-plain';
import SASLSHA1 from './sasl-sha1';
import SASLSHA256 from './sasl-sha256';
import SASLSHA384 from './sasl-sha384';
import SASLSHA512 from './sasl-sha512';
import SASLXOAuth2 from './sasl-xoauth2';
import StreamManagement, { MemoryStorageBackend, SessionStorageBackend, StreamManagementMirror } from './stream-management';
import TimedHandler from './timed-handler';
import Websocket from './websocket';
import WorkerWebsocket from './worker-websocket';
import log from './log';
import { ElementType, ErrorCondition, LOG_LEVELS, LogLevel, NS, Status, XHTML } from './constants';
import { stx, Stanza } from './stanza';

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
} & typeof utils;

const Strophe: StropheType = {
    VERSION: '4.0.0',

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
} from './stream-management';
