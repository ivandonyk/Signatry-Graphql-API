import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERInstitutionAccountTSVector1602114326597 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // add search vector column
        await queryRunner.query(
            'ALTER TABLE institution_account ADD COLUMN search_vector TSVECTOR'
        );

        // create gin index on search vector column
        await queryRunner.query(
            'CREATE INDEX institution_account_search ON "institution_account" USING gin(search_vector)'
        );

        // create function to update search vector
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_institution_account_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                custodian_name TEXT;
                display_name TEXT;
                account_number TEXT;
            BEGIN
                -- get single values
                SELECT
                    institution_account.custodian_name,
                    institution_account.display_name,
                    institution_account.account_number
                INTO
                    custodian_name,
                    display_name,
                    account_number
                FROM institution_account
                WHERE institution_account.id = target_id;

                -- populate tsvector
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    custodian_name || ' ' ||
                    display_name || ' ' ||
                    account_number || ' '
                );
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger function to run on institution_account insert/update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION institution_account_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_institution_account_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind institution_account insert/update trigger
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER institution_account_insert_update
            BEFORE INSERT OR UPDATE ON "institution_account"
            FOR EACH ROW EXECUTE PROCEDURE institution_account_insert_update()
        `);

        // trigger update to run function
        await queryRunner.query('UPDATE institution_account set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS institution_account_insert_update ON "institution_account";'
        );
        await queryRunner.query('DROP FUNCTION IF EXISTS institution_account_update;');
        await queryRunner.query('DROP INDEX IF EXISTS institution_account_search;');
        await queryRunner.query(
            'ALTER TABLE institution_account DROP COLUMN IF EXISTS search_vector;'
        );
    }
}
