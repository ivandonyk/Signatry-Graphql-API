import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionAddCreatedByUserProfileIdToRelations1604699865939
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
           ALTER TABLE fund_transaction ADD COLUMN user_profile_id UUID 
       `);

        await queryRunner.query(/*sql */ `
            UPDATE fund_transaction SET user_profile_id = created_by WHERE fund_transaction.user_profile_id IS NULL
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE fund_transaction ALTER COLUMN user_profile_id SET NOT NULL 
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
        ALTER TABLE fund_transaction DROP COLUMN user_profile_id 
    `);
    }
}
