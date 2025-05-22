import { MigrationInterface, QueryRunner } from 'typeorm';

export class INSERTLinkAccounts1612937011977 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        INSERT INTO permission
            (name,
            description,
            created_on,
            created_by,
            updated_on,
            updated_by,
            version,
            access_level,
            access_type,
            role_id)
        SELECT 'LINK_DONOR_FUNDING_ACCOUNT',
            'Link Donor Funding Account',
            now(),
            null,
            now(),
            null,
            1,
            'FULL',
            'LINK_DONOR_FUNDING_ACCOUNT',
            id
        FROM role
        WHERE name IN (
            'Donor',
            'STAFF_BASIC',
            'STAFF_PLUS',
            'STAFF_FINANCE',
            'STAFF_FINANCE_EXECUTIVE',
            'STAFF_ADMIN',
            'GLOBAL_ADMIN'
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM permission
            WHERE name LIKE 'LINK_DONOR_FUNDING_ACCOUNT' AND
            role_id IN (SELECT id FROM role WHERE name IN ('Donor', 'STAFF_BASIC', 'STAFF_PLUS', 'STAFF_FINANCE', 'STAFF_FINANCE_EXECUTIVE', 'STAFF_ADMIN', 'GLOBAL_ADMIN'));
        `);
    }
}
