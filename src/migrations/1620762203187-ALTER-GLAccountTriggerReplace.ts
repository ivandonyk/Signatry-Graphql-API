import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERGLAccountTriggerReplace1620762203187 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS gl_account_reconciliation_insert_update ON "gl_account_reconciliation";'
        );

        await queryRunner.query('DROP FUNCTION IF EXISTS gl_account_reconciliation_insert_update');

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION gl_account_reconciliation_before_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_gl_account_reconciliation_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`
            CREATE TRIGGER gl_account_reconciliation_before_update
            BEFORE UPDATE ON "gl_account_reconciliation"
            FOR EACH ROW EXECUTE PROCEDURE gl_account_reconciliation_before_update();
        `);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION gl_account_reconciliation_after_insert() RETURNS trigger AS $$
            BEGIN
                UPDATE gl_account_reconciliation SET search_vector = get_gl_account_reconciliation_tsvector(NEW.id) WHERE id = NEW.id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`
            CREATE TRIGGER gl_account_reconciliation_after_insert
            AFTER INSERT ON "gl_account_reconciliation"
            FOR EACH ROW EXECUTE PROCEDURE gl_account_reconciliation_after_insert();
        `);

        await queryRunner.query('UPDATE gl_account_reconciliation SET id = id;');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No down: old trigger was faulty.
    }
}
