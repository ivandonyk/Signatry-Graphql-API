import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailToInvitationTable1594664391761 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DELETE FROM "invitation"');
        await queryRunner.query('ALTER TABLE "invitation" ADD "email" character varying NOT NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "invitation" DROP COLUMN "email"');
    }
}
