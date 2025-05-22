import { getOrCreateConnection } from '../../typeorm';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const institutionAccts = await connection.query(
        "UPDATE institution_account SET email = 'qa.spiredigital@gmail.com'"
    );

    process.exit(0);
})();
