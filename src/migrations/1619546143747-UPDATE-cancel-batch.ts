import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATECancelBatch1619546143747 implements MigrationInterface {
    private async alterColumnAndDropEnum(queryRunner: QueryRunner): Promise<void> {
        return await queryRunner.query(`
            ALTER TABLE "batch" ALTER COLUMN "status" TYPE VARCHAR;
            DROP TYPE IF EXISTS "batch_status" CASCADE;`);
    }

    private async createEnumAndAlterColumn(
        queryRunner: QueryRunner,
        values: string
    ): Promise<void> {
        return await queryRunner.query(`
            CREATE TYPE "batch_status" AS ENUM (${values});
            ALTER TABLE "batch" ALTER COLUMN "status" TYPE "batch_status" USING "status"::"batch_status";
            ALTER TABLE "batch" ALTER COLUMN "status" SET DEFAULT 'PENDING';
            ALTER TABLE "batch" ALTER COLUMN "status" SET NOT NULL;
        `);
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.alterColumnAndDropEnum(queryRunner);
        // fixed "CANCELLED" values
        await queryRunner.query(
            'UPDATE "batch" SET "status" = \'CANCELED\' WHERE "status" = \'CANCELLED\';'
        );
        // add CANCELED
        await this.createEnumAndAlterColumn(
            queryRunner,
            "'PENDING', 'PARTIAL', 'POSTED', 'CANCELED'"
        );
        // added column
        await queryRunner.query('ALTER TABLE "batch" ADD COLUMN "cancel_metadata" JSONB');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // remove CANCELED
        await this.alterColumnAndDropEnum(queryRunner);
        // await this.createEnumAndAlterColumn(queryRunner, "'PENDING', 'PARTIAL', 'POSTED'");
        // remove column
        await queryRunner.query('ALTER TABLE "batch" DROP COLUMN IF EXISTS "cancel_metadata"');
    }
}
