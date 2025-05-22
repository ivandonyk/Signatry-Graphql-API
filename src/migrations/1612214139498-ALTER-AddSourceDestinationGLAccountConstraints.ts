import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddSourceDestinationGLAccountConstraints1612214139498
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE batch ALTER COLUMN "source_glaccount_id" DROP NOT NULL
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE batch ALTER COLUMN "destination_glaccount_id" DROP NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE batch ALTER COLUMN "source_glaccount_id" SET NOT NULL
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE batch ALTER COLUMN "destination_glaccount_id" SET NOT NULL
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE batch DROP CONSTRAINT source_destination_null_checker
        `);
    }
}
