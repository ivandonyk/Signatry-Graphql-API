import { getOrCreateConnection } from '../../typeorm';
import { BAAFacade } from '../../morningstar/byallaccounts/facade';
import { ByAllAccountsUser, Tenant } from '../../models';
const Cryptr = require('cryptr');

export async function createBAAUser(
    username: string,
    password: string,
    firstName: string,
    lastName: string,
    email: string
) {
    // Create user in BAA and save in our database
    const connection = await getOrCreateConnection();
    const baaFacade = new BAAFacade();
    const { CRYPT_KEY } = process.env;
    const tenant = await connection.getRepository(Tenant).findOne();
    try {
        const userCreateResponse = await baaFacade.createAdvisorUser(
            username,
            password,
            firstName,
            lastName,
            email
        );

        const crypt = new Cryptr(CRYPT_KEY);
        const baaUserRepo = connection.getRepository(ByAllAccountsUser);
        const baaUser = await baaUserRepo.save({
            loginName: username,
            loginPass: crypt.encrypt(password),
            firstName: firstName,
            lastName: lastName,
            email: email,
            userId: userCreateResponse.getUserId(),
            tenantId: tenant.id
        });
        console.log(`User ${baaUser.loginName} created successfully in ByAllAccounts`);
    } catch (error) {
        console.log('There was an error creating your ByAllAccounts user');
        console.log(error);
    }
}

// Validate args
/*
const args = process.argv.slice(2);
if (args.length !== 4) {
    console.log('Usage: node createBAAUser {username} {first name} {last name} {email}');
    process.exit(-1);
}
const username = args[0];
const password = args[1];
const firstName = args[2];
const lastName = args[3];
const email = args[4];

createBAAUser(username, password, firstName, lastName, email);
*/
