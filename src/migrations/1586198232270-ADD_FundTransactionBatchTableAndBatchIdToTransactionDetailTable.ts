import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDFundTransactionBatchTableAndBatchIdToTransactionDetailTable1586198232270
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "fund_transaction_batch" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_FundTransactionBatch" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ADD COLUMN "fund_transaction_batch_id" uuid'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ADD CONSTRAINT "FK_FundTransactionBatch_FundTransaction" FOREIGN KEY ("fund_transaction_batch_id") REFERENCES "fund_transaction_batch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" DROP CONSTRAINT "FK_FundTransactionBatch_FundTransaction"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" DROP COLUMN "fund_transaction_batch_id"'
        );
        await queryRunner.query('DROP TABLE "fund_transaction_batch"');
    }
}
