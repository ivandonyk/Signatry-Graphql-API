import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionTSVector1620244781121 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS fund_transaction_searchvector_insert_update ON "fund_transaction";'
        );
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_fund_transaction_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                fund_name TEXT;
                fund_code TEXT;
                charity TEXT;
                transaction_code_number TEXT;
                transaction_code_prefix TEXT;
                amount TEXT;
                destination_name TEXT;
                destination_code TEXT;
                transaction_description TEXT;
                first_name TEXT;
                last_name TEXT;
            BEGIN
                SELECT
                    REGEXP_REPLACE(fund_transaction.transaction_code, '^[A-Za-z]+-', ''),
                    REGEXP_REPLACE(fund_transaction.transaction_code, '-\d+', ''),
                    ABS(TRUNC(fund_transaction.amount::NUMERIC, 2))::TEXT
                INTO
                    transaction_code_number,
                    transaction_code_prefix,
                    amount
                FROM fund_transaction
                WHERE fund_transaction.id = target_id;

                SELECT
                    fund.name,
                    fund.fund_code
                INTO
                    fund_name,
                    fund_code
                FROM fund
                LEFT JOIN fund_transaction ON fund_transaction.fund_id = fund.id
                WHERE fund_transaction.id = target_id;

                SELECT CAST (metadata -> 'transactionDestination' -> 'fundDetails' ->> 'fundName' AS TEXT)
                INTO destination_name
                FROM fund_transaction
                WHERE fund_transaction.id = target_ID;

                SELECT CAST (metadata -> 'transactionDestination' -> 'fundDetails' ->> 'fundCode' AS TEXT)
                INTO destination_code
                FROM fund_transaction
                WHERE fund_transaction.id = target_ID;

                SELECT CAST (metadata ->> 'description' AS TEXT)
                INTO transaction_description
                FROM fund_transaction
                WHERE fund_transaction.id = target_ID;

                SELECT recipient.name
                INTO charity
                FROM recipient
                LEFT JOIN fund_transaction_info ON fund_transaction_info.recipient_id = recipient.id
                WHERE fund_transaction_info.fund_transaction_id = target_id;

                SELECT 
                    up.first_name,
                    up.last_name
                INTO
                    first_name,
                    last_name
                FROM user_profile up JOIN fund_transaction ft ON (up.id=ft.created_by)
                WHERE ft.id = target_id;

                RETURN to_tsvector(
                    'pg_catalog.simple',
                    coalesce(fund_name, '') || ' ' ||
                    coalesce(charity, '') || ' ' ||
                    coalesce(destination_name, '') || ' ' ||
                    coalesce(destination_code, '') || ' ' ||
                    coalesce(transaction_description, '') || ' ' ||
                    coalesce(transaction_code_number, '') || ' ' ||
                    coalesce(transaction_code_prefix, '') || ' ' ||
                    coalesce(fund_code, '') || ' ' ||
                    coalesce(first_name, '') || ' ' ||
                    coalesce(last_name, '') || ' ' ||
                    coalesce(amount, '')
                );
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger to run on updates/inserts
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fund_transaction_searchvector_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_fund_transaction_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`
            CREATE TRIGGER fund_transaction_searchvector_insert_update
            BEFORE INSERT OR UPDATE ON "fund_transaction"
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_searchvector_insert_update()
        `);

        // trigger update to run function
        await queryRunner.query('UPDATE fund_transaction set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS fund_transaction_searchvector_insert_update ON "fund_transaction";'
        );
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_fund_transaction_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                fund_name TEXT;
                fund_code TEXT;
                charity TEXT;
                transaction_code_number TEXT;
                amount TEXT;
                destination_name TEXT;
                destination_code TEXT;
                first_name TEXT;
                last_name TEXT;
            BEGIN
                SELECT
                    REGEXP_REPLACE(fund_transaction.transaction_code, '^[A-Za-z]-', ''),
                    ABS(TRUNC(fund_transaction.amount::NUMERIC, 2))::TEXT
                INTO
                    transaction_code_number,
                    amount
                FROM fund_transaction
                WHERE fund_transaction.id = target_id;

                SELECT
                    fund.name,
                    fund.fund_code
                INTO
                    fund_name,
                    fund_code
                FROM fund
                LEFT JOIN fund_transaction ON fund_transaction.fund_id = fund.id
                WHERE fund_transaction.id = target_id;

                SELECT CAST (metadata -> 'transactionDestination' -> 'fundDetails' ->> 'fundName' AS TEXT)
                INTO destination_name
                FROM fund_transaction
                WHERE fund_transaction.id = target_ID;

                SELECT CAST (metadata -> 'transactionDestination' -> 'fundDetails' ->> 'fundCode' AS TEXT)
                INTO destination_code
                FROM fund_transaction
                WHERE fund_transaction.id = target_ID;

                SELECT recipient.name
                INTO charity
                FROM recipient
                LEFT JOIN fund_transaction_info ON fund_transaction_info.recipient_id = recipient.id
                WHERE fund_transaction_info.fund_transaction_id = target_id;

                SELECT 
                    up.first_name,
                    up.last_name
                INTO
                    first_name,
                    last_name
                FROM user_profile up JOIN fund_transaction ft ON (up.id=ft.created_by)
                WHERE ft.id = target_id;

                RETURN to_tsvector(
                    'pg_catalog.simple',
                    coalesce(fund_name, '') || ' ' ||
                    coalesce(charity, '') || ' ' ||
                    coalesce(destination_name, '') || ' ' ||
                    coalesce(destination_code, '') || ' ' ||
                    coalesce(transaction_code_number, '') || ' ' ||
                    coalesce(fund_code, '') || ' ' ||
                    coalesce(first_name, '') || ' ' ||
                    coalesce(last_name, '') || ' ' ||
                    coalesce(amount, '')
                );
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger to run on updates/inserts
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fund_transaction_searchvector_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_fund_transaction_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`
            CREATE TRIGGER fund_transaction_searchvector_insert_update
            BEFORE INSERT OR UPDATE ON "fund_transaction"
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_searchvector_insert_update()
        `);

        // trigger update to run function
        await queryRunner.query('UPDATE fund_transaction set id = id');
    }
}
