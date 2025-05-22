import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDRebalanceSequence1619035454775 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE SEQUENCE rebalanceTransactionCode START WITH 1');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP SEQUENCE rebalanceTransactionCode');
    }
}
