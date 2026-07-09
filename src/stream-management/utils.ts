/**
 * XEP-0198 Stream Management
 *
 * Environment-free helpers.
 *
 * IMPORTANT: this module must be loadable in a SharedWorker global (it is
 * bundled into dist/shared-connection-worker.js), so keep it free of imports
 * beyond constants (no ../utils.ts or ../builder.ts, and no *module-level DOM access).
 */
import { NS } from '../constants';
import { SMState } from './types';

/** The 'h' counter is an unsignedInt that wraps back to zero (XEP-0198 §4). */
export const H_WRAP = 2 ** 32;

/** Stanza names that count towards the 'h' counters (XEP-0198 §4). */
const COUNTABLE = ['iq', 'presence', 'message'];

/**
 * Escapes invalid xml characters (duplicated from ../utils.ts so the worker
 * bundle doesn't pull in utils and its dependencies).
 * @param text
 */
export function xmlEscape(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&apos;')
        .replace(/"/g, '&quot;');
}

/**
 * @returns A fresh, inactive SM state object.
 */
export function freshState(): SMState {
    return {
        boundJid: null,
        enableSent: false,
        enabled: false,
        hIn: 0,
        hOutAcked: 0,
        id: null,
        location: null,
        max: null,
        resumeSupported: false,
        resumed: false,
        sinceLastAck: 0,
        unacked: [],
    };
}

/**
 * Parse an 'h' attribute value into a wrapped unsigned 32-bit counter value.
 * @param value - The attribute value (may be undefined).
 * @returns The parsed value, or null if missing or invalid.
 */
export function parseH(value: string): number {
    if (typeof value !== 'string') return null;
    const h = parseInt(value, 10);
    return Number.isNaN(h) || h < 0 ? null : h % H_WRAP;
}

/**
 * @param name - A top-level element's local tag name.
 * @returns true if the element counts towards the SM 'h' counters.
 */
export function isCountableStanza(name: string): boolean {
    return COUNTABLE.includes(name);
}

/**
 * Remove the `from` attribute from a serialized stanza's root element, so a
 * re-sent stanza cannot carry a stale resource after a failed resumption. Only
 * the root opening tag is touched; nested `from` attributes (forwarded stanzas,
 * MUC addresses) are preserved. The server stamps the authoritative c2s `from`.
 * DOM-free string surgery, mirroring stampDelay.
 * @param serialized - The serialized stanza.
 * @returns The stanza with the root `from` removed (unchanged if none).
 */
export function stripFrom(serialized: string): string {
    const end = serialized.indexOf('>');
    if (end === -1) {
        return serialized;
    }
    const openTag = serialized.slice(0, end);
    const rest = serialized.slice(end);

    // Values cannot contain their own delimiter quote (the serializer escapes it),
    // so a non-greedy match to the matching quote is safe. The leading \s is
    // consumed too, leaving no double space. Only the first (root) from is removed.
    const stripped = openTag.replace(/\sfrom=(["'])[\s\S]*?\1/, '');
    return stripped === openTag ? serialized : stripped + rest;
}

/**
 * Insert a XEP-0203 <delay/> child into a serialized stanza (DOM-free string
 * surgery). Used when re-sending salvaged stanzas after a failed resumption,
 * so the receiving client can show the original send time.
 * @param serialized - The serialized stanza.
 * @param name - The stanza's local tag name.
 * @param queuedAt - The original queueing time (ms since epoch).
 * @returns The stanza with a <delay/> child, or the unmodified input if it
 *     already carries one (or is malformed).
 */
export function stampDelay(serialized: string, name: string, queuedAt: number): string {
    if (serialized.includes(NS.DELAY)) {
        return serialized;
    }
    const delay = `<delay xmlns="${NS.DELAY}" stamp="${new Date(queuedAt).toISOString()}"/>`;
    if (serialized.endsWith('/>')) {
        return `${serialized.slice(0, -2)}>${delay}</${name}>`;
    }
    const idx = serialized.lastIndexOf(`</${name}`);
    if (idx === -1) {
        return serialized;
    }
    return serialized.slice(0, idx) + delay + serialized.slice(idx);
}
