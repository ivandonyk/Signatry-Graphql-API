import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionAddSpecialApproval1591204520366 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction ADD COLUMN "final_review" boolean DEFAULT false
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction ADD COLUMN "special_approval" boolean DEFAULT null
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction DROP COLUMN "final_review"
        `);
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction DROP COLUMN "special_approval"
        `);
    }
}
