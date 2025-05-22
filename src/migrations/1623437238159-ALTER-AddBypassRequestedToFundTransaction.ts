import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddBypassRequestedToFundTransaction1623437238159 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE fund_transaction ADD COLUMN bypass_requested boolean NOT NULL DEFAULT FALSE'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE fund_transaction DROP COLUMN bypass_requested');
    }
}
