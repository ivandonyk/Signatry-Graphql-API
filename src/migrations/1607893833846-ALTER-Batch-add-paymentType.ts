import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERBatchAddPaymentType1607893833846 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TYPE "batch_payment_type" 
        AS ENUM (
            'ACH', 
            'CHECK',
            'DEPOSIT',
            'FEE',
            'INTEREST',
            'WIRE'
        )`);

        await queryRunner.query(`
        ALTER TABLE "batch" ADD COLUMN "payment_type" batch_payment_type NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        ALTER TABLE "batch" DROP COLUMN "payment_type";
        `);

        await queryRunner.query(`
        DROP TYPE IF EXISTS "batch_payment_type";
        `);
    }

}
