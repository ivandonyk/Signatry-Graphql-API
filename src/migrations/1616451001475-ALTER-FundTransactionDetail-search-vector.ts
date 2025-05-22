import { MigrationInterface, QueryRunner } from 'typeorm';
export class ALTERFundTransactionDetailSearchVector1616451001475 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS fund_transaction_detail_searchvector_insert_update ON "fund_transaction_detail"'
        );
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS fund_transaction_detail_searchvector_insert_update'
        );
        await queryRunner.query('DROP FUNCTION IF EXISTS get_fund_transaction_detail_tsvector');
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION updated_get_fund_transaction_detail_tsvector(target_id UUID)
            RETURNS TSVECTOR AS $$
            DECLARE
                fund_name text;
                fund_code text;
                primary_donor_first_name text;
                primary_donor_last_name text;
                source_account_number text;
                destination_account_number text;
                source_account_name text;
                destination_account_name text;
                source_inst_account_number text;
                destination_inst_account_number text;
                source_tenant_account_number text;
                destination_tenant_account_number text;
                source_inst_account_name text;
                destination_inst_account_name text;
                source_tenant_account_name text;
                destination_tenant_account_name text;
                transaction_detail_type text;
            BEGIN
            SELECT
                COALESCE(f."name", ''),
                COALESCE(f.fund_code, ''),
                COALESCE(up.first_name, ''),
                COALESCE(up.last_name, ''),
                COALESCE(sa.account_number, ''),
                COALESCE(da.account_number, ''),
                COALESCE(regexp_replace(sa.title, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(regexp_replace(da.title, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(regexp_replace(sia.account_number, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(regexp_replace(dia.account_number, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(sta.mask, ''),
                COALESCE(dta.mask, ''),
                COALESCE(regexp_replace(sia.name, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(regexp_replace(dia.name, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(sta.name, ''),
                COALESCE(dta.name, ''),
                tdt.name
            INTO
                fund_name,
                fund_code,
                primary_donor_first_name,
                primary_donor_last_name,
                source_account_number,
                destination_account_number,
                source_account_name,
                destination_account_name,
                source_inst_account_number,
                destination_inst_account_number,
                source_tenant_account_number,
                destination_tenant_account_number,
                source_inst_account_name,
                destination_inst_account_name,
                source_tenant_account_name,
                destination_tenant_account_name,
                transaction_detail_type
            FROM fund_transaction_detail ftd
            LEFT JOIN
                transaction_detail_type tdt ON tdt.id = ftd.transaction_detail_type_id
            LEFT JOIN
                fund_investment fi ON fi.id = ftd.fund_investment_id
            LEFT JOIN
                fund f ON f.id = fi.fund_id
            LEFT JOIN
                user_profile up ON up.id = f.created_by_user_profile_id
            LEFT JOIN
                gl_account sa ON sa.id = ftd.source_glaccount_id
            LEFT JOIN
                gl_account da ON da.id = ftd.destination_glaccount_id
            LEFT JOIN
                institution_account sia ON sia.gl_account_id = sa.id
            LEFT JOIN
                institution_account dia ON dia.gl_account_id = da.id
            LEFT JOIN
                tenant_account sta ON sta.gl_account_id = sa.id
            LEFT JOIN
                tenant_account dta ON dta.gl_account_id = da.id
            WHERE ftd.id = target_id;
            RETURN to_tsvector(
                    'pg_catalog.simple',
                    fund_name || ' ' ||
                    fund_code || ' ' ||
                    primary_donor_first_name || ' ' ||
                    primary_donor_last_name || ' ' ||
                    source_account_number || ' ' ||
                    destination_account_number || ' ' ||
                    source_account_name || ' ' ||
                    destination_account_name || ' ' ||
                    source_inst_account_number || ' ' ||
                    destination_inst_account_number || ' ' ||
                    source_tenant_account_number || ' ' ||
                    destination_tenant_account_number || ' ' ||
                    source_inst_account_name || ' ' ||
                    destination_inst_account_name || ' ' ||
                    source_tenant_account_name || ' ' ||
                    destination_tenant_account_name || ' ' ||
                    transaction_detail_type
                );
            END
            $$ LANGUAGE plpgsql
        `);
        // trigger to run on updates/inserts
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION updated_get_fund_transaction_detail_tsvector_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := updated_get_fund_transaction_detail_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);
        await queryRunner.query(`
            CREATE TRIGGER updated_get_fund_transaction_detail_tsvector_insert_update
            BEFORE INSERT OR UPDATE ON "fund_transaction_detail"
            FOR EACH ROW EXECUTE PROCEDURE updated_get_fund_transaction_detail_tsvector_insert_update()
        `);
        await queryRunner.query('UPDATE fund_transaction_detail set id = id');
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS updated_get_fund_transaction_detail_tsvector_insert_update ON "fund_transaction_detail"'
        );
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS updated_get_fund_transaction_detail_tsvector_insert_update'
        );
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS updated_get_fund_transaction_detail_tsvector'
        );
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_transaction_detail_tsvector(target_id UUID)
            RETURNS TSVECTOR AS $$
            DECLARE
                fund_name text;
                fund_code text;
                primary_donor_first_name text;
                primary_donor_last_name text;
                source_account_number text;
                destination_account_number text;
                source_account_name text;
                destination_account_name text;
                source_inst_account_number text;
                destination_inst_account_number text;
                source_tenant_account_number text;
                destination_tenant_account_number text;
                source_inst_account_name text;
                destination_inst_account_name text;
                source_tenant_account_name text;
                destination_tenant_account_name text;
            BEGIN
            SELECT
                f."name",
                f.fund_code,
                up.first_name,
                up.last_name,
                COALESCE(sa.account_number, ''),
                COALESCE(da.account_number, ''),
                COALESCE(regexp_replace(sa.title, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(regexp_replace(da.title, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(regexp_replace(sia.account_number, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(regexp_replace(dia.account_number, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(sta.mask, ''),
                COALESCE(dta.mask, ''),
                COALESCE(regexp_replace(sia.name, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(regexp_replace(dia.name, '[Xx|-]+(\\d+)', ' \\1', 'g'), ''),
                COALESCE(sta.name, ''),
                COALESCE(dta.name, '')
            INTO
                fund_name,
                fund_code,
                primary_donor_first_name,
                primary_donor_last_name,
                source_account_number,
                destination_account_number,
                source_account_name,
                destination_account_name,
                source_inst_account_number,
                destination_inst_account_number,
                source_tenant_account_number,
                destination_tenant_account_number,
                source_inst_account_name,
                destination_inst_account_name,
                source_tenant_account_name,
                destination_tenant_account_name
            FROM fund_transaction_detail ftd
            LEFT JOIN
                fund_investment fi ON fi.id = ftd.fund_investment_id
            LEFT JOIN
                fund f ON f.id = fi.fund_id
            LEFT JOIN
                user_profile up ON up.id = f.created_by_user_profile_id
            LEFT JOIN
                gl_account sa ON sa.id = ftd.source_glaccount_id
            LEFT JOIN
                gl_account da ON da.id = ftd.destination_glaccount_id
            LEFT JOIN
                institution_account sia ON sia.gl_account_id = sa.id
            LEFT JOIN
                institution_account dia ON dia.gl_account_id = da.id
            LEFT JOIN
                tenant_account sta ON sta.gl_account_id = sa.id
            LEFT JOIN
                tenant_account dta ON dta.gl_account_id = da.id
            WHERE ftd.id = target_id;
            RETURN to_tsvector(
                    'pg_catalog.simple',
                    fund_name || ' ' ||
                    fund_code || ' ' ||
                    primary_donor_first_name || ' ' ||
                    primary_donor_last_name || ' ' ||
                    source_account_number || ' ' ||
                    destination_account_number || ' ' ||
                    source_account_name || ' ' ||
                    destination_account_name || ' ' ||
                    source_inst_account_number || ' ' ||
                    destination_inst_account_number || ' ' ||
                    source_tenant_account_number || ' ' ||
                    destination_tenant_account_number || ' ' ||
                    source_inst_account_name || ' ' ||
                    destination_inst_account_name || ' ' ||
                    source_tenant_account_name || ' ' ||
                    destination_tenant_account_name
                );
            END
            $$ LANGUAGE plpgsql
        `);
        // trigger to run on updates/inserts
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fund_transaction_detail_searchvector_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_fund_transaction_detail_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);
        await queryRunner.query(`
            CREATE TRIGGER fund_transaction_detail_searchvector_insert_update
            BEFORE INSERT OR UPDATE ON "fund_transaction_detail"
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_detail_searchvector_insert_update()
        `);
        await queryRunner.query('UPDATE fund_transaction_detail set id = id');
    }
}
