/*global global*/

import './bosh';
import './websocket';
import './worker-websocket';
import * as strophe from './core';

global.$build = strophe.default.$build;
global.$iq = strophe.default.$iq;
global.$msg = strophe.default.$msg;
global.$pres = strophe.default.$pres;
global.Strophe = strophe.default.Strophe;
global.b64_sha1 = strophe.default.b64_sha1;

export { Strophe, $build, $iq, $msg, $pres, b64_sha1 } from './core';
