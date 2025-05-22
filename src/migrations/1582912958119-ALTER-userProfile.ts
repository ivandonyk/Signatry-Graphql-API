import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERProfileAccount1582912958119 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "user_profile" RENAME "stripe_customer_id" TO "customer_id"'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "user_profile" RENAME "customer_id" TO "stripe_customer_id"'
        );
    }
}
