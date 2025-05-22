import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropEnumFromBatchPaymentType1618504372026 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        ALTER TABLE batch ALTER COLUMN payment_type TYPE character varying;
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            CREATE TYPE "batch_payment_type" 
            AS ENUM (
                'ACH', 
                'CHECK',
                'DEPOSIT',
                'FEE',
                'INTEREST',
                'WIRE'
        )`);

        await queryRunner.query(/*sql */ `
            ALTER TABLE "batch" ALTER COLUMN "payment_type" TYPE batch_payment_type 
        `);
    }
}
