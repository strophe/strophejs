import type Connection from './connection';
import SASLMechanism from './sasl';
import scram from './scram';

class SASLSHA512 extends SASLMechanism {
    constructor(mechname = 'SCRAM-SHA-512', isClientFirst = true, priority = 72) {
        super(mechname, isClientFirst, priority);
    }

    test(connection: Connection): boolean {
        return connection.authcid !== null && scram.supported();
    }

    async onChallenge(connection: Connection, challenge?: string): Promise<string | false> {
        return await scram.scramResponse(connection, challenge, 'SHA-512', 512);
    }

    clientChallenge(connection: Connection, test_cnonce?: string): string {
        return scram.clientChallenge(connection, test_cnonce);
    }
}

export default SASLSHA512;
