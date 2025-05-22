import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundRecurrenceRenameToTransactionRecurrence1596489980586
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE "fund_recurrence" RENAME TO "transaction_recurrence";  
        `);
        await queryRunner.query(/*sql*/ `
        ALTER TABLE "fund_transaction" RENAME COLUMN "fund_recurrence_id" TO "transaction_recurrence_id";  
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE "transaction_recurrence" RENAME TO "fund_recurrence";  
        `);
        await queryRunner.query(/*sql*/ `
        ALTER TABLE "fund_transaction" RENAME COLUMN "transaction_recurrence_id" TO "fund_recurrence_id";  
        `);
    }
}
