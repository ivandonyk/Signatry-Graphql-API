import { MigrationInterface, QueryRunner } from 'typeorm';
import { getOrCreateConnection } from '../typeorm';

const table = 'permission';
const role = 'STAFF_PLUS';
const readRecords = [
    { name: 'Admin Investments', accessType: 'ADMIN_INVESTMENTS' },
    {
        name: 'Admin Grants Payments',
        description: 'Admin Payments',
        accessType: 'ADMIN_GRANTS_PAYMENTS'
    },
    { name: 'Admin Reconciliation', accessType: 'ADMIN_RECONCILIATION' },
    { name: 'Charity Profile', accessType: 'CHARITY_PROFILE' }
];
const noneRecords = [
    { name: 'Admin Bank Accounts', accessType: 'ADMIN_BANK_ACCOUNTS' },
    { name: 'Admin Investment Pools', accessType: 'ADMIN_INVESTMENT_POOLS' }
];

async function fetchStaffPlusId(queryRunner): Promise<string> {
    const [{ id }] = await queryRunner.query(
        `SELECT id FROM role 
            WHERE name = '${role}' 
            LIMIT 1;`
    );

    return id;
}

async function updatePermissionsTable(
    queryRunner,
    records: { name: string; accessType: string; description?: string }[],
    accessLevel: 'READ' | 'FULL' | 'NONE'
): Promise<void> {
    const staffPlusId = await fetchStaffPlusId(queryRunner);

    await Promise.all(
        records.map(async ({ name, description, accessType }) => {
            /**
             * this table doesn't have any constraints,
             * so either UPDATE existing record or INSERT new
             */
            const [existing] = await queryRunner.query(
                `SELECT id FROM "${table}"
                WHERE role_id = '${staffPlusId}' AND access_type = '${accessType}'
                LIMIT 1;`
            );

            if (existing?.id) {
                return await queryRunner.query(`
                    UPDATE "${table}"
                        SET access_level = '${accessLevel}' 
                        WHERE id = '${existing.id}';`);
            }

            return await queryRunner.query(`
                INSERT INTO "${table}" (
                    name, 
                    description, 
                    access_level, 
                    access_type, 
                    role_id
                )
                    VALUES (
                        '${name}', 
                        '${description || name}', 
                        '${accessLevel}', 
                        '${accessType}', 
                        '${staffPlusId}'
                    );`);
        })
    );

    return Promise.resolve();
}

export class ALTERStaffPlusPermissions1615839355482 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await updatePermissionsTable(queryRunner, readRecords, 'READ');
        await updatePermissionsTable(queryRunner, noneRecords, 'NONE');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await updatePermissionsTable(queryRunner, noneRecords, 'FULL');
        await updatePermissionsTable(queryRunner, readRecords, 'FULL');
    }
}
