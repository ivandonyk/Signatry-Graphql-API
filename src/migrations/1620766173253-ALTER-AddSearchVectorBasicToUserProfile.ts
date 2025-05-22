import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddSearchVectorBasicToUserProfile1620766173253 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE user_profile ADD COLUMN search_vector_basic TSVECTOR');

        await queryRunner.query(
            'CREATE INDEX user_profile_search_basic ON "user_profile" USING gin(search_vector_basic)'
        );

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_user_profile_tsvector_basic(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                first_name TEXT;
                last_name TEXT;
                emails TEXT;
            BEGIN
                -- get first name, last name, role name
                SELECT
                    user_profile.first_name,
                    user_profile.last_name
                INTO
                    first_name,
                    last_name
                FROM user_profile
                WHERE user_profile.id = target_id;

                -- get string containing all email addresses split on '@'
                SELECT string_agg(replace(value, '@', ' '), ' ')
                INTO emails
                FROM user_profile_email
                WHERE user_profile_email.user_profile_id = target_id;

                -- populate tsvector
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    first_name || ' ' ||
                    last_name || ' ' ||
                    COALESCE(emails, '')
                );
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION user_profile_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_user_profile_tsvector(NEW.id);
                NEW.search_vector_basic := get_user_profile_tsvector_basic(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger function to run on user_profile_role update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION user_profile_role_update() RETURNS trigger AS $$
            BEGIN
                UPDATE user_profile
                SET search_vector = get_user_profile_tsvector(NEW.user_profile_id),
                search_vector_basic = get_user_profile_tsvector_basic(NEW.user_profile_id)
                WHERE id = NEW.user_profile_id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger function to run on user_profile_email insert/update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION user_profile_email_insert_update() RETURNS trigger AS $$
            BEGIN
                UPDATE user_profile
                SET search_vector = get_user_profile_tsvector(NEW.user_profile_id),
                search_vector_basic = get_user_profile_tsvector_basic(NEW.user_profile_id)
                WHERE id = NEW.user_profile_id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query('UPDATE user_profile set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION user_profile_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_user_profile_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger function to run on user_profile_role update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION user_profile_role_update() RETURNS trigger AS $$
            BEGIN
                UPDATE user_profile
                SET search_vector = get_user_profile_tsvector(NEW.user_profile_id)
                WHERE id = NEW.user_profile_id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger function to run on user_profile_email insert/update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION user_profile_email_insert_update() RETURNS trigger AS $$
            BEGIN
                UPDATE user_profile
                SET search_vector = get_user_profile_tsvector(NEW.user_profile_id)
                WHERE id = NEW.user_profile_id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query('DROP INDEX IF EXISTS user_profile_search_basic');
        await queryRunner.query(
            'ALTER TABLE user_profile DROP COLUMN IF EXISTS search_vector_basic'
        );
        await queryRunner.query('DROP FUNCTION IF EXISTS get_user_profile_tsvector_basic');
    }
}
