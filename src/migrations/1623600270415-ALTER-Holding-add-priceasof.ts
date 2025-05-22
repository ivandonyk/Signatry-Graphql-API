import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERHoldingAddPriceasof1623600270415 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE holding ADD COLUMN price_as_of timestamp');
        await queryRunner.query('UPDATE holding SET price_as_of = date');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER holding DROP COLUMN price_as_of');
    }
}
