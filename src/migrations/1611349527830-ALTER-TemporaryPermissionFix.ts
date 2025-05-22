import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTemporaryPermissionFix1611349527830 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query("UPDATE permission SET access_level = 'FULL'");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
