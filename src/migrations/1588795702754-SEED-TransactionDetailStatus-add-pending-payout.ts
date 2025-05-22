import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDTransactionDetailStatusAddPendingPayout1588795702754
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `INSERT INTO "transaction_detail_status" ("name", "description", "enabled")
            VALUES ('PENDING_PAYOUT', 'Funds have been included in a payout', true)`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'DELETE FROM "transaction_detail_status" WHERE "name" = \'PENDING_PAYOUT\''
        );
    }
}
