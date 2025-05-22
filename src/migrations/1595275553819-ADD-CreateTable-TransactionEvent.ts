import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDCreateTableTransactionEvent1595275553819 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE TABLE IF NOT EXISTS "transaction_event" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_by" uuid NOT NULL,
                "updated_by" uuid NOT NULL,
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "version" integer NOT NULL DEFAULT 1,
                "fund_transaction_id" uuid NOT NULL,
                "user_profile_id" uuid NOT NULL,
                CONSTRAINT "PK_TransactionEventId" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "transaction_event" ADD CONSTRAINT "FK_FundTransaction_TransactionEvent" FOREIGN KEY ("fund_transaction_id") REFERENCES "fund_transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "transaction_event" ADD CONSTRAINT "FK_UserProfile_TransactionEvent" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(/*sql*/ `
            CREATE TYPE transaction_event_name AS ENUM ('SUBMITTED', 'DUE_DILIGENCE_STARTED', 'REVIEW_STARTED', 'PAYMENTS_STARTED', 'ON_HOLD', 'OFF_HOLD', 'FINAL_REVIEW_APPROVED', 'SPECIAL_APPROVAL_GIVEN', 'AVAILABLE_BALANCE_APPROVED', 'CHARITY_VETTED', 'PURPOSE_NOTES_APPROVED', 'SPECIAL_INSTRUCTIONS_APPROVED', 'PROCESSED', 'CANCELED')
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "transaction_event" ADD COLUMN name transaction_event_name DEFAULT 'SUBMITTED'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "transaction_event" DROP CONSTRAINT "FK_FundTransaction_TransactionEvent"
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "transaction_event" DROP CONSTRAINT "FK_UserProfile_TransactionEvent"
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "transaction_event" DROP CONSTRAINT "FK_TransactionStatusNote_TransactionEvent"
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "transaction_event" DROP COLUMN "name"
        `);
        await queryRunner.query(/*sql*/ `
            DROP TYPE IF EXISTS transaction_event_name
        `);
        await queryRunner.query(/*sql*/ `
            DROP TABLE "transaction_event"
        `);
    }
}
