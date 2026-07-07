# Strophe.js

![Build Status](https://github.com/strophe/strophejs/actions/workflows/karma-tests.yml/badge.svg)

Strophe.js is a JavaScript library for speaking XMPP via BOSH
([XEP 124](https://xmpp.org/extensions/xep-0124.html)
and [XEP 206](https://xmpp.org/extensions/xep-0206.html)) and WebSockets
([RFC 7395](http://tools.ietf.org/html/rfc7395)).

It runs in both NodeJS and in web browsers, and its purpose is to enable real-time
XMPP applications.

## Quick Links

- [Homepage](https://strophe.im/strophejs/)
- [Documentation](https://strophe.im/strophejs)
- [Mailing list](https://groups.google.com/g/strophe)
- [Community Plugins](https://github.com/strophe/strophejs-plugins)

## Stream Management (XEP-0198)

Since version 4.1.0, Strophe.js natively supports
[XEP-0198 Stream Management](https://xmpp.org/extensions/xep-0198.html) on websocket
connections: sent stanzas are acknowledged by the server, and a dropped connection can be
resumed without losing them.

It is off by default; opt in when creating the connection:

```javascript
const conn = new Strophe.Connection(service, {
    enableStreamManagement: true,
    // Optional fine-tuning:
    streamManagement: {
        maxUnacked: 5, // request an ack every N sent stanzas
        requestResume: true, // ask the server for a resumable session
    },
});
```

After connecting, `conn.hasResumed()` tells you whether the previous session was resumed
(skip re-fetching the roster, re-joining rooms etc.) or a fresh session was established.
Resumable state is kept in `sessionStorage` by default; pass a custom
`streamManagement.storage` backend to change that.

### Sharing a connection between tabs

With the `worker` connection option, all tabs of your application share a single websocket
connection through a SharedWorker. Point it at `dist/shared-connection-worker.js`.

One tab is assigned the `primary` role and drives the connection; the others attach to it
as `secondary` and are promoted automatically if the primary tab goes away (see
`Connection.onRoleChanged`). When Stream Management is enabled, the XEP-0198 engine runs
inside the worker itself, so a single SM session covers all tabs and a stanza sent from
any tab survives resumption.

Messages and presences sent from one tab are reflected to all the other tabs, so every tab
can render what any other tab sent (override `Connection.onForeignStanzaSent` to receive them).
They are deliberately kept out of the regular stanza handlers, which only see _received_
traffic.

## Support in different environments

### Browsers

Versions <= 1.2.16 have been tested on Firefox, Firefox for Android, IE, Safari,
Mobile Safari, Chrome, Chrome for Android, Opera and the mobile Opera browser.

Since version 1.3.0, support for IE < 11 has been dropped.

### Node.js

When running in Node.js, you'll need to install these additional packages:

```bash
npm install jsdom ws
```

These provide the required WebSocket and DOM APIs that are normally available in browsers.

### React Native

Since version 1.6.0 the [WebCrypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
API (included by default in Browsers and NodeJS) is used for crypto primitives
such as hashing and signatures.

Unfortunately this API is not available in React Native, and integrators will
need to look for a 3rd party implementations of this API if they want to use
Strophe there.

## Running tests

You can run `npm run test`, or alternatively if you have [GNU Make](https://www.gnu.org/software/make/) available,
you can run `make check`.

## License

Strophe.js is licensed under the [MIT license](https://github.com/strophe/strophejs/raw/master/LICENSE.txt).

## Author & History

Strophe.js was created by Jack Moffitt. It was originally developed
for Chesspark, an online chess community based on XMPP technology. It has been
cared for and improved over the years and is currently maintained by many
people in the community.

The book [Professional XMPP Programming with JavaScript and jQuery](http://professionalxmpp.com)
covers Strophe in detail in the context of web applications.
