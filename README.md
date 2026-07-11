# Strophe.js

[![Build Status](https://github.com/strophe/strophejs/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/strophe/strophejs/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/strophe.js.svg)](https://www.npmjs.com/package/strophe.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt)

Strophe.js is a JavaScript library for building real-time [XMPP](https://xmpp.org/)
applications. It runs in browsers, Node.js and React Native, speaking XMPP over
WebSockets ([RFC 7395](https://tools.ietf.org/html/rfc7395)) or BOSH/HTTP
([XEP-0124](https://xmpp.org/extensions/xep-0124.html) and
[XEP-0206](https://xmpp.org/extensions/xep-0206.html)).

## Features

- **Modern stanza creation** with the `stx` tagged template literal (values are
  auto-escaped), plus the classic `$iq`/`$msg`/`$pres` builder API.
- **WebSocket and BOSH** transports, and a [SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker)
  transport that shares a single connection across browser tabs.
- **Native [Stream Management (XEP-0198)](https://xmpp.org/extensions/xep-0198.html)**:
  server-acknowledged stanzas and session resumption after a dropped connection.
- **Written in TypeScript**, shipping type definitions and ESM, CommonJS and UMD builds.
- **Multiple SASL mechanisms**: SCRAM-SHA-1/256/384/512, PLAIN, EXTERNAL, OAuth Bearer, X-OAuth2 and Anonymous.
- **Small and dependency-free** in the browser.

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Creating stanzas](#creating-stanzas)
- [Handling incoming stanzas](#handling-incoming-stanzas)
- [Stream Management (XEP-0198)](#stream-management-xep-0198)
- [Sharing a connection between tabs](#sharing-a-connection-between-tabs)
- [Connecting as an external component (XEP-0114)](#connecting-as-an-external-component-xep-0114)
- [Running in different environments](#running-in-different-environments)
- [Documentation and community](#documentation-and-community)
- [Contributing](#contributing)
- [License](#license)
- [Author and history](#author-and-history)

## Installation

```bash
npm install strophe.js
```

Then import what you need:

```javascript
import { Strophe, stx } from 'strophe.js';
```

Or load it from a CDN in a plain web page, which exposes `Strophe`, `stx`,
`$iq`, `$msg`, `$pres` and `$build` as globals:

```html
<script src="https://cdn.jsdelivr.net/npm/strophe.js/dist/strophe.umd.min.js"></script>
```

## Quick start

```javascript
import { Strophe, stx } from 'strophe.js';

const conn = new Strophe.Connection('wss://example.org/xmpp-websocket');

conn.connect('romeo@example.org', 'password', (status) => {
    if (status === Strophe.Status.CONNECTED) {
        // Receive incoming chat messages
        conn.addHandler(onMessage, null, 'message', 'chat');

        // Announce our presence
        conn.send(stx`<presence xmlns="jabber:client"/>`);

        // Send a message
        conn.send(stx`
            <message to="juliet@example.org" type="chat" xmlns="jabber:client">
                <body>Art thou online?</body>
            </message>`);
    }
});

function onMessage(stanza) {
    const body = stanza.querySelector('body')?.textContent;
    if (body) console.log(`${stanza.getAttribute('from')} says: ${body}`);
    return true; // returning true keeps the handler registered
}
```

## Creating stanzas

### With the `stx` tagged template literal (recommended)

`stx` lets you write the stanza XML directly. Interpolated values are escaped
automatically, so it is safe against injection, and templates compose and nest:

```javascript
import { stx } from 'strophe.js';

const to = 'juliet@example.org';
const text = 'Wherefore art thou?';

const msg = stx`
    <message to="${to}" type="chat" xmlns="jabber:client">
        <body>${text}</body>
    </message>`;

conn.send(msg);
```

Arrays of stanzas are flattened, and `null`/`undefined` values are omitted, so
you can build a stanza from a list:

```javascript
const items = jids.map((jid) => stx`<item jid="${jid}"/>`);
const iq = stx`
    <iq type="set" xmlns="jabber:client">
        <query xmlns="jabber:iq:roster">${items}</query>
    </iq>`;
```

To insert a pre-built XML string without escaping, wrap it in
`Strophe.Stanza.unsafeXML(...)`. Only do this with trusted input.

### With the builder API

The older jQuery-style helpers (`$iq`, `$msg`, `$pres`, `$build`) remain fully
supported and are equivalent to the `stx` output:

```javascript
import { $msg } from 'strophe.js';

const msg = $msg({ to: 'juliet@example.org', type: 'chat' }).c('body').t('Wherefore art thou?');

conn.send(msg);
```

To parse a raw XML string into an `Element`, use `Strophe.Stanza.toElement(str)`.

## Handling incoming stanzas

Register callbacks with `addHandler(callback, ns, name, type, id, from)`. Any
argument can be `null` to match anything. Return `true` from the callback to keep
it registered, or `false` to remove it after one call.

```javascript
// All roster pushes
conn.addHandler(onRoster, 'jabber:iq:roster', 'iq', 'set');

// A specific IQ response, by id
const ref = conn.addHandler(onResult, null, 'iq', null, 'iq-123');
conn.deleteHandler(ref); // remove it later
```

For request/response IQs, `sendIQ(stanza, onResult, onError, timeout)` returns
the response to a callback (or times out) instead of you tracking the id yourself.

## Stream Management (XEP-0198)

Since version 4.1.0, Strophe.js natively supports
[XEP-0198 Stream Management](https://xmpp.org/extensions/xep-0198.html) on WebSocket
connections: sent stanzas are acknowledged by the server, and a dropped connection can be
resumed without losing them.

It is off by default. Opt in when creating the connection:

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
Resumable state is kept in `sessionStorage` by default. Pass a custom
`streamManagement.storage` backend to change that.

## Sharing a connection between tabs

With the `worker` connection option, all tabs of your application share a single WebSocket
connection through a SharedWorker. Point it at `dist/shared-connection-worker.js`.

One tab is assigned the `primary` role and drives the connection. The others attach to it
as `secondary` and are promoted automatically if the primary tab goes away (see
`Connection.onRoleChanged`). When Stream Management is enabled, the XEP-0198 engine runs
inside the worker itself, so a single SM session covers all tabs and a stanza sent from
any tab survives resumption.

Messages and presences sent from one tab are reflected to all the other tabs, so every tab
can render what any other tab sent (override `Connection.onForeignStanzaSent` to receive them).
They are deliberately kept out of the regular stanza handlers, which only see _received_
traffic.

## Connecting as an external component (XEP-0114)

Strophe.js can attach to an XMPP server as an
[XEP-0114](https://xmpp.org/extensions/xep-0114.html) external component
(`jabber:component:accept`) over a raw TCP stream. This is useful for building gateways,
bots and services that run alongside the server rather than as a regular client.

This transport is **Node-only** and is not part of the browser build. Select it with the
`protocol: 'component'` option and a `tcp://host:port` service URL. The `jid` you pass
to `connect()` is the component's own domain and the `pass` is the shared secret configured
on the server:

```javascript
import { Strophe, stx } from 'strophe.js';

const conn = new Strophe.Connection('tcp://localhost:5347', { protocol: 'component' });

conn.connect('component.example.org', 'the-shared-secret', (status) => {
    if (status === Strophe.Status.CONNECTED) {
        // The component is authenticated. Send and receive stanzas as usual;
        // handlers, IQ callbacks and plugins all work unchanged.
        conn.send(stx`
            <message xmlns="jabber:client"
                     from="component.example.org"
                     to="user@example.org">
                <body>Hello from the component</body>
            </message>`);
    } else if (status === Strophe.Status.AUTHFAIL) {
        console.error('Wrong shared secret');
    }
});
```

Unlike a client-to-server stream there is no SASL, TLS negotiation or resource binding.
After the stream is opened the component authenticates with a single SHA-1 handshake and is
then `CONNECTED`. A component **must** stamp a `from` attribute (a JID under its own domain)
on the stanzas it sends; the transport adds one automatically when it is missing, but you
can also set it explicitly (for example a sub-JID such as `room@component.example.org`).

The server needs a component listener, for example ejabberd's `ejabberd_service` on port
5347, or in Prosody:

```lua
Component "component.example.org"
    component_secret = "the-shared-secret"
```

## Running in different environments

### Browsers

Strophe.js runs in all modern browsers.

### Node.js

When running in Node.js, install these additional packages, which provide the WebSocket and
DOM APIs that browsers supply natively:

```bash
npm install @xmldom/xmldom ws
```

`@xmldom/xmldom` is a small, pure-JavaScript XML DOM (needed for `DOMParser`, `XMLSerializer`
and `document.implementation`).

The XEP-0114 external component transport additionally uses the `saxes` streaming XML
parser. Install it as well if you use that transport:

```bash
npm install saxes
```

### React Native

Since version 1.6.0 the [WebCrypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
API (included by default in browsers and Node.js) is used for crypto primitives such as hashing
and signatures. This API is not available in React Native, so integrators need a third-party
implementation of it to use Strophe there.

## Documentation and community

- [Homepage](https://strophe.im/strophejs/)
- [API documentation](https://strophe.im/strophejs)
- [Community plugins](https://github.com/strophe/strophejs-plugins)
- [Changelog](CHANGELOG.md)

## Contributing

Pull requests and issues are welcome. To run the test suite:

```bash
npm test
```

This builds the library, runs the tests and lints the source. If you have
[GNU Make](https://www.gnu.org/software/make/) available, `make check` does the same.

## License

Strophe.js is licensed under the [MIT license](https://github.com/strophe/strophejs/raw/master/LICENSE.txt).

## Author and history

Strophe.js was created by Jack Moffitt. It was originally developed for Chesspark, an online
chess community based on XMPP technology. It has been cared for and improved over the years and
is currently maintained by JC Brand.

The book [Professional XMPP Programming with JavaScript and jQuery](http://professionalxmpp.com)
covers Strophe in detail in the context of web applications.
