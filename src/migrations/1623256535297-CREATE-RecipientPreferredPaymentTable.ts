import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATERecipientPreferredPaymentTable1623256535297 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "recipient_preferred_payment" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "recipient_id" uuid NOT NULL,
                "payment_type" varchar NOT NULL,
                "metadata" JSONB,
                "created_by" uuid NOT NULL,
                "updated_by" uuid NOT NULL,
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "version" integer NOT NULL DEFAULT 1,
                CONSTRAINT "PK_RecipientPreferredPaymentId" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "recipient_preferred_payment" ADD CONSTRAINT "FK_Recipient_RecipientPreferredPayment" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            CREATE INDEX recipient_id_idx on recipient_preferred_payment (recipient_id)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "recipient_preferred_payment"
        `);
    }
}
