import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTEREmailQueue1637682239467 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('ALTER TABLE email_queue ADD bcc character varying NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query('ALTER TABLE email_queue DROP COLUMN IF EXISTS bcc;');
    }
}
