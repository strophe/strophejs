# Strophe.js

![Build Status](https://github.com/strophe/strophejs/actions/workflows/karma-tests.yml/badge.svg)

Strophe.js is a JavaScript library for speaking XMPP via BOSH
([XEP 124](https://xmpp.org/extensions/xep-0124.html)
and [XEP 206](https://xmpp.org/extensions/xep-0206.html)) and WebSockets
([RFC 7395](http://tools.ietf.org/html/rfc7395)).

It runs in both NodeJS and in web browsers, and its purpose is to enable real-time
XMPP applications.

## Quick Links

* [Homepage](https://strophe.im/strophejs/)
* [Documentation](https://strophe.im/strophejs/doc/2.0.0/files/strophe-umd-js.html)
* [Mailing list](https://groups.google.com/g/strophe)
* [Community Plugins](https://github.com/strophe/strophejs-plugins)

## Support in different environments

### Browsers

Versions <= 1.2.16 have been tested on Firefox, Firefox for Android, IE, Safari,
Mobile Safari, Chrome, Chrome for Android, Opera and the mobile Opera browser.

Since version 1.3.0, support for IE < 11 has been dropped.

### React Native

Since version 1.6.0 the [WebCrypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
API (included by default in Browsers and NodeJS) is used for crypto primitives such as hashing and signatures.
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
