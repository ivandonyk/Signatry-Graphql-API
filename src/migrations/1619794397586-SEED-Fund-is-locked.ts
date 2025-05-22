import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDFundIsLocked1619794397586 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('update fund set is_locked = false');
    }

    // can't really revert the above, becz the default clause on is_locked is false
    public async down(queryRunner: QueryRunner): Promise<void> {
        return Promise.resolve();
    }
}
