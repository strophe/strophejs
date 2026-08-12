/**
 * What XML 1.0 says a document may be made of, character by character.
 *
 * Kept in a module of its own because the `stx` builder and the Node DOM shim
 * both have to ask this, and neither is somewhere the other can import from.
 * It pulls in nothing itself, so the shim can have it at load time without
 * dragging the library along behind it.
 */

/**
 * Anything outside the `Char` production of XML 1.0 § 2.2.
 *
 * Tab, line feed and carriage return are the only control characters XML has;
 * the rest of C0, the unpaired surrogates and the two non-characters at the end
 * of the BMP cannot appear in a document at all, not even written as a
 * character reference. The `u` flag is what makes the last range mean whole
 * code points, so an astral character is one character here rather than the two
 * surrogates it is stored as.
 */
// eslint-disable-next-line no-control-regex -- the three XML does allow have to be named to be allowed
const NOT_XML_CHAR = /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u;

/**
 * Where a string first holds something XML cannot represent.
 */
export interface DisallowedChar {
    /** The offending code point, written the way Unicode writes one. */
    point: string;
    /** Where in the string it was found. */
    index: number;
}

/**
 * The first character of `text` which XML cannot represent, if it holds one.
 *
 * The caller words its own error, since what is worth saying depends on where
 * the text came from: a value handed to `stx` can be pointed at and named,
 * whereas a document arriving at the parser can only be refused.
 *
 * @param text
 * @returns The character and where it is, or null if the text is entirely
 *  representable.
 */
export function findDisallowedChar(text: string): DisallowedChar | null {
    const found = NOT_XML_CHAR.exec(text);
    if (!found) return null;

    const point = (found[0].codePointAt(0) as number).toString(16).toUpperCase().padStart(4, '0');
    return { point: `U+${point}`, index: found.index };
}
