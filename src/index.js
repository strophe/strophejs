/*global globalThis*/

import Strophe from './core.js';
import { $build, $msg, $pres, $iq } from './builder.js';

globalThis.$build = $build;
globalThis.$iq = $iq;
globalThis.$msg = $msg;
globalThis.$pres = $pres;
globalThis.Strophe = Strophe;

export { $build, $iq, $msg, $pres, Strophe };
