import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERBatchAddSearchVector1611161432097 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE batch ADD COLUMN search_vector TSVECTOR');

        await queryRunner.query('CREATE INDEX batch_search ON "batch" USING gin(search_vector)');

        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_batch_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                source_account_number TEXT;
                destination_account_number TEXT;
                source_display_name TEXT;
                destination_display_name TEXT;
                batch_number TEXT;
            BEGIN
                SELECT
                    batch.batch_code
                INTO
                    batch_number
                FROM batch
                WHERE batch.id = target_id;

                SELECT
                    institution_account.account_number,
                    institution_account.display_name
                INTO
                    source_account_number,
                    source_display_name
                FROM
                    institution_account
                LEFT JOIN gl_account ON gl_account.id = institution_account.gl_account_id
                LEFT JOIN batch ON gl_account.id = batch.source_glaccount_id
                WHERE batch.id = target_id;

                SELECT
                    institution_account.account_number,
                    institution_account.display_name
                INTO
                    destination_account_number,
                    destination_display_name
                FROM
                    institution_account
                LEFT JOIN gl_account ON gl_account.id = institution_account.gl_account_id
                LEFT JOIN batch ON gl_account.id = batch.destination_glaccount_id
                WHERE batch.id = target_id;

                RETURN to_tsvector(
                    'pg_catalog.simple',
                    COALESCE(source_account_number, '') || ' ' ||
                    COALESCE(source_display_name, '') || ' ' ||
                    COALESCE(destination_account_number, '') || ' ' ||
                    COALESCE(destination_display_name, '') || ' ' ||
                    batch_number
                );
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger function to run on batch insert/update
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION batch_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_batch_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind batch insert/update trigger
        await queryRunner.query(/* sql */ `
            CREATE TRIGGER batch_insert_update
            BEFORE INSERT OR UPDATE ON "batch"
            FOR EACH ROW EXECUTE PROCEDURE batch_insert_update()
        `);

        // trigger function to run on gl_account insert/update
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION institution_account_batch_search_insert_update() RETURNS trigger AS $$
            DECLARE
                source_batches RECORD;
                destination_batches RECORD;
            BEGIN
                FOR source_batches IN
                    SELECT id
                    FROM batch
                    LEFT JOIN gl_account ON gl_account.id = batch.source_glaccount_id
                    LEFT JOIN institution_account ON gl_account.id = institution_account.gl_account_id
                    WHERE institution_account.id = NEW.id
                LOOP
                    UPDATE batch
                    SET search_vector = get_batch_tsvector(source_batches.id)
                    WHERE batch.id = source_batches.id;
                END LOOP;

                FOR destination_batches IN
                    SELECT id
                    FROM batch
                    LEFT JOIN gl_account ON gl_account.id = batch.destination_glaccount_id
                    LEFT JOIN institution_account ON gl_account.id = institution_account.gl_account_id
                    WHERE institution_account.id = NEW.id
                LOOP
                    UPDATE batch
                    SET search_vector = get_batch_tsvector(destination_batches.id)
                    WHERE batch.id = destination_batches.id;
                END LOOP;

                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind batch insert/update trigger
        await queryRunner.query(/* sql */ `
            CREATE TRIGGER institution_account_batch_search_insert_update
            BEFORE INSERT OR UPDATE ON "institution_account"
            FOR EACH ROW EXECUTE PROCEDURE institution_account_batch_search_insert_update()
        `);

        // update all batches
        await queryRunner.query('UPDATE batch SET id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS institution_account_batch_search_insert_update ON "institution_account";'
        );
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS institution_account_batch_search_insert_update;'
        );
        await queryRunner.query('DROP TRIGGER IF EXISTS batch_insert_update ON "batch";');
        await queryRunner.query('DROP FUNCTION IF EXISTS batch_insert_update;');
        await queryRunner.query('DROP FUNCTION IF EXISTS get_batch_tsvector;');
        await queryRunner.query('DROP INDEX IF EXISTS batch_search;');
        await queryRunner.query('ALTER TABLE batch DROP COLUMN IF EXISTS search_vector;');
    }
}
