import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionDetailStatusAddEnumInvestedDivested1586814013714
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        const [{ id: investedId }] = await queryRunner.query(
            'INSERT INTO "transaction_detail_status" ("name") VALUES (\'INVESTED\') RETURNING id'
        );

        const [{ id: divestedId }] = await queryRunner.query(
            'INSERT INTO "transaction_detail_status" ("name") VALUES (\'DIVESTED\') RETURNING id'
        );

        const [{ id: completeId }] = await queryRunner.query(
            'SELECT id FROM "transaction_detail_status" WHERE "name" = \'COMPLETE\''
        );

        const [investmentTransactions] = await queryRunner.query(
            "SELECT fund_transaction.id FROM fund_transaction LEFT JOIN transaction_type ON fund_transaction.transaction_type_id=transaction_type.id WHERE transaction_type.name = 'CONTRIBUTION'"
        );

        const [divestmentTransactions] = await queryRunner.query(
            "SELECT fund_transaction.id FROM fund_transaction LEFT JOIN transaction_type ON fund_transaction.transaction_type_id=transaction_type.id WHERE transaction_type.name = 'GRANT'"
        );

        await queryRunner.query(
            `UPDATE "fund_transaction_detail" SET "transaction_detail_status_id" = '${investedId}' WHERE "transaction_detail_status_id" = '${completeId}' AND "fund_transaction_id" IN (SELECT fund_transaction.id FROM fund_transaction LEFT JOIN transaction_type ON fund_transaction.transaction_type_id=transaction_type.id WHERE transaction_type.name = 'CONTRIBUTION')`
        );

        await queryRunner.query(
            `UPDATE "fund_transaction_detail" SET "transaction_detail_status_id" = '${divestedId}' WHERE "transaction_detail_status_id" = '${completeId}' AND "fund_transaction_id" IN (SELECT fund_transaction.id FROM fund_transaction LEFT JOIN transaction_type ON fund_transaction.transaction_type_id=transaction_type.id WHERE transaction_type.name = 'GRANT')`
        );

        await queryRunner.query(
            'DELETE FROM "transaction_detail_status" WHERE name = (\'COMPLETE\')'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        const [{ id: completeId }] = await queryRunner.query(
            'INSERT INTO "transaction_detail_status" ("name") VALUES (\'COMPLETE\') RETURNING id'
        );

        const [invested] = await queryRunner.query(
            'SELECT * FROM "transaction_detail_status" WHERE "name" = \'INVESTED\''
        );

        const [divested] = await queryRunner.query(
            'SELECT * FROM "transaction_detail_status" WHERE "name" = \'DIVESTED\''
        );

        await queryRunner.query(
            `UPDATE "fund_transaction_detail" SET "transaction_detail_status_id" = '${completeId}' WHERE "transaction_detail_status_id" = '${invested.id}'`
        );

        await queryRunner.query(
            `UPDATE "fund_transaction_detail" SET "transaction_detail_status_id" = '${completeId}' WHERE "transaction_detail_status_id" = '${divested.id}'`
        );

        await queryRunner.query(
            'DELETE FROM "transaction_detail_status" WHERE name = (\'INVESTED\')'
        );
        await queryRunner.query(
            'DELETE FROM "transaction_detail_status" WHERE name = (\'DIVESTED\')'
        );
    }
}
