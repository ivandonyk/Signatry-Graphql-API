import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundAddPrimaryAccountHolderIdToRecord1604091884451 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            ALTER TABLE fund ADD COLUMN primary_account_holder_id uuid
        `);
        await queryRunner.query(/*sql */ `
            UPDATE fund SET primary_account_holder_id = created_by WHERE primary_account_holder_id is NULL
        `);
        await queryRunner.query(/*sql */ `
          ALTER TABLE fund ALTER COLUMN primary_account_holder_id SET NOT NULL
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            ALTER TABLE fund DROP COLUMNN primary_account_holder_id 
        `);
    }
}
