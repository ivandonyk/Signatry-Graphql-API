import { Fund, FundRole, FundUserProfile, UserProfile } from '../models';
import { FundRoleNameValues } from '../models/FundRole';
import { Connection } from 'typeorm';

export async function addUserToFund(userProfile: UserProfile, fund: Fund, connection: Connection) {
    const fundRole = await connection
        .getRepository(FundRole)
        .findOne({ name: FundRoleNameValues.NO_ACCESS });
    const fundUserProfileRepo = connection.getRepository(FundUserProfile);
    const existingRole = await fundUserProfileRepo.findOne({
        fundId: fund.id,
        userProfileId: userProfile.id
    });
    if (!existingRole) {
        await fundUserProfileRepo.save(
            fundUserProfileRepo.create({
                fundId: fund.id,
                userProfileId: userProfile.id,
                fundRoleId: fundRole.id
            })
        );
    }
}
