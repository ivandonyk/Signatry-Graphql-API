import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddTSVectorToGrants1601303513743 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing triggers (copied from down migration in FundTransaction-AddSearchVector)
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS fund_transaction_vector_update ON "fund_transaction";'
        );
        await queryRunner.query('DROP FUNCTION IF EXISTS update_fund_transaction_tsvector');

        // New update function
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_fund_transaction_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                fund_name TEXT;
                fund_code TEXT;
                fund_code_segments TEXT;
                charity TEXT;
                transaction_code TEXT;
                transaction_code_segments TEXT;
            BEGIN
                SELECT
                    fund_transaction.transaction_code,
                    REGEXP_REPLACE(fund_transaction.transaction_code, '-', ' ')
                INTO
                    transaction_code,
                    transaction_code_segments
                FROM fund_transaction
                WHERE fund_transaction.id = target_ID;

                SELECT
                    fund.name,
                    fund.fund_code,
                    REGEXP_REPLACE(fund.fund_code, '-', ' ')
                INTO
                    fund_name,
                    fund_code,
                    fund_code_segments
                FROM fund
                LEFT JOIN fund_transaction ON fund_transaction.fund_id = fund.id
                WHERE fund_transaction.id = target_ID;

                SELECT recipient.name
                INTO charity
                FROM recipient
                LEFT JOIN fund_transaction_info ON fund_transaction_info.recipient_id = recipient.id
                WHERE fund_transaction_info.fund_transaction_id = target_ID;

                RETURN to_tsvector(
                    'pg_catalog.simple',
                    fund_name || ' ' ||
                    coalesce(charity, '') || ' ' ||
                    transaction_code || ' ' ||
                    transaction_code_segments || ' ' ||
                    fund_code || ' ' ||
                    fund_code_segments
                );
            END
            $$ LANGUAGE plpgsql
        `);

        // fund_transaction trigger
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION fund_transaction_insert_update() RETURNS trigger AS $$ 
            BEGIN
                IF NEW.transaction_code <> OLD.transaction_code THEN
                    UPDATE fund_transaction
                    SET search_vector = get_fund_transaction_tsvector(NEW.id)
                    WHERE id = NEW.id;
                END IF;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(/* sql */ `
            CREATE TRIGGER fund_transaction_insert_update
            AFTER INSERT OR UPDATE ON "fund_transaction"
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_insert_update()
        `);

        // fund trigger
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION fund_transaction_fund_insert_update() RETURNS trigger AS $$
            BEGIN
                UPDATE fund_transaction
                SET search_vector = get_fund_transaction_tsvector(fund_transaction.id)
                WHERE fund_transaction.fund_id = NEW.id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);
        await queryRunner.query(/* sql */ `
            CREATE TRIGGER fund_transaction_fund_insert_update
            AFTER INSERT OR UPDATE on "fund"
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_fund_insert_update()
        `);

        // recipient trigger
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION fund_transaction_recipient_insert_update() RETURNS trigger AS $$
            BEGIN
                UPDATE fund_transaction
                SET search_vector = get_fund_transaction_tsvector(fund_transaction.id)
                WHERE fund_transaction.id IN (
                    SELECT fund_transaction.id FROM fund_transaction
                    LEFT JOIN fund_transaction_info ON fund_transaction_info.fund_transaction_id = fund_transaction.id
                    WHERE fund_transaction_info.recipient_id = NEW.id
                );

                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(/* sql */ `
            CREATE TRIGGER fund_transaction_recipient_insert_update
            AFTER INSERT OR UPDATE ON "recipient"
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_recipient_insert_update()
        `);

        // trigger build
        await queryRunner.query('UPDATE fund SET id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS fund_transaction_insert_update ON "fund_transaction";
        `);
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS fund_transaction_fund_insert_update ON "fund";
        `);
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS fund_transaction_recipient_insert_update ON "recipient";
        `);

        await queryRunner.query(`
            DROP FUNCTION IF EXISTS fund_transaction_insert_update
        `);
        await queryRunner.query(`
            DROP FUNCTION IF EXISTS fund_transaction_fund_insert_update
        `);
        await queryRunner.query(`
            DROP FUNCTION IF EXISTS fund_transaction_recipient_insert_update
        `);

        // reinstate old functions
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION update_fund_transaction_tsvector() RETURNS trigger AS $$
            DECLARE
                transaction_code text;
                transaction_code_segments text;
                transaction_date text;
                fund_code text;
                fund_code_segments text;
                fund_contact_first_name text;
                fund_contact_last_name text;
            BEGIN
            SELECT
                fund_transaction.transaction_code,
                REGEXP_REPLACE(fund_transaction.transaction_code, '-', ' '),  
                TO_CHAR(fund_transaction.transaction_date_time, 'MM/DD/YYYY'),
                fund.fund_code,
                REGEXP_REPLACE(fund.fund_code, '-', ' '),
                fund_contact.first_name,
                fund_contact.last_name
            INTO
                transaction_code,
                transaction_code_segments,
                transaction_date,
                fund_code,
                fund_code_segments,
                fund_contact_first_name,
                fund_contact_last_name
            FROM fund_transaction
            LEFT JOIN
                fund ON fund_transaction.fund_id = fund.id
            LEFT JOIN
                fund_contact ON fund_contact.fund_id = fund.id
            WHERE fund_transaction.id = new.id;

            new.search_vector :=
                to_tsvector(
                    'pg_catalog.simple',
                    transaction_code || ' ' ||
                    transaction_code_segments || ' ' ||
                    transaction_date || ' ' ||
                    fund_code || ' ' ||
                    fund_code_segments || ' ' ||
                    fund_contact_first_name || ' ' ||
                    fund_contact_last_name
                );
            RETURN new;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind trigger to run update function on insert/update
        await queryRunner.query(`
            CREATE TRIGGER fund_transaction_vector_update
            BEFORE INSERT OR UPDATE ON "fund_transaction"
            FOR EACH ROW EXECUTE PROCEDURE update_fund_transaction_tsvector()
        `);
    }
}
