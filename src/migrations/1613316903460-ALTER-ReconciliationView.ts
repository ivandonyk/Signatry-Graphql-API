import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERReconciliationView1613316903460 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE VIEW gl_account_reconciliation_view AS
                SELECT r.id,
                    COUNT(iat.id) as unreconciled_count,
                    coalesce(SUM(iat.amount), 0) as unreconciled_amount,
                    (coalesce(SUM(iat.amount), 0) * 100) / (CASE WHEN r.balance_open = 0 THEN 1 ELSE r.balance_open END) as change
                FROM gl_account_reconciliation r
                LEFT JOIN institution_account ia 
                    ON ia.gl_account_id = r.gl_account_id
                LEFT JOIN tenant_account ta 
                    ON ta.gl_account_id = r.gl_account_id
                LEFT JOIN institution_account_transaction iat 
                    ON (iat.institution_account_id = ia.id)
                    OR (iat.tenant_account_id = ta.id)
                WHERE 
                    r.date_reconciled IS NULL
                    AND iat.gl_account_reconciliation_id IS NULL
                GROUP BY r.id, r.balance_open;
        `);

        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_gl_account_reconciliation_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                gl_account_name TEXT;
                institution_account_custodian TEXT;
                institution_account_name TEXT;
                institution_account_number TEXT;
                tenant_account_name TEXT;
                tenant_account_number TEXT;
            BEGIN
                -- get gl_account values
                SELECT
                    a.title,
                    ia.custodian_name,
                    ia.account_number,
                    ia.display_name,
                    ta.name,
                    ta.mask
                INTO
                    gl_account_name,
                    institution_account_custodian,
                    institution_account_number,
                    institution_account_name,
                    tenant_account_name,
                    tenant_account_number
                FROM gl_account_reconciliation r 
                INNER JOIN gl_account a ON r.gl_account_id = a.id
                LEFT JOIN institution_account ia ON ia.gl_account_id = a.id
                LEFT JOIN tenant_account ta ON ta.gl_account_id = a.id
                WHERE r.id = target_id;

                -- populate tsvector
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    COALESCE(institution_account_name, '') || ' ' ||
                    COALESCE(tenant_account_name, '') || ' ' ||
                    COALESCE(tenant_account_number, '') || ' ' ||
                    COALESCE(gl_account_name, '') || ' ' ||
                    COALESCE(institution_account_custodian, '') || ' ' ||
                    COALESCE(institution_account_number, '')
                );
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION gl_account_reconciliation_on_tenant_account_insert_update() RETURNS trigger AS $$
            BEGIN
                UPDATE gl_account_reconciliation
                SET search_vector = get_gl_account_reconciliation_tsvector(id)
                WHERE gl_account_id IN (SELECT ta.gl_account_id FROM tenant_account ta WHERE ta.id = NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`
            CREATE TRIGGER gl_account_reconciliation_on_tenant_account_insert_update
            AFTER INSERT OR UPDATE ON "tenant_account"
            FOR EACH ROW EXECUTE PROCEDURE gl_account_reconciliation_on_tenant_account_insert_update()
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE VIEW gl_account_reconciliation_view AS
                SELECT r.id,
                    COUNT(iat.id) as unreconciled_count,
                    coalesce(SUM(iat.amount), 0) as unreconciled_amount,
                    (coalesce(SUM(iat.amount), 0) * 100) / (CASE WHEN r.balance_open = 0 THEN 1 ELSE r.balance_open END) as change
                FROM gl_account_reconciliation r
                INNER JOIN institution_account ia ON ia.gl_account_id = r.gl_account_id
                LEFT JOIN institution_account_transaction iat ON iat.institution_account_id = ia.id
                WHERE 
                    r.date_reconciled IS NULL
                    AND iat.gl_account_reconciliation_id IS NULL
                GROUP BY r.id, r.balance_open;
        `);

        // Function to update search vector
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_gl_account_reconciliation_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                institution_account_name TEXT;
                account_name TEXT;
                account_number TEXT;
            BEGIN
                -- get gl_account values
                SELECT
                    a.title,
                    a.account_number,
                    ia.display_name
                INTO
                    account_name,
                    account_number,
                    institution_account_name
                FROM gl_account_reconciliation r 
                INNER JOIN gl_account a ON r.gl_account_id = a.id
                INNER JOIN institution_account ia ON ia.gl_account_id = a.id
                WHERE r.id = target_id;

                -- populate tsvector
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    institution_account_name || ' ' ||
                    account_name || ' ' ||
                    account_number
                );
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(
            'DROP TRIGGER IF EXISTS gl_account_reconciliation_on_tenant_account_insert_update ON "tenant_account";'
        );  
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS gl_account_reconciliation_on_tenant_account_insert_update'
        );
    }

}
