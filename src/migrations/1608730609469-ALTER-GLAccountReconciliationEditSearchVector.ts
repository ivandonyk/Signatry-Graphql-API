import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERGLAccountReconciliationEditSearchVector1608730609469
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
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
                    ia.display_name,
                    ia.account_number,
                    ia.custodian_name
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

        // trigger function to run on institution_account update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION gl_account_reconciliation_on_institution_account_insert_update() RETURNS trigger AS $$
            BEGIN
                UPDATE gl_account_reconciliation
                SET search_vector = get_gl_account_reconciliation_tsvector(id)
                WHERE gl_account_id IN (SELECT ia.gl_account_id FROM institution_account ia WHERE ia.id = NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger function to run on gl_account update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION gl_account_reconciliation_on_gl_account_insert_update() RETURNS trigger AS $$
            BEGIN
                UPDATE gl_account_reconciliation
                SET search_vector = get_gl_account_reconciliation_tsvector(id)
                WHERE gl_account_id = NEW.id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger first build
        await queryRunner.query('UPDATE gl_account_reconciliation set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
