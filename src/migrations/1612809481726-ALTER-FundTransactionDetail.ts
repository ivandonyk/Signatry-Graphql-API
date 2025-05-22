import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionDetail1612809481726 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" ADD COLUMN "source_glaccount_id" uuid NULL'
        );

        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" ADD COLUMN "destination_glaccount_id" uuid NULL'
        );

        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" ADD CONSTRAINT "FK_SourceGLAccountId" FOREIGN KEY ("source_glaccount_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );

        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" ADD CONSTRAINT "FK_DestinationGLAccountId" FOREIGN KEY ("destination_glaccount_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" DROP CONSTRAINT "FK_SourceGLAccountId"'
        );

        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" DROP CONSTRAINT "FK_DestinationGLAccountId"'
        );

        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" DROP COLUMN "source_glaccount_id"'
        );

        await queryRunner.query(
            'ALTER TABLE "fund_transaction_detail" DROP COLUMN "destination_glaccount_id"'
        );
    }
}
