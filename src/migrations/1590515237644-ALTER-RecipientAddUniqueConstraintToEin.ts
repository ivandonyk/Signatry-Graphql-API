import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecipientAddUniqueConstraintToEin1590515237644 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('CREATE SEQUENCE ein_sequence');
        await queryRunner.query(
            "UPDATE \"recipient\" SET \"ein\" = '00-' || LPAD(nextval('ein_sequence')::text, 6, '0')"
        );
        await queryRunner.query(
            'ALTER TABLE "recipient" ADD CONSTRAINT "UQ_EIN" UNIQUE ("ein")',
            undefined
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP SEQUENCE ein_sequence');
        await queryRunner.query('ALTER TABLE "recipient" DROP CONSTRAINT "UQ_EIN"');
    }
}
