import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDUpdateAidCausePhoto1600792589220 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        return await queryRunner.query(`
            UPDATE CAUSE SET photo = 'https://storage.googleapis.com/charity-photos/cause/Aid.jpg' WHERE name = 'Aid'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        //
    }
}
