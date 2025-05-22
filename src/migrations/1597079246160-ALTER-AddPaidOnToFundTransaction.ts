import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddPaidOnToFundTransaction1597079246160 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_transaction" ADD COLUMN "paid_on" TIMESTAMP NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_transaction" DROP COLUMN "paid_on"
        `);
    }
}
