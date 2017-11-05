/*
 This program is distributed under the terms of the MIT license.
 Please see the LICENSE file for details.

 Copyright 2006-2008, OGG, LLC
 */

(function (root) {
    /** Function: Function.prototype.bind
     *  Bind a function to an instance.
     *
     *  This Function object extension method creates a bound method similar
     *  to those in Python.  This means that the 'this' object will point
     *  to the instance you want.  See <MDC's bind() documentation at https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind>
     *  and <Bound Functions and Function Imports in JavaScript at http://benjamin.smedbergs.us/blog/2007-01-03/bound-functions-and-function-imports-in-javascript/>
     *  for a complete explanation.
     *
     *  This extension already exists in some browsers (namely, Firefox 3), but
     *  we provide it to support those that don't.
     *
     *  Parameters:
     *    (Object) obj - The object that will become 'this' in the bound function.
     *    (Object) argN - An option argument that will be prepended to the
     *      arguments given for the function call
     *
     *  Returns:
     *    The bound function.
     */
    if (!Function.prototype.bind) {
        Function.prototype.bind = function (obj /*, arg1, arg2, ... */) {
            var func = this;
            var _slice = Array.prototype.slice;
            var _concat = Array.prototype.concat;
            var _args = _slice.call(arguments, 1);
            return function () {
                return func.apply(obj ? obj : this, _concat.call(_args, _slice.call(arguments, 0)));
            };
        };
    }

    /** Function: Array.isArray
     *  This is a polyfill for the ES5 Array.isArray method.
     */
    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }

    /** Function: Array.prototype.indexOf
     *  Return the index of an object in an array.
     *
     *  This function is not supplied by some JavaScript implementations, so
     *  we provide it if it is missing.  This code is from:
     *  http://developer.mozilla.org/En/Core_JavaScript_1.5_Reference:Objects:Array:indexOf
     *
     *  Parameters:
     *    (Object) elt - The object to look for.
     *    (Integer) from - The index from which to start looking. (optional).
     *
     *  Returns:
     *    The index of elt in the array or -1 if not found.
     */
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (elt /*, from*/) {
            var len = this.length;
            var from = Number(arguments[1]) || 0;
            from = (from < 0) ? Math.ceil(from) : Math.floor(from);
            if (from < 0) {
                from += len;
            }

            for (; from < len; from++) {
                if (from in this && this[from] === elt) {
                    return from;
                }
            }
            return -1;
        };
    }

    /** Function: Array.prototype.forEach
     *
     *  This function is not available in IE < 9
     *
     *  See <forEach on developer.mozilla.org at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach>
     */
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function (callback, thisArg) {
            var T, k;
            if (this === null) {
                throw new TypeError(' this is null or not defined');
            }
            // 1. Let O be the result of calling toObject() passing the
            // |this| value as the argument.
            var O = Object(this);
            // 2. Let lenValue be the result of calling the Get() internal
            // method of O with the argument "length".
            // 3. Let len be toUint32(lenValue).
            var len = O.length >>> 0;
            // 4. If isCallable(callback) is false, throw a TypeError exception.
            // See: http://es5.github.com/#x9.11
            if (typeof callback !== "function") {
                throw new TypeError(callback + ' is not a function');
            }
            // 5. If thisArg was supplied, let T be thisArg; else let
            // T be undefined.
            if (arguments.length > 1) {
                T = thisArg;
            }
            // 6. Let k be 0
            k = 0;
            // 7. Repeat, while k < len
            while (k < len) {
                var kValue;
                // a. Let Pk be ToString(k).
                //        This is implicit for LHS operands of the in operator
                // b. Let kPresent be the result of calling the HasProperty
                //        internal method of O with argument Pk.
                //        This step can be combined with c
                // c. If kPresent is true, then
                if (k in O) {
                    // i. Let kValue be the result of calling the Get internal
                    // method of O with argument Pk.
                    kValue = O[k];
                    // ii. Call the Call internal method of callback with T as
                    // the this value and argument list containing kValue, k, and O.
                    callback.call(T, kValue, k, O);
                }
                // d. Increase k by 1.
                k++;
            }
            // 8. return undefined
        };
    }

// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    if (!root.btoa) {
        root.btoa = function (input) {
            /**
             * Encodes a string in base64
             * @param {String} input The string to encode in base64.
             */
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            do {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc2 = ((chr1 & 3) << 4);
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }
                output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                    keyStr.charAt(enc3) + keyStr.charAt(enc4);
            } while (i < input.length);
            return output;
        };
    }

    if (!root.atob) {
        root.atob = function (input) {
            /**
             * Decodes a base64 string.
             * @param {String} input The string to decode.
             */
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            do {
                enc1 = keyStr.indexOf(input.charAt(i++));
                enc2 = keyStr.indexOf(input.charAt(i++));
                enc3 = keyStr.indexOf(input.charAt(i++));
                enc4 = keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 !== 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 !== 64) {
                    output = output + String.fromCharCode(chr3);
                }
            } while (i < input.length);
            return output;
        };
    }
})(window || this);
