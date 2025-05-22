import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDSupportForRecurringGrantsToDB1595367154629 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/*sql*/ `
            CREATE TABLE "fund_recurrence" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                "created_by" uuid NULL, 
                "updated_by" uuid NULL,
                "version" integer NOT NULL DEFAULT 1,
                "enabled" boolean NOT NULL DEFAULT true,
                "fund_id" uuid NOT NULL,
                "transaction_type_id" uuid NOT NULL,
                "recurrence_rule" character varying NOT NULL,
                "recipient_id" uuid NOT NULL,
                CONSTRAINT "PK_FundRecurrenceId" PRIMARY KEY ("id")
                )
            `);

        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_transaction" ADD COLUMN "fund_recurrence_id" uuid NULL
        `);

        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_transaction" ADD COLUMN "scheduled_date" TIMESTAMP NULL
        `);

        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_transaction" ADD CONSTRAINT "FK_FundRecurrenceId" FOREIGN KEY ("fund_recurrence_id") REFERENCES "fund_recurrence"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_recurrence" ADD CONSTRAINT "FK_FundId" FOREIGN KEY ("fund_id") REFERENCES "fund"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_recurrence" ADD CONSTRAINT "FK_RecipientId" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_recurrence" ADD CONSTRAINT "FK_TransactionTypeId" FOREIGN KEY ("transaction_type_id") REFERENCES "transaction_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(/*SQL */ `
            INSERT INTO "transaction_status" (name, description, enabled) VALUES ('SCHEDULED', 'The first status a transaction is sent to if it is scheduled for the future', true)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*SQL */ `
            DELETE FROM "transaction_status" WHERE name = 'SCHEDULED'
        `);
        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_transaction" DROP CONSTRAINT "FK_FundRecurrenceId"
        `);
        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_transaction" DROP COLUMN "fund_recurrence_id"
        `);

        queryRunner.query(/*sql*/ `
            DROP TABLE "fund_recurrence"
        `);
    }
}
