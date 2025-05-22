import {MigrationInterface, QueryRunner} from "typeorm";

export class DROPTriggerInvestmentUnitPrice1619388689264 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER TR_investment_unit_price_history_insert ON investment_unit_price_history`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_investment_unit_price_history_insert
            AFTER INSERT ON investment_unit_price_history
            FOR EACH ROW EXECUTE PROCEDURE investment_unit_price_history_insert();
        `);
    }

}
