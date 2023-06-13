/*global global*/

import './bosh';
import './websocket';
import './worker-websocket';
import * as strophe from './core';
import * as shims from './shims';

global.$build = strophe.default.$build;
global.$iq = strophe.default.$iq;
global.$msg = strophe.default.$msg;
global.$pres = strophe.default.$pres;
global.Strophe = strophe.default.Strophe;
global.Strophe.shims = shims;

export { Strophe, $build, $iq, $msg, $pres } from './core';
