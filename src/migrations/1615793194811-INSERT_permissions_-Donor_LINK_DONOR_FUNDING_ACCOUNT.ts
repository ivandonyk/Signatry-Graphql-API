import { MigrationInterface, QueryRunner } from 'typeorm';

export class INSERTPermissions_DonorLINKDONORFUNDINGACCOUNT1615793194811
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'FULL' WHERE access_type = 'LINK_DONOR_FUNDING_ACCOUNT' AND role_id IN (
        SELECT id FROM role WHERE name LIKE 'Donor'
        );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'NONE' WHERE access_type = 'LINK_DONOR_FUNDING_ACCOUNT' AND role_id IN (
        SELECT id FROM role WHERE name LIKE 'Donor'
        );
        `);
    }
}
