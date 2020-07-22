/*global global*/

import * as Strophe from './core';
import './bosh';
import './websocket';

global.Strophe = Strophe.default.Strophe;
global.$build = Strophe.default.$build;
global.$iq = Strophe.default.$iq;
global.$msg = Strophe.default.$msg;
global.$pres = Strophe.default.$pres;

export { default } from './core';
