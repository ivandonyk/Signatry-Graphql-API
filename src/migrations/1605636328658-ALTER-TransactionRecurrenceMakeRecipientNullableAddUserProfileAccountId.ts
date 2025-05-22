import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionRecurrenceMakeRecipientNullableAddUserProfileAccountId1605636328658
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
          ALTER TABLE transaction_recurrence ALTER COLUMN recipient_id DROP NOT NULL
        `);

        await queryRunner.query(/*sql*/ `
          ALTER TABLE transaction_recurrence ADD COLUMN user_profile_account_id uuid 
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
          ALTER TABLE transaction_recurrence DROP COLUMN user_profile_account_id 
        `);
        await queryRunner.query(/*sql*/ `
          ALTER TABLE transaction_recurrence ALTER COLUMN recipient_id ADD NOT NULL
       `);
    }
}
