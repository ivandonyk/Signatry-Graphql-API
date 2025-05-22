// For ticket TS-719
// Seeds a select group of charities to limit number of GuideStar API requests
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'fast-csv';
import { getOrCreateConnection } from '../../typeorm';
import {
    Recipient,
    RecipientContact,
    RecipientContactAddress,
    RecipientContactPhone,
    RecipientStatus,
    RecipientBoardOfDirectorsMember,
    RecipientCause,
    Cause,
    RecipientContactEmail
} from '../../models';
import { RecipientStatusName } from '../../models/RecipientStatus';
import { getCauseByCode } from '../../utilities/getCauseByCode';
import { getRecipientCode } from '../../utilities/getRecipientCode';
import formatCharityName from '../../utilities/formatCharityName';
import GuidestarClient, { GuideStarGetCharityDataResponse } from '../../guidestar/client';

const usStatesSet = new Set([
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DC',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY'
]);
console.log('GUIDESTAR_ESSENTIALS_KEY: ', process.env.GUIDESTAR_ESSENTIALS_KEY);
console.log('GUIDESTAR_PREMIER_KEY: ', process.env.GUIDESTAR_PREMIER_KEY);
console.log('--');
console.log('DATABASE_CONNECTION_HOST: ', process.env.DATABASE_CONNECTION_HOST);
console.log('DATABASE_CONNECTION_PORT: ', process.env.DATABASE_CONNECTION_PORT);
console.log('DATABASE_CONNECTION_USERNAME: ', process.env.DATABASE_CONNECTION_USERNAME);
console.log('DATABASE_CONNECTION_PASSWORD: ', process.env.DATABASE_CONNECTION_PASSWORD);
console.log('DATABASE_CONNECTION_DATABASE: ', process.env.DATABASE_CONNECTION_DATABASE);
console.log('DATABASE_QUERY_LOGGING: ', process.env.DATABASE_QUERY_LOGGING);

async function seedSelectCharities() {
    const connection = await getOrCreateConnection();
    const client = new GuidestarClient();
    const manager = connection.manager;
    const recipientStatus = await manager.findOne(RecipientStatus, {
        name: RecipientStatusName.APPROVED
    });

    async function saveRecipient(recipient: Recipient): Promise<Recipient> {
        return await manager.transaction(async dbTransaction => {
            // Save Recipient
            const createdRecipient = await dbTransaction.save(Recipient, recipient);

            // Save RecipientContact
            const contact = await dbTransaction.save(RecipientContact, {
                ...recipient.contact,
                recipientId: createdRecipient.id
            });

            // Save RecipientContactAddress
            await dbTransaction.save(RecipientContactAddress, {
                ...recipient.contact.primaryAddress,
                recipientContactId: contact.id
            });

            // Save RecipientContactPhone
            await dbTransaction.save(RecipientContactPhone, {
                ...recipient.contact.primaryPhone,
                recipientContactId: contact.id
            });

            // Recipient email not collected in form
            if (recipient.contact.primaryEmail) {
                // Save RecipientContactEmail
                await dbTransaction.save(RecipientContactEmail, {
                    ...recipient.contact.primaryEmail,
                    recipientContactId: contact.id
                });
            }

            // Save RecipientCause(s)
            if (recipient.recipientCauses) {
                await dbTransaction.save(
                    RecipientCause,
                    recipient.recipientCauses.map(recipientCause => ({
                        ...recipientCause,
                        recipientId: createdRecipient.id
                    }))
                );
            }

            return createdRecipient;
        });
    }

    async function mapGuideStarDataToRecipient(
        data: GuideStarGetCharityDataResponse,
        cause: Cause
    ) {
        // Create RecipientContactAddress
        const [address] = data.summary.addresses;

        const addressValues = {
            lineOne: address.address_line_1,
            lineTwo: address.address_line_2 || null,
            city: address.city,
            state: address.state,
            postalCode: address.postal_code,
            country: address.country,
            isPrimary: true
        };
        // recipient_contact_address.country is mandatory. If we have a valid state identifier, it's the USA
        if (!address.country) {
            if (address.state && usStatesSet.has(address.state)) addressValues.country = 'USA';
            if (address.city === 'United Kingdom') addressValues.country = 'United Kingdom';
        }
        const recipientContactAddress = manager.create(RecipientContactAddress, addressValues);

        // Create Donation RecipientContactAddress
        const donationAddress = data.summary.addresses.find(
            address => address.address_type === 'Payment/Donation Address'
        );

        let recipientDonationAddress: RecipientContactAddress | null = null;
        if (!!donationAddress) {
            recipientDonationAddress = manager.create(RecipientContactAddress, {
                lineOne: donationAddress.address_line_1,
                lineTwo: donationAddress.address_line_2 || null,
                city: donationAddress.city,
                state: donationAddress.state,
                postalCode: donationAddress.postal_code,
                country: donationAddress.country,
                isPrimary: false,
                isDonationAddress: true
            });
        }

        // Create RecipientContactPhone
        const recipientContactPhone = manager.create(RecipientContactPhone, {
            value: data.summary.contact_phone.replace(/\D/g, ''),
            isPrimary: true
        });

        // Create RecipientContactEmail
        const recipientContactEmail = manager.create(RecipientContactEmail, {
            value: data.summary.contact_email || '',
            isPrimary: true
        });

        // Create RecipientContact
        const recipientContact = manager.create(RecipientContact, {
            orgContactName: data.summary.contact_name || null,
            isPrimary: true,
            primaryAddress: recipientContactAddress,
            donationAddress: recipientDonationAddress,
            primaryPhone: recipientContactPhone,
            primaryEmail: recipientContactEmail
        });

        // Create RecipientCause(s)
        const causes = data.summary.ntee_codes.reduce((causes: Promise<Cause>[], data) => {
            if (!data.primary_code) return causes;
            causes.push(getCauseByCode(manager, data.primary_code));
            return causes;
        }, []);

        const recipientCauses = await Promise.all(causes).then(causes => {
            return causes.map((cause: Cause, i) => ({
                causeId: cause.id,
                isPrimary: false
            }));
        });

        // Add cause from list
        recipientCauses.push({ causeId: cause.id, isPrimary: true });

        // Create RecipientBoardOfDirectorsMembers
        const recipientBoardOfDirectorsMembers = data.operations.board_of_directors.map(
            ({ name, title, company }) =>
                // Normalize the inputs a bit, since they're messy from the API
                manager.create(RecipientBoardOfDirectorsMember, {
                    name: name === '' || name === ' ' ? null : name,
                    title: title === '' || title === ' ' ? null : title,
                    company: company === '' || company === ' ' ? null : company
                })
        );

        // Create Recipient
        const recipient = manager.create(Recipient, {
            recipientCode: await getRecipientCode(manager),
            name: formatCharityName(data.summary.organization_name),
            description: data.summary.mission,
            ein: data.summary.ein,
            website: data.summary.website_url,
            // TODO
            code: null,
            npoStatus: data.charitycheck.subsection_description,
            nteeCode: data.summary.ntee_code,
            ofac: data.charitycheck.ofac_status,
            pub78: data.charitycheck.pub78_verified === 'True',
            photos: data.summary.photos.map(p => p.picture_url).filter(p => p.length),
            logo: data.summary.logo_url,
            guideStarSeal: ['Expired', 'None'].includes(data.summary.gs_profile_update_level)
                ? null
                : data.summary.gs_profile_update_level.replace(/\s\d+/, ''),
            recipientStatusId: recipientStatus.id,
            contact: recipientContact,
            recipientCauses: recipientCauses,
            boardOfDirectors: recipientBoardOfDirectorsMembers,
            vettedOn: new Date()
        });

        return recipient;
    }

    const charities: { ein: string; causeCategory: string }[] = [];

    try {
        const rowCount = await new Promise((resolve, reject) => {
            /** format of csv:
                Signatry Cause Category,EIN
                Advocacy,26-0402451
                Support,36-3245072
                ...
             */
            fs.createReadStream(path.resolve(__dirname, 'Recipients-with-Unique-EIN.csv'))
                .pipe(csv.parse({ headers: true }))
                .on('error', error => reject(error))
                // we want to output: { ein: '62-0646012', causeCategory: 'Physical Care' },
                .on('data', row =>
                    charities.push({ ein: row.EIN, causeCategory: row['Signatry Cause Category'] })
                )
                .on('end', (rowCount: number) => resolve(rowCount));
        });
        console.log(`Loaded ${rowCount} rows`);
    } catch (err) {
        throw err;
    }

    await charities.forEach(async (charity, index) => {
        setTimeout(async _ => {
            const charityExists = (await manager.count(Recipient, { ein: charity.ein })) !== 0;
            if (charityExists) {
                // console.log(`Recipient with EIN ${charity.ein} already exists. Skipping`);
                return;
            }

            let cause: Cause;
            try {
                cause = await manager.findOneOrFail(Cause, { name: charity.causeCategory });
                // console.log(`Cause ${charity.causeCategory} exists`);
            } catch (error) {
                cause = manager.create(Cause, {
                    name: charity.causeCategory
                });
                cause = await manager.save(cause);
                console.log(`Cause ${charity.causeCategory} successfully created`);
            }
            // console.log(
            //     `GuideStar lookup for charity.ein:[${charity.ein}] cause:[${charity.causeCategory}]`
            // );
            try {
                // IMPORTANT. hack for now. needs a refactor. uncomment in guidestar/client.ts
                const guidestarData = null; //await client.getCharityDataClean(charity.ein);
                const recipient = await mapGuideStarDataToRecipient(guidestarData, cause);
                await saveRecipient(recipient);
                console.log(`Recipient ${recipient.name} successfully created`);
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.log(`GuideStarData ERROR: Can't find charity with EIN ${charity.ein}`);
                } else if (error.code && error.code === '23502') {
                    console.log(
                        `${error.table} - ${error.message} - ${JSON.stringify(error.parameters)}`
                    );
                } else {
                    console.log(`${error} for EIN:${charity.ein}`);
                }
            }
        }, index * 200); // Run once every 200ms to prevent rate-limiting from Guidestar
    });
}

console.log(
    "--------------------------------------------------\nStarting in 5 secs. Make sure you're connected to the correct db\n"
);
setTimeout(() => {
    seedSelectCharities();
}, 5000);
