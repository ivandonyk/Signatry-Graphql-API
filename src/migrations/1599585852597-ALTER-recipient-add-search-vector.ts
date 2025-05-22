import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecipientAddSearchVector1599585852597 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // add search vector column
        await queryRunner.query('ALTER TABLE recipient ADD COLUMN search_vector TSVECTOR');

        // create gin index on search vector column
        await queryRunner.query(
            'CREATE INDEX recipient_search ON "recipient" USING gin(search_vector)'
        );

        // trigger function to run on recipient insert/update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION recipient_insert_update() RETURNS trigger AS $$
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
            CREATE TRIGGER recipient_insert_update
            BEFORE INSERT OR UPDATE ON "recipient"
            FOR EACH ROW EXECUTE PROCEDURE recipient_insert_update()
        `);

        // trigger update
        await queryRunner.query('UPDATE recipient set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TRIGGER IF EXISTS recipient_insert_update ON "recipient";');
        await queryRunner.query('DROP FUNCTION IF EXISTS recipient_insert_update');
        await queryRunner.query('DROP INDEX IF EXISTS recipient_search');
        await queryRunner.query('ALTER TABLE recipient DROP COLUMN IF EXISTS search_vector');
    }
}
