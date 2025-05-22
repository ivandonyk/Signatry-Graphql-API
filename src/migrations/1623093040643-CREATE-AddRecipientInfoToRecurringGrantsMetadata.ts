import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATEAddRecipientInfoToRecurringGrantsMetadata1623093040643
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE fund_transaction_info ALTER COLUMN recipient_id DROP NOT NULL',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE transaction_recurrence ADD COLUMN recipient_name TEXT',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE transaction_recurrence ADD COLUMN recipient_notes TEXT',
            undefined
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE fund_transaction_info ALTER COLUMN recipient_id SET NOT NULL',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE transaction_recurrence DROP COLUMN recipient_name',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE transaction_recurrence DROP COLUMN recipient_notes',
            undefined
        );
    }
}
