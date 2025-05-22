import { MigrationInterface, QueryRunner } from 'typeorm';

export class RENAMENotificationsToSingular1614191470932 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('alter table if exists notifications rename to notification;');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('alter table if exists notification rename to notifications;');
    }
}
