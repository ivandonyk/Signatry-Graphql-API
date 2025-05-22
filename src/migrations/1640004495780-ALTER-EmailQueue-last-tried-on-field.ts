import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTEREmailQueueLastTriedOnField1640004495780 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('ALTER TABLE email_queue ALTER COLUMN last_tried_on TYPE TIMESTAMP');
        queryRunner.query('ALTER TABLE email_queue ALTER COLUMN last_tried_on SET DEFAULT NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('ALTER TABLE email_queue ALTER COLUMN last_tried_on TYPE DATE');
    }
}
