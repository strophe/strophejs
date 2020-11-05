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

export { Strophe, $build, $iq, $msg, $pres } from './core';

export const { b64_sha1 } = strophe.SHA1;
