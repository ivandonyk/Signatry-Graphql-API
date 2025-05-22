import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERGLAccountReconciliationAddSearchVector1608305030067
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add column for search vector
        await queryRunner.query(
            'ALTER TABLE gl_account_reconciliation ADD COLUMN search_vector TSVECTOR'
        );

        // Create gin index for new column
        await queryRunner.query(
            'CREATE INDEX gl_account_reconciliation_search ON "gl_account_reconciliation" USING gin(search_vector)'
        );

        // Function to update search vector
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_gl_account_reconciliation_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                institution_account_name TEXT;
                account_name TEXT;
                account_number TEXT;
            BEGIN
                -- get gl_account values
                SELECT
                    a.title,
                    a.account_number,
                    ia.display_name
                INTO
                    account_name,
                    account_number,
                    institution_account_name
                FROM gl_account_reconciliation r 
                INNER JOIN gl_account a ON r.gl_account_id = a.id
                INNER JOIN institution_account ia ON ia.gl_account_id = a.id
                WHERE r.id = target_id;

                -- populate tsvector
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    institution_account_name || ' ' ||
                    account_name || ' ' ||
                    account_number
                );
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger to run on updates/inserts
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION gl_account_reconciliation_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_gl_account_reconciliation_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind trigger
        await queryRunner.query(`
            CREATE TRIGGER gl_account_reconciliation_insert_update
            BEFORE INSERT OR UPDATE ON "gl_account_reconciliation"
            FOR EACH ROW EXECUTE PROCEDURE gl_account_reconciliation_insert_update()
        `);

        // trigger function to run on institution_account update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION gl_account_reconciliation_on_institution_account_insert_update() RETURNS trigger AS $$
            BEGIN
                UPDATE gl_account_reconciliation
                SET search_vector = get_user_profile_tsvector(id)
                WHERE gl_account_id IN (SELECT ia.gl_account_id FROM institution_account ia WHERE ia.id = NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind trigger to institution_account
        await queryRunner.query(`
            CREATE TRIGGER gl_account_reconciliation_on_institution_account_insert_update
            AFTER INSERT OR UPDATE ON "institution_account"
            FOR EACH ROW EXECUTE PROCEDURE gl_account_reconciliation_on_institution_account_insert_update()
        `);

        // trigger function to run on gl_account update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION gl_account_reconciliation_on_gl_account_insert_update() RETURNS trigger AS $$
            BEGIN
                UPDATE gl_account_reconciliation
                SET search_vector = get_user_profile_tsvector(id)
                WHERE gl_account_id = NEW.id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind trigger to gl_account
        await queryRunner.query(`
            CREATE TRIGGER gl_account_reconciliation_on_gl_account_insert_update
            AFTER INSERT OR UPDATE ON "gl_account"
            FOR EACH ROW EXECUTE PROCEDURE gl_account_reconciliation_on_gl_account_insert_update()
        `);

        // trigger first build
        await queryRunner.query('UPDATE gl_account_reconciliation set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS gl_account_reconciliation_insert_update ON "gl_account_reconciliation";'
        );
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS gl_account_reconciliation_on_institution_account_insert_update ON "institution_account";'
        );
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS gl_account_reconciliation_on_gl_account_insert_update ON "gl_account";'
        );

        await queryRunner.query('DROP FUNCTION IF EXISTS gl_account_reconciliation_insert_update');
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS gl_account_reconciliation_on_institution_account_insert_update'
        );
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS gl_account_reconciliation_on_gl_account_insert_update ON "gl_account";'
        );
        await queryRunner.query('DROP FUNCTION IF EXISTS get_gl_account_reconciliation_tsvector');

        await queryRunner.query('DROP INDEX IF EXISTS gl_account_reconciliation_search');
        await queryRunner.query(
            'ALTER TABLE gl_account_reconciliation DROP COLUMN IF EXISTS search_vector'
        );
    }
}
