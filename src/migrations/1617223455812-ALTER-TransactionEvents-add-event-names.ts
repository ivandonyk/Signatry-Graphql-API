import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionEventsAddEventNames1617223455812 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TYPE "transaction_event_name" RENAME TO "_transaction_event_name"'
        );
        await queryRunner.query(`
            CREATE TYPE "transaction_event_name" AS ENUM (
                'SUBMITTED', 
                'DUE_DILIGENCE_STARTED', 
                'REVIEW_STARTED', 
                'PAYMENTS_STARTED', 
                'ON_HOLD', 
                'OFF_HOLD', 
                'FINAL_REVIEW_APPROVED', 
                'SPECIAL_APPROVAL_GIVEN', 
                'AVAILABLE_BALANCE_APPROVED', 
                'CHARITY_VETTED', 
                'PURPOSE_NOTES_APPROVED', 
                'SPECIAL_INSTRUCTIONS_APPROVED', 
                'PROCESSED', 
                'CANCELED',
                'REQUESTED',
                'EDITED',
                'DIVESTED',
                'POSTED',
                'CREATED',
                'INVESTED'
            )`);

        await queryRunner.query(`
            ALTER TABLE "transaction_event" 
            RENAME COLUMN "name" TO "_name"
        `);

        await queryRunner.query(`
            ALTER TABLE "transaction_event" 
            ADD COLUMN "name" "transaction_event_name"
        `);

        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'SUBMITTED' WHERE "_name" = 'SUBMITTED'
        `);

        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'DUE_DILIGENCE_STARTED' WHERE "_name" = 'DUE_DILIGENCE_STARTED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'REVIEW_STARTED' WHERE "_name" = 'REVIEW_STARTED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'REVIEW_STARTED' WHERE "_name" = 'REVIEW_STARTED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'PAYMENTS_STARTED' WHERE "_name" = 'PAYMENTS_STARTED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'ON_HOLD' WHERE "_name" = 'ON_HOLD'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'FINAL_REVIEW_APPROVED' WHERE "_name" = 'FINAL_REVIEW_APPROVED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'SPECIAL_APPROVAL_GIVEN' WHERE "_name" = 'SPECIAL_APPROVAL_GIVEN'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'AVAILABLE_BALANCE_APPROVED' WHERE "_name" = 'AVAILABLE_BALANCE_APPROVED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'CHARITY_VETTED' WHERE "_name" = 'CHARITY_VETTED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'PURPOSE_NOTES_APPROVED' WHERE "_name" = 'PURPOSE_NOTES_APPROVED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'PROCESSED' WHERE "_name" = 'PROCESSED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'CANCELED' WHERE "_name" = 'CANCELED'
        `);

        await queryRunner.query('ALTER TABLE "transaction_event" DROP COLUMN "_name"');
        await queryRunner.query('DROP TYPE "_transaction_event_name"');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TYPE "transaction_event_name" RENAME TO "_transaction_event_name"'
        );
        await queryRunner.query(`
            CREATE TYPE "transaction_event_name" AS ENUM (
                'SUBMITTED', 
                'DUE_DILIGENCE_STARTED', 
                'REVIEW_STARTED', 
                'PAYMENTS_STARTED', 
                'ON_HOLD', 
                'OFF_HOLD', 
                'FINAL_REVIEW_APPROVED', 
                'SPECIAL_APPROVAL_GIVEN', 
                'AVAILABLE_BALANCE_APPROVED', 
                'CHARITY_VETTED', 
                'PURPOSE_NOTES_APPROVED', 
                'SPECIAL_INSTRUCTIONS_APPROVED', 
                'PROCESSED', 
                'CANCELED',
            )`);

        await queryRunner.query(`
            ALTER TABLE "transaction_event" 
            RENAME COLUMN "name" TO "_name"
        `);

        await queryRunner.query(`
            ALTER TABLE "transaction_event" 
            ADD COLUMN "name" "transaction_event_name"
        `);

        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'SUBMITTED' WHERE "_name" = 'SUBMITTED'
        `);

        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'DUE_DILIGENCE_STARTED' WHERE "_name" = 'DUE_DILIGENCE_STARTED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'REVIEW_STARTED' WHERE "_name" = 'REVIEW_STARTED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'REVIEW_STARTED' WHERE "_name" = 'REVIEW_STARTED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'PAYMENTS_STARTED' WHERE "_name" = 'PAYMENTS_STARTED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'ON_HOLD' WHERE "_name" = 'ON_HOLD'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'FINAL_REVIEW_APPROVED' WHERE "_name" = 'FINAL_REVIEW_APPROVED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'SPECIAL_APPROVAL_GIVEN' WHERE "_name" = 'SPECIAL_APPROVAL_GIVEN'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'AVAILABLE_BALANCE_APPROVED' WHERE "_name" = 'AVAILABLE_BALANCE_APPROVED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'CHARITY_VETTED' WHERE "_name" = 'CHARITY_VETTED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'PURPOSE_NOTES_APPROVED' WHERE "_name" = 'PURPOSE_NOTES_APPROVED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'PROCESSED' WHERE "_name" = 'PROCESSED'
        `);
        await queryRunner.query(`
            UPDATE "transaction_event" 
            SET "name" = 'CANCELED' WHERE "_name" = 'CANCELED'
        `);

        await queryRunner.query('ALTER TABLE "transaction_event" DROP COLUMN "_name"');
        await queryRunner.query('DROP TYPE "_transaction_event_name"');
    }
}
