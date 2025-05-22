import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUpdateGetFundTransactionTSVector1613664961681 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
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
            BEGIN
                SELECT
                    REGEXP_REPLACE(fund_transaction.transaction_code, '^[A-Za-z]-', ''),
                    ABS(TRUNC(fund_transaction.amount::NUMERIC, 2))::TEXT
                INTO
                    transaction_code_number,
                    amount
                FROM fund_transaction
                WHERE fund_transaction.id = target_ID;

                SELECT
                    fund.name,
                    fund.fund_code
                INTO
                    fund_name,
                    fund_code
                FROM fund
                LEFT JOIN fund_transaction ON fund_transaction.fund_id = fund.id
                WHERE fund_transaction.id = target_ID;

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
                WHERE fund_transaction_info.fund_transaction_id = target_ID;

                RETURN to_tsvector(
                    'pg_catalog.simple',
                    coalesce(fund_name, '') || ' ' ||
                    coalesce(charity, '') || ' ' ||
                    coalesce(destination_name, '') || ' ' ||
                    coalesce(destination_code, '') || ' ' ||
                    coalesce(transaction_code_number, '') || ' ' ||
                    coalesce(fund_code, '') || ' ' ||
                    coalesce(amount, '')
                );
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query('UPDATE fund_transaction SET id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
        CREATE OR REPLACE FUNCTION get_fund_transaction_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
        DECLARE
            fund_name TEXT;
            fund_code TEXT;
            charity TEXT;
            transaction_code_number TEXT;
            amount TEXT;
        BEGIN
            SELECT
                REGEXP_REPLACE(fund_transaction.transaction_code, '^[A-Za-z]-', ''),
                ABS(TRUNC(fund_transaction.amount::NUMERIC, 2))::TEXT
            INTO
                transaction_code_number,
                amount
            FROM fund_transaction
            WHERE fund_transaction.id = target_ID;

            SELECT
                fund.name,
                fund.fund_code
            INTO
                fund_name,
                fund_code
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
                transaction_code_number || ' ' ||
                fund_code || ' ' ||
                amount
            );
        END
        $$ LANGUAGE plpgsql
    `);

        await queryRunner.query('UPDATE fund_transaction SET id = id');
    }
}
