import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionDetailFK1583372406478 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" ADD CONSTRAINT "FK_FundInvestment_FundTransactionDetail" FOREIGN KEY ("fund_investment_id") REFERENCES "fund_investment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" DROP CONSTRAINT "FK_FundInvestment_FundTransactionDetail"'
        );
    }
}
