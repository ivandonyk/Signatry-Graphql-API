import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionInfoAddRecognitionGranularity1595355827533
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_transaction_info" DROP COLUMN "recognition"
        `);
        queryRunner.query(/*sql*/ `
            ALTER TABLE "fund_transaction_info" ADD "include_fund_name_in_recognition" BOOLEAN NOT NULL DEFAULT TRUE
        `);
        queryRunner.query(/*sql*/ `
          ALTER TABLE "fund_transaction_info" ADD "include_donor_name_in_recognition" BOOLEAN NOT NULL DEFAULT TRUE
        `);
        queryRunner.query(/*sql*/ `
          ALTER TABLE "fund_transaction_info" ADD "include_donor_address_in_recognition" BOOLEAN NOT NULL DEFAULT TRUE
        `);
        queryRunner.query(/*sql*/ `
          ALTER TABLE "fund_transaction_info" ADD "purpose_category" character varying
        `);
        queryRunner.query(/*sql*/ `
          ALTER TABLE "fund_transaction_info" ADD "special_recognition" character varying
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/*sql*/ `
        ALTER TABLE "fund_transaction_info" DROP COLUMN "purpose_category"
      `);
        queryRunner.query(/*sql*/ `
        ALTER TABLE "fund_transaction_info" DROP COLUMN "include_fund_name_in_recognition"
    `);
        queryRunner.query(/*sql*/ `
          ALTER TABLE "fund_transaction_info" DROP COLUMN "include_donor_name_in_recognition"
      `);
        queryRunner.query(/*sql*/ `
         ALTER TABLE "fund_transaction_info" DROP COLUMN "include_donor_address_in_recognition"
     `);
        queryRunner.query(/*sql*/ `
        ALTER TABLE "fund_transaction_info" ADD "recognition" BOOLEAN NOT NULL DEFAULT TRUE
     `);
    }
}
