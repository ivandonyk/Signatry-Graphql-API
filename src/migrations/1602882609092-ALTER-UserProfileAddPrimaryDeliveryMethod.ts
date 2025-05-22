import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUserProfileAddPrimaryDeliveryMethod1602882609092 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE TYPE primary_deliver_methods AS ENUM ('MAIL', 'PAPERLESS')
            `);
        await queryRunner.query(/*sql */ `
            ALTER TABLE user_profile ADD COLUMN primary_delivery_method primary_deliver_methods
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
        ALTER TABLE user_profile DROP COLUMN primary_delivery_method 
        `);

        await queryRunner.query(/*sql*/ `
        DROP TYPE IF EXISTS primary_deliver_methods
        `);
    }
}
