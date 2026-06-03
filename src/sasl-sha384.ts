import type Connection from './connection';
import SASLMechanism from './sasl';
import scram from './scram';

class SASLSHA384 extends SASLMechanism {
    constructor(mechname = 'SCRAM-SHA-384', isClientFirst = true, priority = 71) {
        super(mechname, isClientFirst, priority);
    }

    test(connection: Connection): boolean {
        return connection.authcid !== null;
    }

    async onChallenge(connection: Connection, challenge?: string): Promise<string | false> {
        return await scram.scramResponse(connection, challenge, 'SHA-384', 384);
    }

    clientChallenge(connection: Connection, test_cnonce?: string): string {
        return scram.clientChallenge(connection, test_cnonce);
    }
}

export default SASLSHA384;
