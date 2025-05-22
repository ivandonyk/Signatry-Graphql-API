import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDAddIsVettedBooleanFieldToRecipient1589918816670 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "recipient" ADD COLUMN "is_vetted" boolean NOT NULL DEFAULT false'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "recipient" DROP COLUMN "is_vetted"');
    }
}
