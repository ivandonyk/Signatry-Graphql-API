import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionStatusAddReadyForInvestment1585587104344
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'INSERT INTO "transaction_status" ("name") VALUES (\'READY_FOR_INVESTMENT\')'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        const [readyForInvestment] = await queryRunner.query(
            'SELECT * FROM "transaction_status" WHERE "name" = \'READY_FOR_INVESTMENT\''
        );
        const [pending] = await queryRunner.query(
            'SELECT * FROM "transaction_status" WHERE "name" = \'PENDING\''
        );
        await queryRunner.query(
            `UPDATE "fund_transaction" SET "transaction_status_id" = '${pending.id}' WHERE "transaction_status_id" = '${readyForInvestment.id}'`
        );
        await queryRunner.query(
            'DELETE FROM "transaction_status" WHERE name = (\'READY_FOR_INVESTMENT\')'
        );
    }
}
