import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionPaymentForSearchVector1640017425036 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE transaction_payment ADD COLUMN search_vector TSVECTOR'
        );
        // create gin index on search vector column
        await queryRunner.query(
            'CREATE INDEX transaction_payment_search ON "transaction_payment" USING gin(search_vector)'
        );

        // create function to update search vector
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION update_transaction_payment_tsvector() RETURNS trigger AS $$
            DECLARE
                payment_id text;
                payment_date text;
                payment_type text;
            BEGIN
            SELECT
                id,
                date,
                type
            INTO
                payment_id,
                payment_date,
                payment_type
            FROM transaction_payment
            WHERE transaction_payment.id = new.id;
            new.search_vector :=
                to_tsvector(
                    'pg_catalog.simple',
                    payment_id || ' ' ||
                    payment_date || ' ' ||
                    payment_type
                );
            RETURN new;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind trigger to run update function on insert/update
        await queryRunner.query(`
            CREATE TRIGGER transaction_payment_vector_update
            BEFORE INSERT OR UPDATE ON "transaction_payment"
            FOR EACH ROW EXECUTE PROCEDURE update_transaction_payment_tsvector()
        `);

        // trigger update to run function
        await queryRunner.query('UPDATE transaction_payment set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS transaction_payment_vector_update ON "transaction_payment";'
        );
        await queryRunner.query('DROP FUNCTION IF EXISTS update_transaction_payment_tsvector');
        await queryRunner.query('DROP INDEX IF EXISTS transaction_payment_search');
        await queryRunner.query(
            'ALTER TABLE transaction_payment DROP COLUMN IF EXISTS search_vector'
        );
    }
}
