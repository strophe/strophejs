import type { Strophe as StropheType, Builder, Stanza } from './index';

declare global {
    const Strophe: typeof StropheType;
    const $build: typeof Builder;
    const $iq: typeof Builder;
    const $msg: typeof Builder;
    const $pres: typeof Builder;
    const stx: (strings: TemplateStringsArray, ...values: unknown[]) => Stanza;
    const toStanza: typeof Stanza.toElement;
}

export {};
