import { Strophe } from '../dist/strophe.node.esm.js';
import { XHR } from './helpers.js';
import { describe, it, expect, vi } from 'vitest';

describe('Misc', () => {
    it('Function binding', () => {
        const spy = vi.fn();
        const obj = {};
        const arg1 = 'foo';
        const arg2 = 'bar';
        const arg3 = 'baz';

        const f = spy.bind(obj, arg1, arg2);
        f(arg3);
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.contexts[0]).toBe(obj);
        expect(spy).toHaveBeenCalledWith(arg1, arg2, arg3);
    });

    it('Connfail for invalid XML', () => {
        const req = new Strophe.Request('' as any, function () {}, 0);
        req.xhr = new XHR(undefined, undefined, 'text') as unknown as XMLHttpRequest;

        const conn = new Strophe.Connection('http://fake');
        let caughtCondition: string | undefined;
        conn.connect_callback = function (status, condition) {
            if (status === Strophe.Status.CONNFAIL) {
                caughtCondition = condition as string;
            }
        };
        conn._connect_cb(req);
        expect(caughtCondition).toBe('bad-format');
    });

    it('Aborted requests do nothing', () => {
        Strophe.Connection.prototype._onIdle = () => {};
        const conn = new Strophe.Connection('http://fake');

        // simulate a finished but aborted request
        const req: any = { id: 43, sends: 1, xhr: new XHR(undefined, 4), abort: true };
        conn._requests = [req];
        const spy = vi.fn();
        (conn._proto as any)._onRequestStateChange(spy, req);

        expect(req.abort).toBe(false);
        expect(conn._requests.length).toBe(1);
        expect(spy).not.toHaveBeenCalled();
    });

    it('Incomplete requests do nothing', () => {
        Strophe.Connection.prototype._onIdle = () => {};
        const conn = new Strophe.Connection('http://fake');
        const req: any = { id: 44, sends: 1, xhr: new XHR(undefined, 3) };
        conn._requests = [req];
        const spy = vi.fn();
        (conn._proto as any)._onRequestStateChange(spy, req);
        expect(conn._requests.length).toBe(1);
        expect(spy).not.toHaveBeenCalled();
    });
});
