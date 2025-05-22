import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERPoolHoldingAddPriceasof1623606644778 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE pool_investment_holding ADD COLUMN IF NOT EXISTS price_as_of timestamp'
        );
        await queryRunner.query('UPDATE pool_investment_holding SET price_as_of = date');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER pool_investment_holding DROP COLUMN IF EXISTS price_as_of');
    }
}
