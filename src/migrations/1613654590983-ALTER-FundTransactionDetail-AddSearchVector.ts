import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionDetailAddSearchVector1613654590983 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // add search vector column
        await queryRunner.query(
            'ALTER TABLE fund_transaction_detail ADD COLUMN search_vector TSVECTOR'
        );
        // create gin index on search vector column
        await queryRunner.query(
            'CREATE INDEX fund_transaction_detail_search ON "fund_transaction_detail" USING gin(search_vector)'
        );
        // create function to update search vector
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION update_fund_transaction_detail_tsvector() RETURNS trigger AS $$
            DECLARE
                fund_name text;
                fund_code text;
                primary_donor_first_name text;
                primary_donor_last_name text;
                source_account_number text;
                destination_account_number text;
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
                COALESCE(sia.account_number, ''),
                COALESCE(dia.account_number, ''),
                COALESCE(sta.mask, ''),
                COALESCE(dta.mask, ''),
                COALESCE(sia.name, ''),
                COALESCE(dia.name, ''),
                COALESCE(sta.name, ''),
                COALESCE(dta.name, '')
            INTO
                fund_name,
                fund_code,
                primary_donor_first_name,
                primary_donor_last_name,
                source_account_number,
                destination_account_number,
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
            WHERE ftd.id = new.id;

            new.search_vector :=
                to_tsvector(
                    'pg_catalog.simple',
                    fund_name || ' ' ||
                    fund_code || ' ' ||
                    primary_donor_first_name || ' ' ||
                    primary_donor_last_name || ' ' ||
                    source_account_number || ' ' ||
                    destination_account_number || ' ' ||
                    source_inst_account_number || ' ' ||
                    destination_inst_account_number || ' ' ||
                    source_tenant_account_number || ' ' ||
                    destination_tenant_account_number || ' ' ||
                    source_inst_account_name || ' ' ||
                    destination_inst_account_name || ' ' ||
                    source_tenant_account_name || ' ' ||
                    destination_tenant_account_name
                );
            RETURN new;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind trigger to run update function on insert/update
        await queryRunner.query(`
            CREATE TRIGGER fund_transaction_detail_vector_update
            BEFORE INSERT OR UPDATE ON "fund_transaction_detail"
            FOR EACH ROW EXECUTE PROCEDURE update_fund_transaction_detail_tsvector()
        `);

        // trigger update to run function
        await queryRunner.query('UPDATE fund_transaction_detail set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS fund_transaction_detail_vector_update ON "fund_transaction_detail";'
        );

        await queryRunner.query('DROP FUNCTION IF EXISTS update_fund_transaction_detail_tsvector');

        await queryRunner.query('DROP INDEX IF EXISTS fund_transaction_detail_search');
        await queryRunner.query(
            'ALTER TABLE fund_transaction_detail DROP COLUMN IF EXISTS search_vector'
        );
    }
}
