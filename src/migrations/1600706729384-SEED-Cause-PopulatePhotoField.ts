import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDCausePopulatePhotoField1600706729384 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update causes with a primary code
        const causesWith = await queryRunner.query(`
            SELECT * FROM cause WHERE primary_code IS NOT NULL;
        `);

        causesWith.map(async cause => {
            return await queryRunner.query(`
                UPDATE CAUSE SET photo = 'https://storage.googleapis.com/charity-photos/cause/${cause.primary_code}.jpg' WHERE id = '${cause.id}'
            `);
        });

        const causesWithout = await queryRunner.query(`
            SELECT * FROM cause WHERE primary_code IS NULL;
        `);

        // Update new causes without a primary code
        causesWithout.map(async cause => {
            const filename = cause.name
                .split(' ')
                .filter(word => word !== '&')
                .join('_');

            return await queryRunner.query(`
                UPDATE CAUSE SET photo = 'https://storage.googleapis.com/charity-photos/cause/${filename}.${
                filename === 'Advocacy' ? 'jpg' : 'png'
            }' WHERE id = '${cause.id}'
            `);
        });

        // Update images for old causes, ticket TS-735
        const codesForUpdating = [
            { code: 'B', file: 'B_SEP_2020.jpg' },
            { code: 'G', file: 'G_SEP_2020.png' },
            { code: 'Q', file: 'Q_SEP_2020.png' },
            { code: 'R', file: 'R_SEP_2020.jpg' }
        ];

        codesForUpdating.map(async codeObj => {
            const { code, file } = codeObj;
            return await queryRunner.query(`
                UPDATE CAUSE SET photo = 'https://storage.googleapis.com/charity-photos/cause/${file}' WHERE primary_code = '${code}'
            `);
        });
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        //
    }
}
