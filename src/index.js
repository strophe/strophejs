/*global globalThis*/

import Strophe from './core.js';
import Builder, { $build, $msg, $pres, $iq } from './builder.js';
import { stx, toStanza } from './stanza.js';

globalThis.$build = $build;
globalThis.$iq = $iq;
globalThis.$msg = $msg;
globalThis.$pres = $pres;
globalThis.Strophe = Strophe;

export { Builder, $build, $iq, $msg, $pres, Strophe, stx, toStanza };
