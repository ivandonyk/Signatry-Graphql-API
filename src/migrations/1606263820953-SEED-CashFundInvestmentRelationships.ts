import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDCashFundInvestmentRelationships1606263820953 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        INSERT INTO "fund_investment" (
        "allocation_percentage",
        "fund_id",
        "investment_id"
        ) SELECT 0, "fund"."id", "investment"."id"
        FROM "fund"
        CROSS JOIN "investment"
        WHERE "investment"."investment_type" 
        IN ('GRANT_CASH', 'CONTRIBUTION_CASH')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        DELETE FROM "fund_investment"
        USING "investment"
        WHERE "fund_investment"."investment_id" = "investment"."id"
        AND "investment"."investment_type"
            IN ('GRANT_CASH', 'CONTRIBUTION_CASH')
        `);
    }
}
