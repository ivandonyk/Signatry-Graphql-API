import { MigrationInterface, QueryRunner } from 'typeorm';

export class DROPConstraintsOnBatchSourceAndDestination1616626775058 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        //     await queryRunner.query(/* sql */ `
        //     ALTER TABLE batch DROP CONSTRAINT source_destination_null_checker
        // `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
        ALTER TABLE batch ADD CONSTRAINT source_destination_null_checker CHECK
        (
            (CASE WHEN source_glaccount_id IS NULL THEN 0 ELSE 1 END
                + CASE WHEN destination_glaccount_id IS NULL THEN 0 ELSE 1 END
            ) >= 1
        )
    `);
    }
}
