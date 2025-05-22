import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionAddCreatedByAdmin1606344818307 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund_transaction
            ADD COLUMN created_by_admin_id uuid null,
            ADD CONSTRAINT "FK_CreatedByAdmin" FOREIGN KEY("created_by_admin_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE fund_transaction DROP COLUMN created_by_admin_id');
    }
}
