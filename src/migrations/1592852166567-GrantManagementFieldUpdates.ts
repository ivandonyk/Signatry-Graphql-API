import { MigrationInterface, QueryRunner } from 'typeorm';

export class GrantManagementFieldUpdates1592852166567 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_transaction_destination" RENAME COLUMN "note" TO "special_instructions";
            ALTER TABLE "fund_transaction_destination" RENAME COLUMN "due_diligence_done" TO "purpose_notes_approved";
            ALTER TABLE "fund_transaction_destination" RENAME COLUMN "need_description" TO "purpose_notes";
            ALTER TABLE "fund_transaction_destination" ADD COLUMN "special_instructions_approved" BOOLEAN DEFAULT null;
            ALTER TABLE "fund_transaction_destination" ALTER COLUMN "purpose_notes_approved" DROP NOT NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_transaction_destination" RENAME COLUMN "special_instructions" TO "note";
            ALTER TABLE "fund_transaction_destination" ALTER COLUMN "purpose_notes_approved" SET NOT NULL;
            ALTER TABLE "fund_transaction_destination" RENAME COLUMN "purpose_notes_approved" TO "due_diligence_done";
            ALTER TABLE "fund_transaction_destination" RENAME COLUMN "purpose_notes" TO "need_description";
            ALTER TABLE "fund_transaction_destination" DROP COLUMN "special_instructions_approved";
        `);
    }
}
