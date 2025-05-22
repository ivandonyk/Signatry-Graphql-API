import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionAddSearchVector1586791770775 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        // add search vector column
        await queryRunner.query('ALTER TABLE fund_transaction ADD COLUMN search_vector TSVECTOR');
        // create gin index on search vector column
        await queryRunner.query(
            'CREATE INDEX fund_transaction_search ON "fund_transaction" USING gin(search_vector)'
        );
        // create function to update search vector
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

        // trigger update to run function
        await queryRunner.query('UPDATE fund_transaction set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS fund_transaction_vector_update ON "fund_transaction";'
        );
        await queryRunner.query('DROP FUNCTION IF EXISTS update_fund_transaction_tsvector');
        await queryRunner.query('DROP INDEX IF EXISTS fund_transaction_search');
        await queryRunner.query('ALTER TABLE fund_transaction DROP COLUMN IF EXISTS search_vector');
    }
}
