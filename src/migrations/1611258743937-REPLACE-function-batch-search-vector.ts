import {MigrationInterface, QueryRunner} from "typeorm";

export class REPLACEFunctionBatchSearchVector1611258743937 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION institution_account_batch_search_insert_update() RETURNS trigger AS $$
            DECLARE
                source_batches RECORD;
                destination_batches RECORD;
            BEGIN
                FOR source_batches IN
                    SELECT batch.id
                    FROM batch
                    LEFT JOIN gl_account ON gl_account.id = batch.source_glaccount_id
                    LEFT JOIN institution_account ON gl_account.id = institution_account.gl_account_id
                    WHERE institution_account.id = NEW.id
                LOOP
                    UPDATE batch
                    SET search_vector = get_batch_tsvector(source_batches.id)
                    WHERE batch.id = source_batches.id;
                END LOOP;

                FOR destination_batches IN
                    SELECT batch.id
                    FROM batch
                    LEFT JOIN gl_account ON gl_account.id = batch.destination_glaccount_id
                    LEFT JOIN institution_account ON gl_account.id = institution_account.gl_account_id
                    WHERE institution_account.id = NEW.id
                LOOP
                    UPDATE batch
                    SET search_vector = get_batch_tsvector(destination_batches.id)
                    WHERE batch.id = destination_batches.id;
                END LOOP;

                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
