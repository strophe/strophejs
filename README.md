# Strophe.js

[![Build Status](https://travis-ci.org/strophe/strophejs.png?branch=master)](https://travis-ci.org/strophe/strophejs)

Strophe.js is a JavaScript library for speaking XMPP via BOSH
([XEP 124](https://xmpp.org/extensions/xep-0124.html)
and [XEP 206](https://xmpp.org/extensions/xep-0206.html)) and WebSockets
([RFC 7395](http://tools.ietf.org/html/rfc7395)).

Its primary purpose is to enable web-based, real-time XMPP applications that
run in any browser.

The book [Professional XMPP Programming with JavaScript and jQuery](http://professionalxmpp.com)
covers Strophe in detail in the context of web applications.

## Quick Links

* [Homepage](https://strophe.im/strophejs/)
* [Documentation](https://strophe.im/strophejs/doc/1.4.2/files/strophe-umd-js.html)
* [Mailing list](https://groups.google.com/g/strophe)
* [Community Plugins](https://github.com/strophe/strophejs-plugins)

## Browser support

Versions <= 1.2.16 have been tested on Firefox, Firefox for Android, IE, Safari,
Mobile Safari, Chrome, Chrome for Android, Opera and the mobile Opera browser.

Since version 1.3.0, support for IE < 11 has been dropped.

## Running tests

You'll need to have [GNU Make](https://www.gnu.org/software/make/) available.
Then, simply run `make check` to run the tests.

## License

It is licensed under the [MIT license](https://github.com/strophe/strophejs/raw/master/LICENSE.txt),
except for the files sha1.js, base64.js and md5.js, which are licensed as public domain and BSD (see these files for details).

## Author & History

Strophe.js was originally created by Jack Moffitt. It was originally developed
for Chesspark, an online chess community based on XMPP technology. It has been
cared for and improved over the years and is currently maintained by many
people in the community.
