import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTEREmailQueue1638467176498 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('ALTER TABLE email_queue ADD last_tried_on DATE NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('ALTER TABLE email_queue DROP COLUMN IF EXISTS last_tried_on;');
    }
}
