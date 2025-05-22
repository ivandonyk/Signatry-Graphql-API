import { MigrationInterface, QueryRunner } from 'typeorm';

export class FIXBrokenSearchVectorQuery1621887336726 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS user_profile_insert_update ON "user_profile"'
        );
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS user_profile_role_update ON "user_profile_role"'
        );
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS user_profile_email_insert_update ON "user_profile_email"'
        );

        await queryRunner.query('DROP FUNCTION IF EXISTS user_profile_insert_update');
        await queryRunner.query('DROP FUNCTION IF EXISTS user_profile_role_update');
        await queryRunner.query('DROP FUNCTION IF EXISTS user_profile_email_insert_update');
        await queryRunner.query('DROP FUNCTION IF EXISTS get_user_profile_tsvector');

        // create function to update search vector
        await queryRunner.query(/*sql*/ `
                CREATE OR REPLACE FUNCTION get_user_profile_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
                DECLARE
                    first_name TEXT;
                    last_name TEXT;
                    role_name TEXT;
                    fund_names TEXT;
                    emails TEXT;
                BEGIN
                    -- get first name, last name, role name
                    SELECT
                        user_profile.first_name,
                        user_profile.last_name,
                        role.name
                    INTO
                        first_name,
                        last_name,
                        role_name
                    FROM user_profile
                    LEFT JOIN
                        user_profile_role ON user_profile_role.user_profile_id = user_profile.id
                    LEFT JOIN
                        role ON user_profile_role.role_id = role.id
                    WHERE user_profile.id = target_id;
    
                    -- get string containing all fund names
                    SELECT string_agg(name, ' ')
                    INTO fund_names
                    FROM fund
                    LEFT JOIN fund_user_profile ON fund.id = fund_user_profile.fund_id
                    WHERE fund_user_profile.user_profile_id = target_id
                    GROUP BY fund_user_profile.user_profile_id;
    
                    -- get string containing all email addresses split on '@'
                    SELECT string_agg(replace(value, '@', ' '), ' ')
                    INTO emails
                    FROM user_profile_email
                    WHERE user_profile_email.user_profile_id = target_id;
    
                    -- populate tsvector
                    RETURN to_tsvector(
                        'pg_catalog.simple',
                         COALESCE(first_name, '') || ' ' ||
                         COALESCE(last_name, '') || ' ' ||
                         COALESCE(role_name, '') || ' ' ||
                        COALESCE(fund_names, '')  || ' ' ||
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

        // bind user_profile insert/update trigger
        await queryRunner.query(/*sql*/ `
             CREATE TRIGGER user_profile_insert_update
             BEFORE INSERT OR UPDATE ON "user_profile"
             FOR EACH ROW EXECUTE PROCEDURE user_profile_insert_update()
         `);

        // bind user_profile_role update trigger
        await queryRunner.query(/*sql*/ `
             CREATE TRIGGER user_profile_role_update
             AFTER UPDATE ON "user_profile_role"
             FOR EACH ROW EXECUTE PROCEDURE user_profile_role_update()
         `);

        // bind user_profile_email insert/update trigger
        await queryRunner.query(/*sql*/ `
             CREATE TRIGGER user_profile_email_insert_update
             AFTER INSERT OR UPDATE ON "user_profile_email"
             FOR EACH ROW EXECUTE PROCEDURE user_profile_email_insert_update()
         `);

        await queryRunner.query('UPDATE user_profile set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
