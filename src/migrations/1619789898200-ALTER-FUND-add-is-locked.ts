import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFUNDAddIsLocked1619789898200 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE fund ADD COLUMN is_locked boolean NOT NULL DEFAULT false;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE fund DROP COLUMN is_locked;');
    }
}
