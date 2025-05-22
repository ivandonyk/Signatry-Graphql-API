import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddInstitutionAndOfficeNameToUserProfile1604428331964
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "user_profile" ADD COLUMN "institution" character varying NULL'
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile" ADD COLUMN "office_name" character varying NULL'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN "institution"');
        await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN "office_name"');
    }
}
