import { MigrationInterface, QueryRunner } from 'typeorm';

export class addPhoneNumberType1579720963328 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'CREATE TABLE "phone_number_type" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" integer NOT NULL DEFAULT 1, "name" character varying NOT NULL, CONSTRAINT "PK_09375e87a5e34ebb3823fa83701" PRIMARY KEY ("id"))',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" ADD "type_id" uuid',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" ADD CONSTRAINT "FK_b8d8381b8fac8e7abfd554611f9" FOREIGN KEY ("type_id") REFERENCES "phone_number_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
            undefined
        );
        const ids = await queryRunner.query(
            "INSERT INTO \"phone_number_type\" (name) VALUES ('Home'), ('Mobile'), ('Work') RETURNING id"
        );
        // remove address fields in user_profile_phone_number table
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" DROP COLUMN "city"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" DROP COLUMN "state"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" DROP COLUMN "postal_code"',
            undefined
        );
        // populate existing phone numbers with 'Mobile' type
        await queryRunner.query(
            `UPDATE "user_profile_phone_number" SET "type_id" = '${ids[1].id}'`
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" ALTER COLUMN "type_id" SET NOT NULL'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" ADD "postal_code" character varying',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" ADD "state" character varying',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" ADD "city" character varying',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" DROP CONSTRAINT "FK_b8d8381b8fac8e7abfd554611f9"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "user_profile_phone_number" DROP COLUMN "type_id"',
            undefined
        );
        await queryRunner.query('DROP TABLE "phone_number_type"', undefined);
    }
}
