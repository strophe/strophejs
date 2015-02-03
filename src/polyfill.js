(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else {
        // Browser globals
        factory();
    }
}(this, function () {

    /** PrivateFunction: Function.prototype.bind
     *  Bind a function to an instance. This is a polyfill for the ES5 bind method.
     *  which already exists in more modern browsers, but we provide it to support
     *  those that don't.
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
                return func.apply(obj ? obj : this,
                                  _concat.call(_args,
                                               _slice.call(arguments, 0)));
            };
        };
    }

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
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function(elt /*, from*/) {
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
}));
