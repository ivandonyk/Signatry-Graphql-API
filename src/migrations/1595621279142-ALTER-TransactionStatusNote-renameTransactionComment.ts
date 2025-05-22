import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionStatusNoteRenameTransactionComment1595621279142
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // rename transaction_status_note -> fund_transaction_comment
        await queryRunner.query(/*sql*/ `
            ALTER TABLE transaction_status_note RENAME TO fund_transaction_comment
        `);

        // rename index
        await queryRunner.query(/*sql*/ `
            ALTER INDEX "PK_TransactionStatusNote" RENAME TO "PK_FundTransactionComment"
        `);

        // rename notes -> comment
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction_comment RENAME COLUMN notes TO comment
        `);

        // drop on_hold
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction_comment DROP COLUMN on_hold
        `);

        // is_hold
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction_comment ADD COLUMN "is_hold" boolean NOT NULL default false
        `);

        // is_cancel
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction_comment ADD COLUMN "is_cancel" boolean NOT NULL default false
        `);

        await queryRunner.query(/*sql*/ `
            DELETE FROM fund_transaction_comment
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction_comment RENAME COLUMN comment TO notes
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction_comment RENAME COLUMN is_hold TO on_hold
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction_comment DROP COLUMN is_cancel
        `);

        await queryRunner.query(/*sql*/ `
            ALTER INDEX "PK_FundTransactionComment" RENAME TO "PK_TransactionStatusNote"
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction_comment RENAME TO transaction_status_note
        `);
    }
}
