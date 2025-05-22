import { MigrationInterface, QueryRunner } from 'typeorm';
const APP_SETTINGS = {
    password: {
        minLength: 8,
        requireNumberCharacter: true,
        requireSpecialCharacter: true,
        requireLowerCaseCharacter: true,
        requireUpperCaseCharacter: true
    },
    specialApprovalThreshold: 500000.0,
    grantMinimum: 100,
    contributionMinimum: 50,
    tenantName: 'The Signatry',
    email: 'tstenant@gmail.com',
    fromEmail: 'noreply@spiredigital.com',
    purposeCategories: [
        {
            category: 'Athletic Team Support',
            disclosure:
                'By submitting this grant, I affirm that it will not entitle me or someone related to me to any goods or services, or to obtain tickets to an athletic event.'
        },
        {
            category: 'Benevolence Fund',
            disclosure:
                'By submitting this grant, I affirm that it will only benefit an individiual(s) whom the grant recipient has reviewed and approved for charitable support and will not include me or someone related to me.'
        },
        { category: 'Capital/Building Campaign', disclosure: 'Enter the campaign name.' },
        {
            category: 'Charity Event',
            disclosure:
                'By submitting this grant, I affirm that it will not be used to acquire a charity event ticket(s) for me or someone related to me.'
        },
        {
            category: 'Membership',
            disclosure:
                'By submitting this grant, I affirm that it will not provide membership to an organization for me or someone related to me.'
        },
        {
            category: 'Pledge',
            disclosure:
                'By submitting this grant, I affirm that it will not fulfill a legally binding pledge.'
        }
    ],
    specialRecognitionCategories: [
        'In celebration of',
        'In gratitude for',
        'In honor of',
        'In loving memory of',
        'In recognition',
        'In the name of',
        'On behalf of',
    ]
};
export const DEFAULT_TENANT_APP_SETTINGS = {
    password: {
        minLength: 8,
        requireNumberCharacter: true,
        requireSpecialCharacter: true,
        requireLowerCaseCharacter: true,
        requireUpperCaseCharacter: true
    },
    email: 'tstenant@gmail.com',
    fromEmail: 'noreply@spiredigital.com'
};

export class SEEDNewAppSettingsIntoTheDB1595882205811 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/*sql*/ `
            UPDATE tenant SET app_setting = '${JSON.stringify(APP_SETTINGS)}'
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/*sql*/ `
            UPDATE tenant SET app_setting = '${JSON.stringify(DEFAULT_TENANT_APP_SETTINGS)}'
        `);
    }
}
