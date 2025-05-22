import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERFundTransactionDetailsFundInvestmentIdNullable1603828756856 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fund_transaction_detail" ALTER COLUMN "fund_investment_id" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fund_transaction_detail" ALTER COLUMN "fund_investment_id" SET NOT NULL`);
    }

}
