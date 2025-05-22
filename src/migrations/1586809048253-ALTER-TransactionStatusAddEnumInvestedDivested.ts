import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionStatusAddEnumInvestedDivested1586809048253
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        const [{ id: investedId }] = await queryRunner.query(
            'INSERT INTO "transaction_status" ("name") VALUES (\'INVESTED\') RETURNING id'
        );

        const [{ id: divestedId }] = await queryRunner.query(
            'INSERT INTO "transaction_status" ("name") VALUES (\'DIVESTED\') RETURNING id'
        );

        const [{ id: completeId }] = await queryRunner.query(
            'SELECT id FROM "transaction_status" WHERE "name" = \'COMPLETE\''
        );

        const [investmentType] = await queryRunner.query(
            'SELECT * FROM "transaction_type" WHERE "name" = \'CONTRIBUTION\''
        );

        const [divestmentType] = await queryRunner.query(
            'SELECT * FROM "transaction_type" WHERE "name" = \'GRANT\''
        );

        await queryRunner.query(
            `UPDATE "fund_transaction" SET "transaction_status_id" = '${investedId}' WHERE "transaction_status_id" = '${completeId}' AND "transaction_type_id" = '${investmentType.id}'`
        );

        await queryRunner.query(
            `UPDATE "fund_transaction" SET "transaction_status_id" = '${divestedId}' WHERE "transaction_status_id" = '${completeId}' AND "transaction_type_id" = '${divestmentType.id}'`
        );

        await queryRunner.query('DELETE FROM "transaction_status" WHERE name = (\'COMPLETE\')');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        const [{ id: completeId }] = await queryRunner.query(
            'INSERT INTO "transaction_status" ("name") VALUES (\'COMPLETE\') RETURNING id'
        );

        const [invested] = await queryRunner.query(
            'SELECT * FROM "transaction_status" WHERE "name" = \'INVESTED\''
        );

        const [divested] = await queryRunner.query(
            'SELECT * FROM "transaction_status" WHERE "name" = \'DIVESTED\''
        );

        await queryRunner.query(
            `UPDATE "fund_transaction" SET "transaction_status_id" = '${completeId}' WHERE "transaction_status_id" = '${invested.id}'`
        );

        await queryRunner.query(
            `UPDATE "fund_transaction" SET "transaction_status_id" = '${completeId}' WHERE "transaction_status_id" = '${divested.id}'`
        );

        await queryRunner.query('DELETE FROM "transaction_status" WHERE name = (\'INVESTED\')');
        await queryRunner.query('DELETE FROM "transaction_status" WHERE name = (\'DIVESTED\')');
    }
}
