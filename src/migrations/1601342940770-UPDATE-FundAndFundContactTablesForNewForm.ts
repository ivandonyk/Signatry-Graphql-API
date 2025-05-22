import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEFundAndFundContactTablesForNewForm1601342940770 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_contact" ADD "suffix" CHARACTER VARYING
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_contact" ADD "middle_name" CHARACTER VARYING
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_contact" DROP COLUMN "suffix"
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_contact" DROP COLUMN "middle_name"
        `);
    }
}
