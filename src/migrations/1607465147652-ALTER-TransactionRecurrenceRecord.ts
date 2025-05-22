import { query } from 'express';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionRecurrenceRecord1607465147652 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE transaction_recurrence ADD COLUMN transaction_ref JSONB
        `);

        await queryRunner.query(/*sql*/ `
            UPDATE fund_transaction SET transaction_recurrence_id = null WHERE transaction_recurrence_id IS NOT NULL
        `);

        await queryRunner.query(/*sql */ `
        DELETE from transaction_recurrence
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE transaction_recurrence DROP COLUMN transaction_ref
    `);
    }
}
