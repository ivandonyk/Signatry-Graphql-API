import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERInstitutionAccountFixTSVector1602266462379 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // drop the old trigger
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS institution_account_insert_update ON "institution_account";'
        );

        // create function to update search vector
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_institution_account_tsvector(record RECORD) RETURNS TSVECTOR AS $$
            BEGIN
                -- populate tsvector
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    record.custodian_name || ' ' ||
                    record.display_name || ' ' ||
                    record.account_number || ' '
                );
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger function to run on institution_account insert/update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION institution_account_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_institution_account_tsvector(NEW);
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
