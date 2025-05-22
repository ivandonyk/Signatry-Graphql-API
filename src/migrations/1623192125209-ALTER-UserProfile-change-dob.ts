import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUserProfileChangeDob1623192125209 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
        ALTER TABLE user_profile ALTER COLUMN dob TYPE date USING dob::date;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql https://is.gd/P0jTHe */ `
        ALTER TABLE user_profile ALTER COLUMN dob TYPE character varying;
        `);
    }
}
