import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDAddIncomeAndGrowthandAggressiveGrowthtoInvestments1588197418058
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            UPDATE investment SET default_allocation_percentage = 0.2, default_divestment_percentage = 0.2 WHERE name = 'Capital Preservation Model'
        `);

        await queryRunner.query(/*sql*/ `
            UPDATE investment SET default_allocation_percentage = 0.4, default_divestment_percentage = 0.4 WHERE name = 'Money Market'
        `);

        const [{ id: incomeAndGrowthId }] = await queryRunner.query(/*sql*/ `
            INSERT INTO investment(name, default_allocation_percentage, default_divestment_percentage, order_num) VALUES ('Income and Growth', 0.1, 0.1, 3) RETURNING *
        `);

        const [{ id: aggressiveGrowthId }] = await queryRunner.query(/*sql*/ `
            INSERT INTO investment(name, default_allocation_percentage, default_divestment_percentage, order_num) VALUES ('Aggressive Growth', 0.1, 0.1, 4) RETURNING *
        `);

        await queryRunner.query(/*sql*/ `
            INSERT INTO investment_unit_price_history(investment_id, close_price) VALUES ('${incomeAndGrowthId}', 1)
        `);

        await queryRunner.query(/*sql*/ `
            INSERT INTO investment_unit_price_history(investment_id, close_price) VALUES ('${aggressiveGrowthId}', 1)
        `);

        await queryRunner.query(/*sql*/ `
            INSERT INTO fund_investment(fund_id, investment_id, allocation_percentage, divestment_percentage) SELECT id, '${incomeAndGrowthId}', 0, 0 FROM fund
        `);

        await queryRunner.query(/*sql*/ `
            INSERT INTO fund_investment(fund_id, investment_id, allocation_percentage, divestment_percentage) SELECT id, '${aggressiveGrowthId}', 0, 0 FROM fund
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            DELETE FROM fund_investment WHERE investment_id IN  (SELECT id FROM investment WHERE investment.name IN ('Income and Growth', 'Aggressive Growth'))
        `);

        await queryRunner.query(/*sql*/ `
            UPDATE investment SET default_allocation_percentage = 0.3, default_divestment_percentage = 0.3 WHERE name = 'Capital Preservation Model'
        `);

        await queryRunner.query(/*sql*/ `
            UPDATE investment SET default_allocation_percentage = 0.5, default_divestment_percentage = 0.5 WHERE name = 'Money Market'
        `);

        await queryRunner.query(/*sql*/ `
            DELETE FROM investment_unit_price_history WHERE investment_id IN  (SELECT id FROM investment WHERE investment.name IN ('Income and Growth', 'Aggressive Growth'))
        `);

        await queryRunner.query(/*sql*/ `
            DELETE FROM investment WHERE investment.name IN  ('Income and Growth', 'Aggressive Growth')
        `);
    }
}
