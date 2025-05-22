import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionAddFundId1583016052845 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund_transaction" ADD fund_id uuid NOT NULL');
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ADD CONSTRAINT "FK_Fund_FundTransaction" FOREIGN KEY ("fund_id") REFERENCES "fund"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund_transaction" DROP COLUMN "fund_id"');
    }
}
