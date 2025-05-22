import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddSerialCodeToCause1597770803892 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "cause" ADD COLUMN "code" serial;');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "cause" DROP COLUMN "code";');
    }
}
