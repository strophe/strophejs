# Strophe.js Change Log

## Version 3.1.2 - (Unreleased)

- Moved `jsdom` and `ws` from optionalDependencies to peerDependencies

## Version 3.1.1 - (2025-05-20)

- Strip unnecessary whitespace from `Stanza` elements
- Allow `Builder` instances to be passed into the `cnode` function
- Bugfix. Handle `null` and `undefined` values inside `stx` tagged template literals.
- Allow arrays of `UnsafeXML` instances when using `stx`
- Bump 3rd party dependencies

## Version 3.1.0 - (2024-12-16)

- **Security Fix**: Escape values passed to the `stx` tagged template literal
- Allow `Stanza` and `Builder` objects to be passed as values the `stx`.
- Avoid inserting commas when nesting array values in `stx` templates.
- Replace [xmldom](https://github.com/xmldom/xmldom) with [jsdom](https://github.com/jsdom/jsdom).
- Remove deprecated `abab` package
- Make sure `ConnectionOptions` type is exportable
- fix: invert default and types exports

## Version 3.0.1 - (2024-08-15)

* Bugfix: `Package path . is not exported from package`
* #708 Properly set exports value in package.json
* #710 Fix types minor errors
* #711 Error with Builder.up depending on context
* #712 fix: export node and default modules
* #715 Fix the error when the attrs field is null

Dependency updates:
* Bump @rollup/plugin-commonjs from 24.1.0 to 26.0.1
* Bump @xmldom/xmldom from 0.8.8 to 0.8.10
* Bump prettier from 2.8.8 to 3.3.3
* Bump sinon from 15.0.4 to 18.0.0

## Version 3.0.0 - (2024-05-07)

* #704 Cannot use with NodeJS
* #706 TypeError when receiving a `stream:error` IQ message

Out of an abundance of caution, making a major version bump, since there was
some internal refactoring of the Strophe files to remove circular
dependencies. So certain deep imports used by integrators might no longer work.
Instead of deep imports, everything should be imported from `strophe.js`.

For example:
```
import { Strophe, $build, stx } from strophe.js;
```

## Version 2.0.0 - (2024-02-21)

* Type checking via TypeScript and JSDoc typing annotations
* Types definitions are now generated and placed in `./dist/types/`.
* Remove the deprecated `matchBare` option for `Strophe.Handler`. Use `matchBareFromJid` instead.
* Add the ability to create stanzas via a tagged template literal (`stx`).
* Bugfix: Ignore unknown SCRAM attributes instead of aborting the connection

## Version 1.6.2 - (2023-06-23)

* #613 TypeError: XHTML.validTag is not a function
* Re-add NodeJS support and add the ability to run tests on NodeJS to avoid regressions

## Version 1.6.1 - (2023-05-15)

* #602 Websocket connection times out instead of being disconnected

## Version 1.6.0 - (2022-10-29)

* #314 Support for SCRAM-SHA-256 and SCRAM-SHA-512 authentication

## Version 1.5.0 - (2022-04-28)

* Add an automatic fallback handler for unhandled IQ "set" and "get" stanzas
  that returns an IQ error with `service-unavailable`.
* Update various 3rd party dependencies
* #390 Replace deprecated String.prototype.substr()
* #418 BOSH fix: mark first request dead when second is done

## Version 1.4.4 - (2022-01-21)

* #388 Properly import xmldom

## Version 1.4.3 - (2021-12-16)

* Update xmldom to version 0.7.5
* Add disconnection_timeout setting: an optional timeout in milliseconds before `_doDisconnect` is called.
* Update ws optional dependency to fix security issue https://github.com/websockets/ws/commit/00c425ec77993773d823f018f64a5c44e17023ff

## Version 1.4.2 - (2021-04-28)

* Update optional NodeJS-specific dependency xmldom to version 0.5.0 which includes a security fix.
* #369 Add `clientChallenge` SASL mechanism method to avoid having to monkey patch `onChallenge`,
  which prevents reconnection when using SCRAM-SHA1.

## Version 1.4.1 - (2020-12-02)

* #201: NodeJS related fixes: `window` and `WebSocket` are `undefined`
* New method `Strophe.Connection.prototype.setProtocol` which can be used to
  determine the protocol used after the connection has been constructed.

## Version 1.4.0 - (2020-09-10)

* #347: Bugfix. Reconnection fails when SessionResultIQ arrives too late
* #354: Strophe.js sends an authzid during PLAIN when not acting on behalf of another entity
* #359: Bugfix: WebSocket connection failed: Data frame received after close
* Add support for running a websocket connection inside a shared worker

## Version 1.3.6 - (2020-06-15)

- #250 Bugfix: OAuth's SASL priority being higher causes problems
- #352 Bugfix: Referencing undefined property

## Version 1.3.5 - (2020-04-29)

* Remove support for obselete SASL DIGEST-MD5 auth
* #329 Varous compatibility fixes to make Strophe.js work in NodeJS
* #344 Properly set Strophe.VERSION

## Version 1.3.4 - (2019-08-08)

* Replace webpack with rollup
* `TypeError: this._changeConnectStatus is not a function`
* Bugfix. Remove handlers on closed socket
* Add new Strophe.Connection option `explicitResourceBinding`.
  If is set to true the XMPP client needs to explicitly
  call `Strophe.Connection.prototype.bind` once the XMPP
  server has advertised the "urn:ietf:params:xml:ns:xmpp-bind" feature.

## Version 1.3.3 - (2019-05-13)

* The dist files are no longer included in the repo, but generated by NPM/Yarn
* Moved some log statements from INFO to DEBUG level
* Don't break when a falsy value is passed to `getResourceFromJid`

## Version 1.3.2 - (2019-03-21)

* #320 Fix error on SCRAM-SHA-1 client nonce generation

## Version 1.3.1 - (2018-11-15)

* #311 Expose `Strophe`, `$build`, `$msg` and `$iq` as globals

## Version 1.3.0 - (2018-10-21)

* Use ES2015 modules
* Drop support for Internet Explorer < 11

## Version 1.2.16 - (2018-09-16)
* #299 'no-auth-mech' error. Server did not offer a supported authentication mechanism
* #306 Fix websocket close handler exception and reporting

## Version 1.2.15 - (2018-05-21)
* #259 XML element should be sent to xmlOutput
* #266 Support Browserify/CommonJS. `require('strophe.js/src/wrapper')`
* #296 Remove error handler from old websocket before closing
* #271 SASL X-OAUTH2 authentication mechanism implemented
* #288 Strophe now logs fatal errors by default.
* Run tests with headless Chromium instead of Phantomjs

## Version 1.2.14 - 2017-06-15
* #231 SASL OAuth Bearer authentication should not require a JID node, when a user identifer
  can be retreived from the bearer token.
* #250 Show XHR error message
* #254 Set connection status to CONNFAIL after max retries
* #255 Set CONNFAIL error status when connection fails on Safari 10

## Version 1.2.13 - 2017-02-25

* Use almond to create the build. This means that the build itself is an AMD
  module and can be loaded via `require`.
* Remove Grunt as a build tool.

## Version 1.2.12 - 2017-01-15

* Reduce the priority of the SASL-EXTERNAL auth mechanism. OpenFire 4.1.1
  advertises support for SASL-EXTERNAL and the vast majority of Strophe.js
  installs are not set up to support SASL-EXTERNAl, causing them to fail
  logging users in.

## Version 1.2.11 - 2016-12-13
* 189 Strophe never reaches DISCONNECTED status after .connect(..) and
  .disconnect(..) calls while offline.
* Add `sendPresence` method, similar to `sendIQ`, i.e. for cases where you expect a
  responding presence (e.g. when leaving a MUC room).

## Version 1.2.10 - 2016-11-30
* #172 and #215: Strophe shouldn't require `from` attribute in iq response
* #216 Get inactivity attribute from session creation response
* Enable session restoration for anonymous logins

## Version 1.2.9 - 2016-10-24
* Allow SASL mechanisms to be supported to be passed in as option to `Strophe.Connection` constructor.
* Add new matching option to `Strophe.Handler`, namely `ignoreNamespaceFragment`.
* The `matchBare` matching option for `Strophe.Handler` has been renamed to
  `matchBareFromJid`. The old name will still work in this release but is
  deprecated and will be removed in a future release.
* #114 Add an error handler for HTTP calls
* #213 "XHR open failed." in BOSH in IE9
* #214 Add function to move Strophe.Builder pointer back to the root node
* #172, #215 Don't compare `to` and `to` values of sent and received IQ stanzas
  to determine correctness (we rely on UUIDs for that).

## Version 1.2.8 - 2016-09-16
* #200 Fix for webpack
* #203 Allow custom Content-Type header for requests
* #206 XML stanza attributes: there is no 'quot' escape inside 'serialize' method
* The files in `./src` are now also included in the NPM distribution.
* Add support for SASL-EXTERNAL

## Version 1.2.7 - 2016-06-17
* #193 Move phantomjs dependencies to devDependencies

## Version 1.2.6 - 2016-06-06
* #178 Added new value (CONNTIMEOUT) to Strophe.Status
* #180 bosh: check sessionStorage support before using it
* #182 Adding SASL OAuth Bearer authentication
* #190 Fix .c() to accept both text and numbers as text for the child element
* #192 User requirejs instead of require for node compat

## Version 1.2.5 - 2016-02-09
* Add a new Strophe.Connection option to add cookies
* Add new Strophe.Connection option "withCredentials"

## Version 1.2.4 - 2016-01-28
* #147 Support for UTF-16 encoded usernames (e.g. Chinese)
* #162 allow empty expectedFrom according to W3C DOM 3 Specification
* #171 Improve invalid BOSH URL handling

## Version 1.2.3 - 2015-09-01
* Bugfix. Check if JID is null when restoring a session.
* #127 IE-Fix: error on setting null value with setAttributes
* #138 New stub method nextValidRid
* #144 Change ID generator to generate UUIDs

## Version 1.2.2 - 2015-06-20
* #109 Explicitly define AMD modules to prevent errors with AlmondJS and AngularJS.
* #111 Fixed IE9 compatibility.
* #113 Permit connecting with an alternative authcid.
* #116 tree.attrs() now removes Elements when they are set to undefined
* #119 Provide the 'keepalive' option to keep a BOSH session alive across page loads.
* #121 Ensure that the node names of HTML elements copied into XHTML are lower case.
* #124 Strophe's Builder will swallow elements if given a blank string as a 'text' parameter.

## Version 1.2.1 - 2015-02-22
* Rerelease of 1.2.0 but with a semver tag and proper formatting of bower.json
  for usage with Bower.io.

## Version 1.2.0 - 2015-02-21
* Add bower package manager support.
* Add commandline testing support via qunit-phantomjs-runner
* Add integrated testing via TravisCI.
* Fix Websocket connections now use the current XMPP-over-WebSockets RFC
* #25 Item-not-found-error caused by long term request.
* #29 Add support for the Asynchronous Module Definition (AMD) and require.js
* #30 Base64 encoding problem in some older browsers.
* #45 Move xhlr plugin to strophejs-plugins repo.
* #60 Fixed deletion of handlers in websocket connections
* #62 Add `xmlunescape` method.
* #67 Use correct Content-Type in BOSH
* #70 `_onDisconnectTimeout` never tiggers because maxRetries is undefined.
* #71 switched to case sensitive handling of XML elements
* #73 `getElementsByTagName` problem with namespaced elements.
* #76 respect "Invalid SID" message
* #79 connect.pause work correctly again
* #90 The queue data was not reset in .reset() method.
* #104 Websocket connections with MongooseIM work now

## Version 1.1.3 - 2014-01-20
* Fix SCRAM-SHA1 auth now works for multiple connections at the same time
* Fix Connecting to a different server with the same connection after disconnect
* Add Gruntfile so StropheJS can now also be built using grunt
* Fix change in sha1.js that broke the caps plugin
* Fix all warnings from jshint.

## Version 1.1.2 - 2014-01-04
* Add option for synchronous BOSH connections
* moved bower.json to other repository
* Remove unused code in sha1 and md5 modules

## Version 1.1.1 - 2013-12-16
* Fix BOSH attach is working again

## Version 1.1.0 - 2013-12-11
* Add Support for XMPP-over-WebSocket
* Authentication mechanisms are now modular and can be toggled
* Transport protocols are now modular and will be chosen based on the
  connection URL. Currently supported protocols are BOSH and WebSocket
* Add Strings to some disconnects that indicate the reason
* Add option to strip <body> tags before passing to xmlInput/xmlOutput
* Fix Connection status staying at CONNFAIL or CONNECTING in certain
  error scenarios
* Add package.json for use with npm
* Add bower.json for use with bower
* Fix handlers not being removed after disconnect
* Fix legacy non-sasl authentication
* Add better tests for BOSH bind
* Fix use of deprecated functions in tests
* Remove some dead code
* Remove deprecated documentation
* Fix Memory leak in IE9
* Add An options object can be passed to a Connection constructor now
* Add "Route" Parameter for BOSH Connections
* Add Maximum number of connection attempts before disconnecting
* Add conflict condition for AUTHFAIL
* Add XHTML message support
* Fix parsing chat messages in IE
* Add SCRAM-SHA-1 SASL mechanism
* Fix escaping of messages

## Version 1.0.2 - 2011-06-19

* Fix security bug where DIGEST-MD5 client nonce was not properly randomized.
* Fix double escaping in copyElement.
* Fix IE errors related to importNode.
* Add ability to pass text into Builder.c().
* Improve performance by skipping debugging callbacks when not
  overridden.
* Wrap handler runs in try/catch so they don't affect or remove later
  handlers.
* Add ' and " to escaped characters and other escaping fixes.
* Fix _throttledRequestHandler to use proper window size.
* Fix timed handler management.
* Fix flXHR plugin to better deal with errors.
* Fix bind() to be ECMAScript 5 compatible.
* Use bosh.metajack.im in examples so they work out of the box.
* Add simple XHR tests.
* Update basic example to HTML5.
* Move community plugins to their own repository.
* Fix bug causing infinite retries.
* Fix 5xx error handling.
* Store stream:features for later use by plugins.
* Fix to prevent passing stanzas during disconnect.
* Fix handling of disconnect responses.
* Fix getBareJidFromJid to return null on error.
* Fix equality testing in matchers so that string literals and string
  objects both match.
* Fix bare matching on missing from attributes.
* Remove use of reserved word self.
* Fix various documentation errors.

## Version 1.0.1 - 2010-01-27

* Fix handling of window, hold, and wait attributes. Bug #75.

## Version 1.0 - 2010-01-01

* First release.
