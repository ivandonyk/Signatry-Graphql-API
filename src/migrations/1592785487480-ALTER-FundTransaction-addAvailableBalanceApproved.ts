import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionAddAvailableBalanceApproved1592253386427
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction ADD COLUMN available_balance_approved boolean NOT NULL DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction DROP COLUMN available_balance_approved
        `);
    }
}
