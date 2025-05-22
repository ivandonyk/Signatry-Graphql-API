import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDSecuritySearchVector1617636721372 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            ALTER TABLE batch DROP COLUMN payment_number
        `);
        await queryRunner.query('ALTER TABLE security ADD COLUMN search_vector TSVECTOR');

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_security_ts_vector(target_id UUID)
            RETURNS TSVECTOR AS $$
            DECLARE
                name text;
            BEGIN
            SELECT
                COALESCE(s.name, '')
            INTO
                name
            FROM security s
            WHERE s.id = target_id;
            RETURN to_tsvector(
                    'pg_catalog.simple',
                   name
                );
            END
            $$ LANGUAGE plpgsql
        `);
        // trigger to run on updates/inserts
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION get_security_search_vector() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_security_ts_vector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);
        await queryRunner.query(`
            CREATE TRIGGER get_security_search_vector
            BEFORE INSERT OR UPDATE ON "security"
            FOR EACH ROW EXECUTE PROCEDURE get_security_search_vector()
        `);
        await queryRunner.query('UPDATE security set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            ALTER TABLE batch ADD COLUMN payment_number character varying
        `);
        await queryRunner.query('DROP TRIGGER IF EXISTS get_security_search_vector ON "security"');
        await queryRunner.query('DROP FUNCTION IF EXISTS get_security_search_vector');
        await queryRunner.query('DROP FUNCTION IF EXISTS get_security_ts_vector');
    }
}
