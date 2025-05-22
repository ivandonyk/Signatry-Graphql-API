import { MigrationInterface, QueryRunner } from 'typeorm';

export class FundTransactionSeedTables1582823518352 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "transaction_detail_status" ALTER COLUMN "created_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_detail_status" ALTER COLUMN "updated_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" ALTER COLUMN "created_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" ALTER COLUMN "updated_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" ALTER COLUMN "created_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" ALTER COLUMN "updated_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_source" ALTER COLUMN "created_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_source" ALTER COLUMN "updated_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ALTER COLUMN "created_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ALTER COLUMN "updated_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_type" ALTER COLUMN "created_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_type" ALTER COLUMN "updated_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_status" ALTER COLUMN "created_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_status" ALTER COLUMN "updated_by" SET DEFAULT uuid_nil()'
        );
        await queryRunner.query(
            'INSERT INTO "transaction_status" ("name") VALUES (\'PENDING\'), (\'COMPLETE\')'
        );
        await queryRunner.query(
            'INSERT INTO "transaction_detail_status" ("name") VALUES (\'PENDING\'), (\'COMPLETE\')'
        );
        await queryRunner.query(
            "INSERT INTO \"transaction_type\" (\"name\") VALUES ('CONTRIBUTION'), ('GRANT'), ('FEE')"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "transaction_detail_status" ALTER COLUMN "created_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_detail_status" ALTER COLUMN "updated_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" ALTER COLUMN "created_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" ALTER COLUMN "updated_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" ALTER COLUMN "created_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_destination" ALTER COLUMN "updated_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_source" ALTER COLUMN "created_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_source" ALTER COLUMN "updated_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ALTER COLUMN "created_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ALTER COLUMN "updated_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_type" ALTER COLUMN "created_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_type" ALTER COLUMN "updated_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_status" ALTER COLUMN "created_by" DROP DEFAULT'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_satus" ALTER COLUMN "updated_by" DROP DEFAULT'
        );
        await queryRunner.query('DELETE FROM "transaction_status"');
        await queryRunner.query('DELETE FROM "transaction_type"');
        await queryRunner.query('DELETE FROM "transaction_detail_status"');
    }
}
