import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddDescriptionToFundTransactionDetail1612202330197 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_transaction_detail" ADD COLUMN "description" character varying NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_transaction_detail" DROP COLUMN "description"
        `);
    }
}
