import {MigrationInterface, QueryRunner} from "typeorm";

export class CREATEBatch1607448396352 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TYPE "batch_status" 
        AS ENUM (
            'PENDING', 
            'CLEARED',
            'RECONCILED'
        )`);

        await queryRunner.query(`
          CREATE TABLE "batch" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "amount" float NOT NULL,
            "description" character varying,
            "status" batch_status NOT NULL DEFAULT 'PENDING',
            "posted_on" timestamp,
            "cleared_on" timestamp,
            "reconciled_on" timestamp,
            "source_glaccount_id" uuid NOT NULL,
            "destination_glaccount_id" uuid NOT NULL,
            "source_info" json NOT NULL,
            "destination_info" json NOT NULL,
            "event_history" json,
            "comments" json,
            "created_on" timestamp NOT NULL DEFAULT current_timestamp,
            "created_by" uuid NULL,
            "updated_on" timestamp NOT NULL DEFAULT current_timestamp,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_BatchId" PRIMARY KEY ("id"),
            CONSTRAINT "FK_SourceGLAccountId" FOREIGN KEY ("source_glaccount_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
            CONSTRAINT "FK_DestinationGLAccountId" FOREIGN KEY ("destination_glaccount_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )`);


        await queryRunner.query(`
        ALTER TABLE "fund_transaction_detail" ADD COLUMN "batch_id" uuid
        `);

        await queryRunner.query(`
        ALTER TABLE "fund_transaction_detail" ADD CONSTRAINT "FK_BatchId" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
        ALTER TABLE "institution_account" ADD COLUMN "gl_account_id" uuid
        `);


        await queryRunner.query(`
        ALTER TABLE "institution_account" ADD CONSTRAINT "FK_GLAccountId" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);


        await queryRunner.query(`
        CREATE OR REPLACE FUNCTION set_batch_status()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            IF NEW."reconciled_on" IS NOT NULL THEN
                NEW."status" = 'RECONCILED';
            ELSIF NEW."cleared_on" IS NOT NULL THEN
                NEW."status" = 'CLEARED';
            ELSE
                NEW."status" = 'PENDING';
            END IF;
            RETURN NEW;
        END $$
        `);

        await queryRunner.query(`
        CREATE TRIGGER TR_calculate_batch_status
        BEFORE INSERT OR UPDATE ON batch
        FOR EACH ROW EXECUTE PROCEDURE set_batch_status();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fund_transaction_detail" DROP CONSTRAINT "FK_BatchId"`);
        await queryRunner.query(`ALTER TABLE "fund_transaction_detail" DROP COLUMN "batch_id"`);
        await queryRunner.query(`ALTER TABLE "institution_account" DROP COLUMN "gl_account_id"`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS "TR_calculate_batch_status" ON "batch_id"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "batch"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "batch_status"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS "set_batch_status"`);
    }
}

