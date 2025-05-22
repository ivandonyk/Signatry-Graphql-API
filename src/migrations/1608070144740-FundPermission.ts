import { MigrationInterface, QueryRunner } from 'typeorm';

export class FundPermission1608070144740 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
          ALTER TABLE fund_permission ADD enabled boolean DEFAULT true;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
        ALTER TABLE fund_permission DROP COLUMN enabled 
    `);
    }
}
