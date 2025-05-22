import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddIsDonationAddressFlag1597768189764 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "recipient_contact_address" ADD COLUMN "is_donation_address" BOOLEAN DEFAULT false;'
        );
        await queryRunner.query(
            'ALTER TABLE "recipient_contact" ADD COLUMN "donation_address" uuid NULL;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "recipient_contact" DROP COLUMN "donation_address"');
        await queryRunner.query(
            'ALTER TABLE "recipient_contact_address" DROP COLUMN "is_donation_address";'
        );
    }
}
