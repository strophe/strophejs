/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2006-2008, OGG, LLC
*/

/* jshint undef: true, unused: true:, noarg: true, latedef: true */
/* global define */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('strophe-polyfill', [], function () {
            return factory();
        });
    } else {
        root.polyfills = factory();
    }

}(this, function () {

    var obj = {
        /**
         * Internal bind
         * @param fn
         * @param obj
         * @return {Function}
         */
        bind: function (fn, obj /*, arg1, arg2, ... */) {

            var _slice = Array.prototype.slice;
            var _concat = Array.prototype.concat;
            var _args = _slice.call(arguments, 2);

            return function () {
                return fn.apply(obj ? obj : this,
                  _concat.call(_args,
                    _slice.call(arguments, 0)));
            };
        }
    };

    /** PrivateFunction: Array.isArray
     *  This is a polyfill for the ES5 Array.isArray method.
     */
    if (!Array.isArray) {
        Array.isArray = function(arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }

    /** PrivateFunction: Array.prototype.indexOf
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
    if (!Array.prototype.indexOf)
    {
        Array.prototype.indexOf = function(elt /*, from*/)
        {
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

    return obj;

}));
