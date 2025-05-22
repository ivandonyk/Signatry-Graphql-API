import { MigrationInterface, QueryRunner } from 'typeorm';
import dayjs from 'dayjs';

export class ALTERAddExpiredRecipientStatus1600363175284 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "recipient" ADD COLUMN "approval_expiration_date" DATE NULL;'
        );

        const [approvedStatus] = await queryRunner.query(
            'SELECT id from "recipient_status" WHERE "name" = \'APPROVED\';'
        );

        await queryRunner.query(
            `UPDATE "recipient" SET "approval_expiration_date" = '${dayjs()
                .add(18, 'month')
                .format('YYYY-MM-DD')}'
            WHERE "recipient_status_id" = '${approvedStatus.id}';`
        );

        await queryRunner.query(`/* sql */ 
            INSERT INTO "recipient_status" (name, ordinal) VALUES (
                'EXPIRED',
                4
            )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "approval_expiration_date";');

        await queryRunner.query('DELETE FROM "recipient_status" WHERE name = \'EXPIRED\';');
    }
}
