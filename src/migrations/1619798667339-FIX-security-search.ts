import { MigrationInterface, QueryRunner } from 'typeorm';

export class FIXSecuritySearch1619798667339 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TRIGGER IF EXISTS get_security_search_vector ON "security"');
        await queryRunner.query('DROP FUNCTION IF EXISTS get_security_search_vector');
        await queryRunner.query('DROP FUNCTION IF EXISTS get_security_ts_vector');

        await queryRunner.query(/*sql*/ `
        CREATE OR REPLACE FUNCTION get_security_ts_vector(name character varying)
        RETURNS TSVECTOR AS $$
        BEGIN
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
            NEW.search_vector := get_security_ts_vector(NEW.name);
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
        await queryRunner.query('DROP TRIGGER IF EXISTS get_security_search_vector ON "security"');
        await queryRunner.query('DROP FUNCTION IF EXISTS get_security_search_vector');
        await queryRunner.query('DROP FUNCTION IF EXISTS get_security_ts_vector');
    }
}
