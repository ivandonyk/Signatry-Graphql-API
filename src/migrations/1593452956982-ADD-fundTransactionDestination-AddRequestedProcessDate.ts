import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDFundTransactionDestinationAddRequestedProcessDate1593452956982
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE fund_transaction_destination ADD COLUMN "requested_process_date" TIMESTAMP NULL;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE fund_transaction_destination DROP COLUMN "requested_process_date"'
        );
    }
}
