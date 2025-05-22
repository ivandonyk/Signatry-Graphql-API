import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEDonorPermissions1612145624118 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const [{ id: donor_role_id }] = await queryRunner.query(
            "SELECT id from role where name = 'Donor'"
        );
        await queryRunner.query(
            `
            UPDATE permission SET access_level = 'NONE'
            WHERE
                role_id = '${donor_role_id}'
            AND access_type IN (
                    'ADMIN_BANK_ACCOUNTS',
                    'ADMIN_DIVESTMENTS',
                    'ADMIN_FUNDS',
                    'ADMIN_GRANTS',
                    'ADMIN_GRANTS_PAYMENTS',
                    'ADMIN_GRANTS_SPECIAL_APPROVAL',
                    'ADMIN_GRANT_FINALIZE',
                    'ADMIN_INVESTMENTS',
                    'ADMIN_RECIPIENTS',
                    'ADMIN_RECONCILIATION',
                    'ADMIN_USER_MANAGEMENT'
                );
             `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const [{ id: donor_role_id }] = await queryRunner.query(
            "SELECT id from role where name = 'Donor'"
        );
        await queryRunner.query(
            `
            UPDATE permission SET access_level = 'FULL'
            WHERE
                role_id = '${donor_role_id}'
            AND access_type IN (
                    'ADMIN_BANK_ACCOUNTS',
                    'ADMIN_DIVESTMENTS',
                    'ADMIN_FUNDS',
                    'ADMIN_GRANTS',
                    'ADMIN_GRANTS_PAYMENTS',
                    'ADMIN_GRANTS_SPECIAL_APPROVAL',
                    'ADMIN_GRANT_FINALIZE',
                    'ADMIN_INVESTMENTS',
                    'ADMIN_RECIPIENTS',
                    'ADMIN_RECONCILIATION',
                    'ADMIN_USER_MANAGEMENT'
                );
             `
        );
    }
}
