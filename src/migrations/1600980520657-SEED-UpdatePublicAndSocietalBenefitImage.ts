import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDUpdatePublicAndSocietalBenefitImage1600980520657 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        return await queryRunner.query(`
            UPDATE CAUSE SET photo = 'https://storage.googleapis.com/charity-photos/cause/W_SEP_2020.jpg' WHERE primary_code = 'W'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        //
    }
}
