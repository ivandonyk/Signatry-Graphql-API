import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDOptionalPaymentNumberToBatch1616434957538 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            ALTER TABLE batch ADD COLUMN payment_number character varying
        `);
        // await queryRunner.query(/*sql */ `
        //     ALTER TABLE batch ALTER COLUMN destination_glaccount_id DROP NOT NULL
        // `);
        // await queryRunner.query(/*sql */ `
        //     ALTER TABLE batch ALTER COLUMN source_glaccount_id DROP NOT NULL
        // `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
            ALTER TABLE batch DROP COLUMN payment_number
        `);
        // await queryRunner.query(/*sql */ `
        //     ALTER TABLE batch ALTER COLUMN destination_glaccount_id SET NOT NULL
        // `);
        // await queryRunner.query(/*sql */ `
        //     ALTER TABLE batch ALTER COLUMN source_glaccount_id SET NOT NULL
        // `);
    }
}
