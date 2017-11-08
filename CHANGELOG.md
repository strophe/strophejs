# Strophe.js Change Log

## Version 1.2.15 - (Unreleased)
* #259 XML element should be sent to xmlOutput
* #266 Support Browserify/CommonJS. `require('strophe.js/src/wrapper')`

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

* Fix security bug where DIGEST-MD5 client nonce was not properly
  randomized.
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
