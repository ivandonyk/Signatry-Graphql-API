import { MigrationInterface, QueryRunner } from 'typeorm';

export class INSERTPermissionsAddingCharitySearchPermission1615789224654
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO permission
            (name, description, created_on, created_by, updated_on, updated_by, version, access_level, role_id, access_type)
            SELECT
                'Charity Search',
                'Charity Search',
                now(),
                null,
                now(),
                null,
                1,
                'FULL',
                id,
                'CHARITY_SEARCH'
            FROM role WHERE name in (
            'Donor',
            'STAFF_BASIC',
            'STAFF_PLUS',
            'STAFF_FINANCE',
            'STAFF_FINANCE_EXECUTIVE',
            'STAFF_ADMIN',
            'GLOBAL_ADMIN',
            'CHARITY'
                );`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        DELETE FROM permission
        WHERE access_type = 'CHARITY_SEARCH'
        AND role_id IN (SELECT id FROM role WHERE name IN (
            'Donor',
            'STAFF_BASIC',
            'STAFF_PLUS',
            'STAFF_FINANCE',
            'STAFF_FINANCE_EXECUTIVE',
            'STAFF_ADMIN',
            'GLOBAL_ADMIN',
            'CHARITY'
            ));
        `);
    }
}
