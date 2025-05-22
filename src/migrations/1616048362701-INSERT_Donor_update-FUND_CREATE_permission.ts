import { MigrationInterface, QueryRunner } from 'typeorm';

export class INSERTDonorUpdateFUNDCREATEPermission1616048362701 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'FULL' WHERE access_type = 'FUND_CREATE' AND role_id IN (
        SELECT id FROM role WHERE name LIKE 'Donor'
        );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'NONE' WHERE access_type = 'FUND_CREATE' AND role_id IN (
        SELECT id FROM role WHERE name LIKE 'Donor'
        );
        `);
    }
}
