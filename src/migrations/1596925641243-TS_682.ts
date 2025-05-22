import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecipientTS6821596925641243 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // drop cause_category column
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient DROP COLUMN "cause_category"
        `);

        // drop non_profit_status column
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient DROP COLUMN "non_profit_status"
        `);

        // drop ofac column
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient DROP COLUMN "ofac"
        `);

        // recreate ofac as text
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient ADD COLUMN "ofac" text
        `);

        // add vetted_on timestamp
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient ADD COLUMN "vetted_on" TIMESTAMP
        `);

        // populate vetted_on timestamps for existing records
        await queryRunner.query(/*sql*/ `
            UPDATE recipient
            SET vetted_on = CURRENT_TIMESTAMP
            WHERE is_vetted = true
        `);

        // photos array
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient ADD COLUMN "photos" text[] NOT NULL DEFAULT array[]::text[]
        `);

        // logo
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient ADD COLUMN "logo" text
        `);

        // GuideStar seal enum type
        await queryRunner.query(/*sql*/ `
            CREATE TYPE guidestar_seal AS enum ('Bronze', 'Silver', 'Gold', 'Platinum')
        `);

        // GuideStar seal
        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient ADD COLUMN "guidestar_seal" guidestar_seal
        `);

        /**
         * Create tag table
         */

        await queryRunner.query(/*sql*/ `
            CREATE TABLE "tag" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" text NOT NULL,
                "display_name" text NOT NULL,
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "created_by" uuid NULL,
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_by" uuid NULL,
                "version" integer NOT NULL DEFAULT 1,
                "enabled" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_TagId" PRIMARY KEY ("id"))
        `);

        // seed tag table
        await queryRunner.query(/*sql*/ `
            INSERT INTO "tag" ("name", "display_name")
            VALUES
                ('favorite', 'Favorites'),
                ('initiative', 'New Initiatives')
        `);

        /**
         * Create recipient_tag table
         */

        await queryRunner.query(/*sql*/ `
            CREATE TABLE "recipient_tag" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tag_id" uuid NOT NULL,
                "recipient_id" uuid NOT NULL,
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "created_by" uuid NULL,
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_by" uuid NULL,
                "version" integer NOT NULL DEFAULT 1,
                "enabled" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_RecipientTagId" PRIMARY KEY ("id"))
        `);

        // add constraints
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient_tag"
            ADD CONSTRAINT "FK_recipient_tag_recipient_id"
            FOREIGN KEY ("recipient_id")
            REFERENCES "recipient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient_tag"
            ADD CONSTRAINT "FK_recipient_tag_tag_id"
            FOREIGN KEY ("tag_id")
            REFERENCES "tag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        /**
         * Create cause table
         */

        await queryRunner.query(/*sql*/ `
            CREATE TABLE "cause" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" text NOT NULL,
                "primary_code" text NOT NULL,
                "description" text,
                "photo" text,
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "created_by" uuid NULL,
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_by" uuid NULL,
                "version" integer NOT NULL DEFAULT 1,
                "enabled" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_CauseId" PRIMARY KEY ("id"))
        `);

        // seed cause table
        await queryRunner.query(/*sql*/ `
            INSERT INTO "cause" ("name", "primary_code")
            VALUES
                ('Arts, Culture & Humanities', 'A'),
                ('Education', 'B'),
                ('Environment', 'C'),
                ('Animals ', 'D'),
                ('Health Care', 'E'),
                ('Mental Health & Crisis Intervention', 'F'),
                ('Voluntary Health Associations & Medical Disciplines', 'G'),
                ('Medical Research', 'H'),
                ('Crime & Legal', 'I'),
                ('Employment', 'J'),
                ('Food, Agriculture & Nutrition', 'K'),
                ('Housing & Shelter', 'L'),
                ('Public Safety, Disaster Preparedness & Relief', 'M'),
                ('Recreation & Sports', 'N'),
                ('Youth Development', 'O'),
                ('Human Services', 'P'),
                ('International, Foreign Affairs & National Security', 'Q'),
                ('Civil Rights, Social Action & Advocacy', 'R'),
                ('Community Improvement & Capacity Building', 'S'),
                ('Philanthropy, Voluntarism & Grantmaking Foundations', 'T'),
                ('Science & Technology', 'U'),
                ('Social Science', 'V'),
                ('Public & Societal Benefit', 'W'),
                ('Religious Organizations ', 'X'),
                ('Mutual & Membership Benefit', 'Y'),
                ('Unknown', 'Z')
        `);

        /**
         * Create recipient_cause table
         */

        await queryRunner.query(/*sql*/ `
            CREATE TABLE "recipient_cause" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "cause_id" uuid NOT NULL,
                "recipient_id" uuid NOT NULL,
                "is_primary" boolean NOT NULL DEFAULT false,
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "created_by" uuid NULL,
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_by" uuid NULL,
                "version" integer NOT NULL DEFAULT 1,
                "enabled" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_RecipientCauseId" PRIMARY KEY ("id"))
        `);

        // add constraints
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient_cause"
            ADD CONSTRAINT "FK_recipient_cause_recipient_id"
            FOREIGN KEY ("recipient_id")
            REFERENCES "recipient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE "recipient_cause"
            ADD CONSTRAINT "FK_recipient_cause_cause_id"
            FOREIGN KEY ("cause_id")
            REFERENCES "cause"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        /**
         * Add 'charity curation' to tenant settings
         */

        const [{ app_setting: settings }] = await queryRunner.query(/*sql*/ `
            SELECT app_setting FROM tenant
        `);

        // add charity curation settings
        settings.charityCurationSettings = {
            trendingCauseInterval: 'month',
            recentlyApprovedInterval: 'month',
            recentGrantCountInterval: 'month'
        };

        await queryRunner.query(/*sql*/ `
            UPDATE tenant
            SET app_setting = '${JSON.stringify(settings)}'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            DROP TABLE recipient_tag
        `);

        await queryRunner.query(/*sql*/ `
            DROP TABLE tag
        `);

        await queryRunner.query(/*sql*/ `
            DROP TABLE recipient_cause
        `);

        await queryRunner.query(/*sql*/ `
            DROP TABLE cause
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient DROP COLUMN vetted_on
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient DROP COLUMN photos
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient DROP COLUMN logo
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient DROP COLUMN guidestar_seal
        `);

        await queryRunner.query(/*sql*/ `
            DROP TYPE guidestar_seal;
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient ADD COLUMN "non_profit_status" boolean NOT NULL DEFAULT false
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient DROP COLUMN "ofac"
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE recipient ADD COLUMN "ofac" boolean NOT NULL DEFAULT false
        `);
    }
}
