import { Strophe } from '../dist/strophe.node.esm.js';
import sinon from 'sinon';
import { XHR } from './helpers.js';
import { describe, it, expect } from 'vitest';

describe('BOSH Session resumption', () => {
    it('When passing in {keepalive: true} to Strophe.Connection, then the session tokens get cached automatically', () => {
        const conn = new Strophe.Connection('', { 'keepalive': true });
        conn.jid = 'dummy@localhost';
        const proto: any = conn._proto;
        proto.sid = '5332346';
        const cacheSpy = sinon.spy(proto, '_cacheSession');
        expect(cacheSpy.called).toBe(false);
        proto._buildBody();
        expect(cacheSpy.called).toBe(true);
        expect(sessionStorage.getItem('strophe-bosh-session')).toBe(null);
        conn.authenticated = true;
        proto._buildBody();
        expect(sessionStorage.getItem('strophe-bosh-session')).toBeTruthy();
        expect(cacheSpy.called).toBe(true);
        conn.authenticated = false;
        proto._buildBody();
        expect(sessionStorage.getItem('strophe-bosh-session')).toBe(null);
        expect(cacheSpy.called).toBe(true);
    });

    it('the request ID (RID) has the proper value whenever a session is restored', () => {
        sessionStorage.removeItem('strophe-bosh-session');
        const conn = new Strophe.Connection('', { 'keepalive': true });
        conn.authenticated = true;
        conn.jid = 'dummy@localhost';
        const proto: any = conn._proto;
        proto.rid = '123456';
        proto.sid = '987654321';
        proto._cacheSession();
        delete proto.rid;
        conn.restore();
        let body = proto._buildBody();
        expect(body.tree().getAttribute('rid')).toBe('123456');
        body = proto._buildBody();
        expect(body.tree().getAttribute('rid')).toBe('123457');
        body = proto._buildBody();
        expect(body.tree().getAttribute('rid')).toBe('123458');
        delete proto.rid;
        conn.restore();
        body = proto._buildBody();
        expect(body.tree().getAttribute('rid')).toBe('123459');
    });

    it('restore can only be called with BOSH and when {keepalive: true} is passed to Strophe.Connection', () => {
        sessionStorage.removeItem('strophe-bosh-session');
        let conn = new Strophe.Connection('');
        const boshSpy = sinon.spy(conn._proto as any, '_restore');
        const checkSpy = sinon.spy(conn, '_sessionCachingSupported');
        expect(conn.restored).toBe(false);
        let caughtError: any;
        try {
            conn.restore();
        } catch (e) {
            caughtError = e;
        }
        expect(caughtError?.name).toBe('StropheSessionError');
        expect(caughtError?.message).toBe('_restore: no restoreable session.');
        expect(boshSpy.called).toBe(true);
        expect(checkSpy.called).toBe(true);

        conn = new Strophe.Connection('ws:localhost');
        let caughtError2: any;
        try {
            conn.restore();
        } catch (e) {
            caughtError2 = e;
        }
        expect(caughtError2?.name).toBe('StropheSessionError');
        expect(caughtError2?.message).toBe('The "restore" method can only be used with a BOSH connection.');
        expect(conn.restored).toBe(false);
    });

    it('the _cacheSession method caches the BOSH session tokens', () => {
        sessionStorage.removeItem('strophe-bosh-session');
        const conn = new Strophe.Connection('http://fake', { 'keepalive': true });
        const proto: any = conn._proto;
        // Nothing gets cached if there aren't tokens to cache
        proto._cacheSession();
        expect(sessionStorage.getItem('strophe-bosh-session')).toBe(null);
        // Let's create some tokens to cache
        conn.authenticated = true;
        conn.jid = 'dummy@localhost';
        proto.rid = '123456';
        proto.sid = '987654321';
        expect(sessionStorage.getItem('strophe-bosh-session')).toBe(null);
        proto._cacheSession();
        expect(sessionStorage.getItem('strophe-bosh-session')).not.toBeNull();
    });

    it('when calling "restore" without a restorable session, an exception is raised', () => {
        sessionStorage.removeItem('strophe-bosh-session');
        const conn = new Strophe.Connection('', { 'keepalive': true });
        const boshSpy = sinon.spy(conn._proto as any, '_restore');
        const checkSpy = sinon.spy(conn, '_sessionCachingSupported');
        expect(conn.restored).toBe(false);
        let caughtError: any;
        try {
            conn.restore();
        } catch (e) {
            caughtError = e;
        }
        expect(caughtError?.name).toBe('StropheSessionError');
        expect(caughtError?.message).toBe('_restore: no restoreable session.');
        expect(conn.restored).toBe(false);
        expect(boshSpy.called).toBe(true);
        expect(checkSpy.called).toBe(true);
    });

    it('"restore" takes an optional JID argument for more precise session verification', () => {
        sessionStorage.removeItem('strophe-bosh-session');
        const conn = new Strophe.Connection('', { 'keepalive': true });
        const boshSpy = sinon.spy(conn._proto as any, '_restore');
        const checkSpy = sinon.spy(conn, '_sessionCachingSupported');
        const proto: any = conn._proto;
        // Let's create some tokens to cache
        conn.authenticated = true;
        conn.jid = 'dummy@localhost';
        proto.rid = '1234567';
        proto.sid = '9876543210';
        proto._cacheSession();

        let caughtError: any;
        try {
            conn.restore('differentdummy@localhost');
        } catch (e) {
            caughtError = e;
        }
        expect(caughtError?.name).toBe('StropheSessionError');
        expect(caughtError?.message).toBe('_restore: no restoreable session.');
        expect(conn.restored).toBe(false);
        expect(boshSpy.called).toBe(true);
        expect(checkSpy.called).toBe(true);

        // Check that passing in the right jid but with a resource is not a problem.
        conn.restore('dummy@localhost/with_resource');
        expect(conn.jid).toBe('dummy@localhost');
        expect(proto.rid).toBe('1234567');
        expect(proto.sid).toBe('9876543210');
        expect(conn.restored).toBe(true);
    });

    it('when calling "restore" with a restorable session, bosh._attach is called with the session tokens', () => {
        sessionStorage.removeItem('strophe-bosh-session');
        const conn = new Strophe.Connection('', { 'keepalive': true });
        conn.authenticated = true;
        conn.jid = 'dummy@localhost';
        const proto: any = conn._proto;
        proto.rid = '123456';
        proto.sid = '987654321';
        proto._cacheSession();
        delete proto.rid;
        delete proto.sid;
        delete proto.jid;
        expect(conn.restored).toBe(false);

        const boshSpy = sinon.spy(proto, '_restore');
        const checkSpy = sinon.spy(conn, '_sessionCachingSupported');
        const attachSpy = sinon.spy(proto, '_attach');
        conn.restore();
        expect(conn.jid).toBe('dummy@localhost');
        expect(proto.rid).toBe('123456');
        expect(proto.sid).toBe('987654321');
        expect(conn.restored).toBe(true);
        expect(boshSpy.called).toBe(true);
        expect(checkSpy.called).toBe(true);
        expect(attachSpy.called).toBe(true);
    });
});

describe('BOSH next valid request id', () => {
    it('nextValidRid is called after successful request', () => {
        Strophe.Connection.prototype._onIdle = () => {};
        const conn = new Strophe.Connection('http://fake');
        const spy = sinon.spy(conn, 'nextValidRid');
        const req: any = { id: 43, sends: 1, xhr: new XHR(200, 4), rid: 42 };
        conn._requests = [req];
        (conn._proto as any)._onRequestStateChange(function () {}, req);
        expect(spy.calledOnce).toBe(true);
        expect(spy.calledWith(43)).toBe(true);
    });

    it('nextValidRid is not called after failed request', () => {
        Strophe.Connection.prototype._onIdle = () => {};
        const conn = new Strophe.Connection('http://fake');
        const spy = sinon.spy(conn, 'nextValidRid');
        const req: any = { id: 43, sends: 1, xhr: new XHR(0, 4), rid: 42 };
        conn._requests = [req];
        (conn._proto as any)._onRequestStateChange(function () {}, req);
        expect(spy.called).toBe(false);
    });

    it('nextValidRid is called after failed request with disconnection', () => {
        sinon.stub(Math, 'random').callsFake(() => 1);
        Strophe.Connection.prototype._onIdle = () => {};
        const conn = new Strophe.Connection('http://fake');
        const spy = sinon.spy(conn, 'nextValidRid');
        const req: any = { id: 43, sends: 1, xhr: new XHR(404, 4), rid: 42 };
        conn._requests = [req];
        (conn._proto as any)._onRequestStateChange(function () {}, req);
        expect(spy.calledOnce).toBe(true);
        expect(spy.calledWith(4294967295)).toBe(true);
        (Math.random as unknown as sinon.SinonStub).restore();
    });

    it('nextValidRid is called after connection reset', () => {
        sinon.stub(Math, 'random').callsFake(() => 1);
        Strophe.Connection.prototype._onIdle = () => {};
        const conn = new Strophe.Connection('http://fake');
        const spy = sinon.spy(conn, 'nextValidRid');
        conn.reset();
        expect(spy.calledOnce).toBe(true);
        expect(spy.calledWith(4294967295)).toBe(true);
        (Math.random as unknown as sinon.SinonStub).restore();
    });
});
