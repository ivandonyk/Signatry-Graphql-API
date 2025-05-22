// For ticket TS-732

import { getOrCreateConnection } from '../../typeorm';
import { Recipient } from '../../models';

import GuidestarClient, { GuideStarGetCharityDataResponse } from '../../guidestar/client';

async function updateGuidestarCharitiesInDBWithNewFields() {
    const connection = await getOrCreateConnection();
    const client = new GuidestarClient();
    const manager = connection.manager;

    async function mapGuideStarDataToUpdateRecipient(data: GuideStarGetCharityDataResponse) {
        await manager
            .createQueryBuilder()
            .update(Recipient)
            .set({
                bmfOrganizationName: data.charitycheck.bmf_organization_name,
                foundationTypeCode: data.charitycheck.foundation_type_code,
                foundationTypeDescription: data.charitycheck.foundation_type_description,
                alsoKnownAs: data.summary.also_known_as
            })
            .where('recipient.ein = :ein', { ein: data.summary.ein })
            .execute();

        return await manager.findOne(Recipient, {
            ein: data.summary.ein
        });
    }

    const charities = await manager
        .createQueryBuilder(Recipient, 'recipient')
        .where('recipient.nteeCode IS NOT NULL')
        .getMany();

    charities.forEach(async (charity, index) => {
        setTimeout(async _ => {
            try {
                const guidestarData = await client.getCharityData(charity.ein);
                const recipient = await mapGuideStarDataToUpdateRecipient(guidestarData);
                console.log(guidestarData);
                console.log(`Recipient ${recipient.name} successfully updated`);
            } catch (error) {
                console.log(`Error updating recipient with EIN ${charity.ein}`);
                console.log(error);
            }
        }, index * 10000); // Run once every 10 seconds to prevent rate-limiting from Guidestar
    });
}

updateGuidestarCharitiesInDBWithNewFields();
