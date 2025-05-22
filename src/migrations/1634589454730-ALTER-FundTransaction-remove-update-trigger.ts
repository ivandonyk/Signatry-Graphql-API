import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERFundTransactionRemoveUpdateTrigger1634589454730 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TRIGGER IF EXISTS updated_get_fund_transaction_detail_tsvector_before_update ON fund_transaction_detail');
        await queryRunner.query('DROP TRIGGER IF EXISTS fund_transaction_searchvector_insert_update ON fund_transaction');

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fund_transaction_searchvector_after_insert() RETURNS trigger AS $$
            BEGIN
                UPDATE fund_transaction
                SET search_vector = get_fund_transaction_tsvector(NEW.id)
                WHERE id = NEW.id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`
            CREATE TRIGGER fund_transaction_searchvector_insert_update
            AFTER INSERT ON "fund_transaction"
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_searchvector_after_insert()
        `);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TRIGGER IF EXISTS fund_transaction_searchvector_after_insert');

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fund_transaction_searchvector_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_fund_transaction_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`
            CREATE TRIGGER fund_transaction_searchvector_insert_update
            BEFORE INSERT OR UPDATE ON "fund_transaction"
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_searchvector_insert_update()
        `);

        await queryRunner.query(/*sql */ `
            CREATE TRIGGER updated_get_fund_transaction_detail_tsvector_before_update
            BEFORE UPDATE ON "fund_transaction_detail"
            FOR EACH ROW EXECUTE PROCEDURE updated_get_fund_transaction_detail_tsvector_before_update()
        `);
    }

}
