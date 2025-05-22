import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDUnitPriceHistory1587147483193 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        const unitPriceHistory = await queryRunner.query(
            'SELECT * FROM investment_unit_price_history'
        );

        // seed a unit price for each investment if they don't exist
        if (!unitPriceHistory.length) {
            const investments = await queryRunner.query('SELECT * FROM investment');
            await Promise.all(
                investments.map(async investment => {
                    return await queryRunner.query(
                        `INSERT INTO investment_unit_price_history (close_price, investment_id, previous_price) VALUES (1, '${investment.id}', 1)`
                    );
                })
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        //
    }
}
