const utils = {

    utf16to8: function (str) {
        var i, c;
        var out = "";
        var len = str.length;
        for (i = 0; i < len; i++) {
            c = str.charCodeAt(i);
            if ((c >= 0x0000) && (c <= 0x007F)) {
                out += str.charAt(i);
            } else if (c > 0x07FF) {
                out += String.fromCharCode(0xE0 | ((c >> 12) & 0x0F));
                out += String.fromCharCode(0x80 | ((c >>  6) & 0x3F));
                out += String.fromCharCode(0x80 | ((c >>  0) & 0x3F));
            } else {
                out += String.fromCharCode(0xC0 | ((c >>  6) & 0x1F));
                out += String.fromCharCode(0x80 | ((c >>  0) & 0x3F));
            }
        }
        return out;
    },

    addCookies: function (cookies) {
        /* Parameters:
         *  (Object) cookies - either a map of cookie names
         *    to string values or to maps of cookie values.
         *
         * For example:
         * { "myCookie": "1234" }
         *
         * or:
         * { "myCookie": {
         *      "value": "1234",
         *      "domain": ".example.org",
         *      "path": "/",
         *      "expires": expirationDate
         *      }
         *  }
         *
         *  These values get passed to Strophe.Connection via
         *   options.cookies
         */
        cookies = cookies || {};
        for (const cookieName in cookies) {
            if (Object.prototype.hasOwnProperty.call(cookies, cookieName)) {
                let expires = '';
                let domain = '';
                let path = '';
                const cookieObj = cookies[cookieName];
                const isObj = typeof cookieObj === "object";
                const cookieValue = escape(unescape(isObj ? cookieObj.value : cookieObj));
                if (isObj) {
                    expires = cookieObj.expires ? ";expires="+cookieObj.expires : '';
                    domain = cookieObj.domain ? ";domain="+cookieObj.domain : '';
                    path = cookieObj.path ? ";path="+cookieObj.path : '';
                }
                document.cookie =
                    cookieName+'='+cookieValue + expires + domain + path;
            }
        }
    }
};

export { utils as default };
