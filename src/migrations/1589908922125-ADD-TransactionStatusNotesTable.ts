import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDTransactionStatusNoteTable1589908922125 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `
            CREATE TABLE IF NOT EXISTS "transaction_status_notes" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "created_by" uuid NOT NULL, 
            "updated_by" uuid NOT NULL, 
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
            "version" integer NOT NULL DEFAULT 1,
            "notes" character varying NOT NULL, 
            "on_hold" boolean NOT NULL DEFAULT false,
            "fund_transaction_id" uuid NOT NULL,
            "transaction_status_id" uuid NOT NULL,
             CONSTRAINT "PK_TransactionStatusNote" PRIMARY KEY ("id")
             )
        `,
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ADD COLUMN "on_hold" boolean NOT NULL DEFAULT false'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_status_notes" ADD CONSTRAINT "FK_FundTransaction_id" FOREIGN KEY ("fund_transaction_id") REFERENCES "fund_transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_status_notes" ADD CONSTRAINT "FK_FundTransactionStatus_id" FOREIGN KEY ("transaction_status_id") REFERENCES "transaction_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund_transaction" DROP COLUMN "on_hold"');
        await queryRunner.query(
            'ALTER TABLE "transaction_status_notes" DROP CONSTRAINT "FK_FundTransaction_id"'
        );
        await queryRunner.query(
            'ALTER TABLE "transaction_status_notes" DROP CONSTRAINT "FK_FundTransactionStatus_id"'
        );
        await queryRunner.query('DROP TABLE "transaction_status_notes"');
    }
}
