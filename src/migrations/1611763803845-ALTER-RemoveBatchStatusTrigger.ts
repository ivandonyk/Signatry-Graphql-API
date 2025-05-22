import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRemoveBatchStatusTrigger1611763803845 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            DROP TRIGGER IF EXISTS TR_calculate_batch_status ON batch;
        `);
        await queryRunner.query(/* sql */ `
            DROP FUNCTION IF EXISTS set_batch_status;
        `);

        await queryRunner.query(/* sql */ `
            ALTER TYPE batch_status RENAME TO _batch_status;
            CREATE TYPE batch_status AS ENUM ('PENDING', 'PARTIAL', 'POSTED');
            ALTER TABLE batch RENAME COLUMN "status" TO "_status";
            ALTER TABLE batch ADD COLUMN "status" batch_status NOT NULL DEFAULT 'PENDING';
            ALTER TABLE batch DROP COLUMN "_status";
            DROP TYPE _batch_status;
        `);

        await queryRunner.query(/* sql */ `
            DROP FUNCTION IF EXISTS get_batch_tsvector(target_id UUID);
        `);

        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_batch_tsvector(batch_code TEXT, source_id UUID, dest_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                source_account_number TEXT;
                destination_account_number TEXT;
                source_display_name TEXT;
                destination_display_name TEXT;
            BEGIN
                SELECT
                    institution_account.account_number,
                    institution_account.display_name
                INTO
                    source_account_number,
                    source_display_name
                FROM
                    institution_account
                LEFT JOIN gl_account ON gl_account.id = institution_account.gl_account_id
                WHERE gl_account.id = source_id;

                SELECT
                    institution_account.account_number,
                    institution_account.display_name
                INTO
                    destination_account_number,
                    destination_display_name
                FROM
                    institution_account
                LEFT JOIN gl_account ON gl_account.id = institution_account.gl_account_id
                WHERE gl_account.id = dest_id;

                RETURN to_tsvector(
                    'pg_catalog.simple',
                    COALESCE(source_account_number, '') || ' ' ||
                    COALESCE(source_display_name, '') || ' ' ||
                    COALESCE(destination_account_number, '') || ' ' ||
                    COALESCE(destination_display_name, '') || ' ' ||
                    COALESCE(batch_code, '')
                );
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger function to run on batch insert/update
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION batch_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_batch_tsvector(NEW.batch_code, NEW.source_glaccount_id, NEW.destination_glaccount_id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger function to run on gl_account insert/update
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION institution_account_batch_search_insert_update() RETURNS trigger AS $$
            DECLARE
                source_batches RECORD;
                destination_batches RECORD;
            BEGIN
                FOR source_batches IN
                    SELECT *
                    FROM batch
                    LEFT JOIN gl_account ON gl_account.id = batch.source_glaccount_id
                    LEFT JOIN institution_account ON gl_account.id = institution_account.gl_account_id
                    WHERE institution_account.id = NEW.id
                LOOP
                    UPDATE batch
                    SET search_vector = get_batch_tsvector(source_batches.batch_code, source_batches.source_glaccount_id, source_batches.destination_glaccount_id)
                    WHERE batch.id = source_batches.id;
                END LOOP;

                FOR destination_batches IN
                    SELECT *
                    FROM batch
                    LEFT JOIN gl_account ON gl_account.id = batch.destination_glaccount_id
                    LEFT JOIN institution_account ON gl_account.id = institution_account.gl_account_id
                    WHERE institution_account.id = NEW.id
                LOOP
                    UPDATE batch
                    SET search_vector = get_batch_tsvector(destination_batches.batch_code, destination_batches.source_glaccount_id, destination_batches.destination_glaccount_id)
                    WHERE batch.id = destination_batches.id;
                END LOOP;

                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(/* sql */ `
            DROP TRIGGER IF EXISTS batch_insert_update ON "batch"
        `);
        await queryRunner.query(/* sql */ `
            DROP TRIGGER IF EXISTS batch_insert ON "batch"
        `);
        await queryRunner.query(/* sql */ `
            DROP TRIGGER IF EXISTS batch_update ON "batch"
        `);

        await queryRunner.query(/* sql */ `
            CREATE TRIGGER batch_insert_update
            BEFORE INSERT OR UPDATE ON "batch"
            FOR EACH ROW EXECUTE PROCEDURE batch_insert_update()
        `);

        await queryRunner.query(/* sql */ `
            UPDATE batch SET id = id;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
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

        await queryRunner.query(/* sql */ `
            CREATE TRIGGER TR_calculate_batch_status
            BEFORE INSERT OR UPDATE ON batch
            FOR EACH ROW EXECUTE PROCEDURE set_batch_status();
        `);

        await queryRunner.query(/* sql */ `
            ALTER TYPE batch_status RENAME TO _batch_status;
            CREATE TYPE batch_status AS ENUM ('PENDING', 'CLEARED', 'RECONCILED');
            ALTER TABLE batch RENAME COLUMN "status" TO "_status";
            ALTER TABLE batch ADD COLUMN "status" batch_status NOT NULL DEFAULT 'PENDING';
            ALTER TABLE batch DROP COLUMN "_status";
            DROP TYPE _batch_status;
        `);
    }
}
