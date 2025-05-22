import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERHoldingAddCostBasis1615073744650 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "holding" ADD COLUMN "cost_basis" float`);
        await queryRunner.query(`ALTER TABLE "holding" ADD COLUMN "cumulative_average_cost" float`);
        await queryRunner.query(`ALTER TABLE "holding" ADD COLUMN "cumulative_unrealized" float`);
        await queryRunner.query(`ALTER TABLE "holding" ADD COLUMN "cumulative_realized" float`);
        await queryRunner.query(`ALTER TABLE "pool_investment_holding" ADD COLUMN "cost_basis" float`);
        await queryRunner.query(`ALTER TABLE "pool_investment_holding" ADD COLUMN "cumulative_average_cost" float`);
        await queryRunner.query(`ALTER TABLE "pool_investment_holding" ADD COLUMN "cumulative_unrealized" float`);
        await queryRunner.query(`ALTER TABLE "pool_investment_holding" ADD COLUMN "cumulative_realized" float`);
        await queryRunner.query(`ALTER TABLE "institution_account_transaction" ADD COLUMN "cost_basis" float`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "holding" DROP COLUMN "cost_basis" `);
        await queryRunner.query(`ALTER TABLE "holding" DROP COLUMN "cumulative_average_cost" `);
        await queryRunner.query(`ALTER TABLE "holding" DROP COLUMN "cumulative_unrealized" `);
        await queryRunner.query(`ALTER TABLE "holding" DROP COLUMN "cumulative_realized" `);
        await queryRunner.query(`ALTER TABLE "pool_investment_holding" DROP COLUMN "cost_basis" `);
        await queryRunner.query(`ALTER TABLE "pool_investment_holding" DROP COLUMN "cumulative_average_cost" `);
        await queryRunner.query(`ALTER TABLE "pool_investment_holding" DROP COLUMN "cumulative_unrealized" `);
        await queryRunner.query(`ALTER TABLE "pool_investment_holding" DROP COLUMN "cumulative_realized" `);
        await queryRunner.query(`ALTER TABLE "institution_account_transaction" DROP COLUMN "cost_basis"`);
    }
}
