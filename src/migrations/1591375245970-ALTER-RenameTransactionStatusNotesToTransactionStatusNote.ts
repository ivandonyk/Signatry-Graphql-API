import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRenameTransactionStatusNoteToTransactionStatusNote1591375245970
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(
            'ALTER TABLE "transaction_status_notes" RENAME TO "transaction_status_note"'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(
            'ALTER TABLE "transaction_status_note" RENAME TO "transaction_status_notes"'
        );
    }
}
