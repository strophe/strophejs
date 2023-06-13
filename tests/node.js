/* eslint-env node */

const { Strophe, $iq, $msg, $build, $pres } = require('../dist/strophe.common.js');

global.sinon = require('sinon');
global.XMLHttpRequest = require('xhr2');

global.Strophe = Strophe;
global.$iq = $iq;
global.$msg = $msg;
global.$build = $build;
global.$pres = $pres;
