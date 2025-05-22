import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEFundPermissionsInvestmentManager1616825419593 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE fund_permission
            SET access_level = 'READ'
            WHERE access_type = 'FUND_TO_FUND_TRANSFERS' AND
                  fund_role_id = (SELECT id FROM fund_role WHERE name LIKE 'Investment Manager');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE fund_permission
            SET access_level = 'FULL'
            WHERE access_type = 'FUND_TO_FUND_TRANSFERS' AND
                  fund_role_id = (SELECT id FROM fund_role WHERE name LIKE 'Investment Manager');
        `);
    }
}
