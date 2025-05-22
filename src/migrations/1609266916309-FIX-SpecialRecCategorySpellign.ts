import { MigrationInterface, QueryRunner } from 'typeorm';
const specialRecognitionCategories = [
    'In celebration of',
    'In gratitude for',
    'In honor of',
    'In loving memory of',
    'In recognition of',
    'In the name of',
    'On behalf of'
];
const specialRecognitionCategoriesOld = [
    'In celebration of',
    'In gratitude for',
    'In honor of',
    'In loving memory of',
    'In recognition',
    'In the name of',
    'On behalf of'
];
export class FIXSpecialRecCategorySpellign1609266916309 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const [tenantSettings] = await queryRunner.query(
            'SELECT "app_setting" FROM "tenant" LIMIT 1;'
        );
        tenantSettings.app_setting.specialRecognitionCategories = specialRecognitionCategories;
        await queryRunner.query(
            `UPDATE "tenant" SET "app_setting" = '${JSON.stringify(tenantSettings.app_setting)}';`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const [tenantSettings] = await queryRunner.query(
            'SELECT "app_setting" FROM "tenant" LIMIT 1;'
        );
        tenantSettings.app_setting.specialRecognitionCategories = specialRecognitionCategoriesOld;
        await queryRunner.query(
            `UPDATE "tenant" SET "app_setting" = '${JSON.stringify(tenantSettings.app_setting)}';`
        );
    }
}
