import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundPermissionChangeAccessType1619465053875 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
        ALTER TABLE fund_permission ALTER COLUMN access_type TYPE varchar;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql https://is.gd/P0jTHe */ `
        ALTER TABLE fund_permission ALTER COLUMN access_type TYPE fund_permission_access_type using access_type::fund_permission_access_type;
        `);
    }
}
