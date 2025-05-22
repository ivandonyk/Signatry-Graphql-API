import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecipientSearchVectorAddEINToField1603824595853 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TRIGGER IF EXISTS recipient_insert_update ON "recipient"');
        await queryRunner.query('DROP FUNCTION IF EXISTS recipient_insert_update');
        await queryRunner.query('DROP FUNCTION IF EXISTS get_recipient_tsvector');
        // Function to update search vector
        await queryRunner.query(/*sql*/ `
        CREATE OR REPLACE FUNCTION get_recipient_tsvector(recipient RECORD) RETURNS TSVECTOR AS $$
        BEGIN
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    recipient.name || ' ' ||
                    recipient.ein
                );
        END
        $$ LANGUAGE plpgsql
    `);

        // trigger to run on updates/inserts to recipient
        await queryRunner.query(/*sql*/ `
          CREATE OR REPLACE FUNCTION recipient_insert_update() RETURNS trigger AS $$
          BEGIN
              NEW.search_vector := get_recipient_tsvector(NEW);
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
        await queryRunner.query('DROP FUNCTION IF EXISTS get_recipient_tsvector');

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
}
