import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERCauseAddSearchVector1600644196469 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // add search vector column
        await queryRunner.query('ALTER TABLE cause ADD COLUMN search_vector TSVECTOR');

        // create gin index on search vector column
        await queryRunner.query('CREATE INDEX cause_search ON "cause" USING gin(search_vector)');

        // trigger function to run on cause insert/update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION cause_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := to_tsvector(
                    'simple',
                    NEW.name
                );
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind recipient insert/update trigger
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER cause_insert_update
            BEFORE INSERT OR UPDATE ON "cause"
            FOR EACH ROW EXECUTE PROCEDURE cause_insert_update()
        `);

        // trigger update
        await queryRunner.query('UPDATE cause set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TRIGGER IF EXISTS cause_insert_update ON "cause";');
        await queryRunner.query('DROP FUNCTION IF EXISTS cause_insert_update');
        await queryRunner.query('DROP INDEX IF EXISTS cause_search');
        await queryRunner.query('ALTER TABLE cause DROP COLUMN IF EXISTS search_vector');
    }
}
