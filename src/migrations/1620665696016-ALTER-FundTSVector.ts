import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTSVector1620665696016 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_fund_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                fund_name TEXT;
                fund_code TEXT;
            BEGIN
                SELECT
                    fund.name,
                    fund.fund_code
                INTO
                    fund_name,
                    fund_code
                FROM fund
                WHERE fund.id = target_ID;

                RETURN to_tsvector(
                    'pg_catalog.simple',
                    fund_name || ' ' ||
                    fund_code
                );
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION fund_contact_email_insert_update() RETURNS trigger AS $$
            DECLARE
                fund_id TEXT;
            BEGIN
                SELECT fund.id
                INTO fund_id
                FROM fund
                LEFT JOIN fund_contact ON fund_contact.fund_id = fund.id
                WHERE fund_contact.id = NEW.fund_contact_id;

                UPDATE fund
                SET search_vector = get_fund_tsvector(fund_id::UUID)
                WHERE id = fund_id::UUID;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(/* sql */ `
            UPDATE fund SET id = id;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_fund_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                fund_name TEXT;
                fund_code TEXT;
                primary_first_name TEXT;
                primary_last_name TEXT;
                primary_emails TEXT;
            BEGIN
                -- get single values
                SELECT
                    fund.name,
                    fund.fund_code
                INTO
                    fund_name,
                    fund_code
                FROM fund
                WHERE fund.id = target_ID;

                -- get single values
                SELECT
                    fund_contact.first_name,
                    fund_contact.last_name
                INTO
                    primary_first_name,
                    primary_last_name
                FROM fund_contact
                WHERE fund_contact.fund_id = target_ID AND fund_contact.is_primary;

                -- aggregate emails for primary contact
                SELECT string_agg(replace(value, '@', ' '), ' ')
                INTO primary_emails
                FROM fund_contact_email
                LEFT JOIN fund_contact ON fund_contact.id = fund_contact_email.fund_contact_id
                WHERE fund_contact.fund_id = target_id AND fund_contact.is_primary;

                -- populate tsvector
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    fund_name || ' ' ||
                    fund_code || ' ' ||
                    primary_first_name || ' ' ||
                    primary_last_name || ' ' ||
                    COALESCE(primary_emails, '') 
                );
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION fund_contact_email_insert_update() RETURNS trigger AS $$
            DECLARE
                fund_id TEXT;
            BEGIN
                SELECT fund.id
                INTO fund_id
                FROM fund
                LEFT JOIN fund_contact ON fund_contact.fund_id = fund.id
                WHERE fund_contact.id = NEW.fund_contact_id;

                UPDATE fund
                SET search_vector = get_fund_tsvector(fund_id::UUID)
                WHERE id = fund_id::UUID;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);
    }
}
