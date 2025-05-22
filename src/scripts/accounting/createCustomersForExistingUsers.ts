import { getOrCreateConnection } from '../../typeorm';
import { AccountingFacade } from '../../accounting';
import { UserProfile } from '../../models';

async function createCustomersForExistingUsers() {
    console.log("Creating customers in Intacct for users that don't have customer IDs");
    const connection = await getOrCreateConnection();
    const userRepo = connection.getRepository(UserProfile);
    const accounting = new AccountingFacade();
    const usersWithoutCustomerIds = await userRepo
        .createQueryBuilder('userProfile')
        .leftJoinAndMapOne(
            'userProfile.primaryEmail',
            'userProfile.emails',
            'email',
            'email.isPrimary = true'
        )
        .where('userProfile.accountingCustomerId IS NULL')
        .getMany();
    for (const user of usersWithoutCustomerIds) {
        const customerId = await accounting.createCustomer(
            user.firstName,
            user.lastName,
            user.primaryEmail.value
        );
        await userRepo.update(user.id, { accountingCustomerId: customerId });
    }
    return;
}
createCustomersForExistingUsers();
