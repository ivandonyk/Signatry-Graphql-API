import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRecurrenceView1633536730993 implements MigrationInterface {
    private viewName = 'vw_recurring_records_to_process';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW ${this.viewName};`);
        await queryRunner.query(
            'DROP FUNCTION get_next_recurrence_schedule_date(start_date date, end_date date, frequency character varying, the_interval integer, num_grants integer);'
        );

        /**
         * rename `num_grants` variable to `recurrence_count` to be more accurate
         * don't set scheduled date to start date if recurrence_count === 0
         * add transaction_count argument
         * use start_date as scheduled_date when only 1 (series) transaction
         */
        await queryRunner.query(`
        CREATE OR REPLACE FUNCTION get_next_recurrence_schedule_date (start_date date, end_date date, frequency character varying, the_interval integer, recurrence_count integer, transaction_count integer)
            RETURNS date
            LANGUAGE plpgsql
            AS $function$
        DECLARE
            today date;
            scheduled_date date;
            time_frame text;
        BEGIN
            -- determine end date	
            IF recurrence_count > 0 THEN
                IF frequency = 'MONTHLY' THEN
                    end_date := start_date + cast(the_interval * recurrence_count || ' month' AS interval);
                elsif frequency = 'WEEKLY' THEN
                    end_date := start_date + cast(the_interval * recurrence_count || ' week' AS interval);
                ELSE
                    end_date := start_date + cast(the_interval * recurrence_count || ' year' AS interval);
                END IF;
            END IF;
            
            -- determine time_frame
            IF frequency = 'MONTHLY' THEN
                time_frame := the_interval || ' month';
            ELSIF frequency = 'WEEKLY' THEN
                time_frame := the_interval || ' week';
            ELSE
                time_frame := the_interval || ' year';
            END IF;

            SELECT
                INTO today date
            FROM
                transaction_recurrence_job_date;
                
            -- check if series has first fund_transaction created
            IF transaction_count <= 1 THEN
                scheduled_date := start_date;
            ELSE
                scheduled_date := start_date + cast(time_frame AS interval);
                IF recurrence_count > 0 THEN
                    WHILE today > scheduled_date LOOP
                        scheduled_date := scheduled_date + cast(time_frame AS interval);
                    END LOOP;
                END IF;
            END IF;
            
            RETURN scheduled_date;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error %', time_frame;
            RAISE NOTICE 'Error %', scheduled_date;
            RETURN NULL;
        END;

        $function$;
        `);

        /**
         * rename `num_grants` to `recurrence_count`
         * include `transaction_count`
         */
        await queryRunner.query(`
        CREATE VIEW ${this.viewName} AS
            SELECT
                view_data.id,
                view_data.transaction_type,
                view_data.next_scheduled_date,
                view_data.start_date,
                view_data.end_date,
                view_data.recurrence_count,
                view_data.transaction_code,
                view_data.transaction_count
            FROM (
                SELECT
                    inner_view_data.id,
                    inner_view_data.transaction_type,
                    get_next_recurrence_schedule_date (inner_view_data.start_date, inner_view_data.end_date, inner_view_data.frequency::character varying, inner_view_data."interval", inner_view_data.recurrence_count, inner_view_data.transaction_count) AS next_scheduled_date,
                    inner_view_data.start_date,
                    inner_view_data.end_date,
                    inner_view_data.recurrence_count,
                    inner_view_data.transaction_code,
                    inner_view_data.transaction_count
                FROM ( SELECT DISTINCT
                        r.id,
                        tt.name AS transaction_type,
                        f.transaction_code,
                        to_date("substring" (r.recurrence_rule::text, '[0-9]{8}'::text), 'YYYYMMDD'::text) AS start_date,
                        CASE WHEN r.recurrence_rule::text ~~ '%UNTIL%'::text THEN
                            to_date(regexp_replace(r.recurrence_rule::text, '.*UNTIL=([0-9]{8}).*'::text, '\\1'::text), 'YYYYMMDD'::text)
                        ELSE
                            to_date('20401231'::text, 'YYYYMMDD'::text)
                        END AS end_date,
                        CASE WHEN r.recurrence_rule::text ~~ '%FREQ%'::text THEN
                            regexp_replace(r.recurrence_rule::text, '.*FREQ=([^;]+);.*'::text, '\\1'::text)
                        ELSE
                            NULL::text
                        END AS frequency,
                        CASE WHEN r.recurrence_rule::text ~~ '%INTERVAL%'::text THEN
                            regexp_replace(r.recurrence_rule::text, '.*INTERVAL=([^;]+).*'::text, '\\1'::text)::integer
                        ELSE
                            NULL::integer
                        END AS "interval",
                        CASE WHEN r.recurrence_rule::text ~~ '%COUNT%'::text THEN
                            regexp_replace(r.recurrence_rule::text, '.*COUNT=([0-9]+).*'::text, '\\1'::text)::integer
                        ELSE
                            0
                        END AS recurrence_count,
                        (SELECT COUNT(*) FROM fund_transaction ft_count WHERE ft_count.transaction_recurrence_id = r.id)::integer AS transaction_count
                    FROM
                        transaction_recurrence r
                        JOIN fund_transaction f ON f.transaction_recurrence_id = r.id
                        JOIN transaction_status ts ON ts.id = f.transaction_status_id
                        JOIN transaction_type tt ON tt.id = f.transaction_type_id
                    WHERE
                        ts.name::text <> 'CANCELED'::text
                        AND r.enabled = TRUE
                        AND f.is_historic <> TRUE
                        AND (tt.name::text = ANY (ARRAY['GRANT_SERIES'::character varying::text, 'CONTRIBUTION_SERIES'::character varying::text]))
                        AND NOT (r.id IN (
                                SELECT
                                    outer_recurrence.id
                                FROM (
                                    SELECT
                                        inner_recurrence.id,
                                        inner_recurrence.start_date,
                                        inner_recurrence.end_date,
                                        inner_recurrence.frequency,
                                        inner_recurrence."interval",
                                        get_next_recurrence_schedule_date (inner_recurrence.start_date, inner_recurrence.end_date, inner_recurrence.frequency::character varying, inner_recurrence."interval", inner_recurrence.recurrence_count, inner_recurrence.transaction_count) AS next_scheduled_date
                                    FROM (
                                        SELECT
                                            transaction_recurrence.id,
                                            to_date("substring" (transaction_recurrence.recurrence_rule::text, '[0-9]{8}'::text), 'YYYYMMDD'::text) AS start_date,
                                            CASE WHEN transaction_recurrence.recurrence_rule::text ~~ '%UNTIL%'::text THEN
                                                to_date(regexp_replace(transaction_recurrence.recurrence_rule::text, '.*UNTIL=([0-9]{8}).*'::text, '\\1'::text), 'YYYYMMDD'::text)
                                            ELSE
                                                to_date('20401231'::text, 'YYYYMMDD'::text)
                                            END AS end_date,
                                            CASE WHEN transaction_recurrence.recurrence_rule::text ~~ '%FREQ%'::text THEN
                                                regexp_replace(transaction_recurrence.recurrence_rule::text, '.*FREQ=([^;]+);.*'::text, '\\1'::text)
                                            ELSE
                                                NULL::text
                                            END AS frequency,
                                            CASE WHEN transaction_recurrence.recurrence_rule::text ~~ '%INTERVAL%'::text THEN
                                                regexp_replace(transaction_recurrence.recurrence_rule::text, '.*INTERVAL=([^;]+).*'::text, '\\1'::text)::integer
                                            ELSE
                                                NULL::integer
                                            END AS "interval",
                                            CASE WHEN transaction_recurrence.recurrence_rule::text ~~ '%COUNT%'::text THEN
                                                regexp_replace(transaction_recurrence.recurrence_rule::text, '.*COUNT=([0-9]+).*'::text, '\\1'::text)::integer
                                            ELSE
                                                0
                                            END AS recurrence_count,
                                            (SELECT COUNT(*) FROM fund_transaction ft_count2 WHERE ft_count2.transaction_recurrence_id = transaction_recurrence.id)::integer AS transaction_count
                                        FROM
                                            transaction_recurrence) inner_recurrence) outer_recurrence
                                WHERE ((outer_recurrence.id, date_trunc('day'::text, outer_recurrence.next_scheduled_date::timestamp with time zone)) IN (
                                        SELECT
                                            ft.transaction_recurrence_id,
                                            date_trunc('day'::text, ft.scheduled_date) AS date_trunc
                                        FROM
                                            fund_transaction ft
                                        LEFT JOIN transaction_type tt_1 ON tt_1.id = ft.transaction_type_id
                                    WHERE
                                        tt_1.name::text = ANY (ARRAY['CONTRIBUTION'::character varying::text, 'GRANT'::character varying::text])))))) inner_view_data) view_data
            WHERE ((
                    SELECT
                        view_data.next_scheduled_date
                    FROM
                        transaction_recurrence_job_date
                    LIMIT 1)) >= view_data.start_date
                AND ((
                        SELECT
                            view_data.next_scheduled_date
                        FROM
                            transaction_recurrence_job_date
                        LIMIT 1)) <= view_data.end_date
                AND view_data.next_scheduled_date < (((
                    SELECT
                        transaction_recurrence_job_date.date
                    FROM transaction_recurrence_job_date
                WHERE
                    transaction_recurrence_job_date.id = 1)) + '1 mon'::interval)
            AND view_data.next_scheduled_date >= ((
                SELECT
                    transaction_recurrence_job_date.date
                FROM transaction_recurrence_job_date
            WHERE
                transaction_recurrence_job_date.id = 1));

        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW ${this.viewName};`);
        await queryRunner.query(
            'DROP FUNCTION get_next_recurrence_schedule_date (start_date date, end_date date, frequency character varying, the_interval integer, recurrence_count integer, transaction_count integer);'
        );

        // view / function as of 2021-09-30
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION get_next_recurrence_schedule_date(start_date date, end_date date, frequency character varying, the_interval integer, num_grants integer)
                RETURNS date
                LANGUAGE plpgsql
                AS $function$
            DECLARE
                today date;
                scheduled_date date;
                time_frame text;
                -- get the count and add appropriate # of months to the start date
            BEGIN
                IF num_grants > 0 THEN
                    IF frequency = 'MONTHLY' THEN
                        end_date := start_date + cast(the_interval * num_grants || ' month' AS interval);
                    elsif frequency = 'WEEKLY' THEN
                        end_date := start_date + cast(the_interval * num_grants || ' week' AS interval);
                    ELSE
                        end_date := start_date + cast(the_interval * num_grants || ' year' AS interval);
                    END IF;
                END IF;
                RAISE NOTICE 'Error %', end_date;
                IF frequency = 'MONTHLY' THEN
                    time_frame := the_interval || ' month';
                elsif frequency = 'WEEKLY' THEN
                    time_frame := the_interval || ' week';
                ELSE
                    time_frame := the_interval || ' year';
                END IF;
                SELECT
                    INTO today date
                FROM
                    transaction_recurrence_job_date;
                scheduled_date := start_date + cast(time_frame AS interval);
                while today > scheduled_date LOOP
                    scheduled_date := scheduled_date + cast(time_frame AS interval);
                END LOOP;
                RETURN scheduled_date;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Error %', time_frame;
                RAISE NOTICE 'Error %', scheduled_date;
                RETURN NULL;
            END;
            
            $function$;
        `);

        await queryRunner.query(`
        CREATE VIEW ${this.viewName} AS
            SELECT
                view_data.id,
                view_data.transaction_type,
                view_data.next_scheduled_date,
                view_data.start_date,
                view_data.end_date,
                view_data.num_grants
            FROM (
                SELECT
                    inner_view_data.id,
                    inner_view_data.transaction_type,
                    get_next_recurrence_schedule_date (inner_view_data.start_date, inner_view_data.end_date, inner_view_data.frequency::character varying, inner_view_data."interval", inner_view_data.num_grants) AS next_scheduled_date,
                    inner_view_data.start_date,
                    inner_view_data.end_date,
                    inner_view_data.num_grants
                FROM ( SELECT DISTINCT
                        r.id,
                        tt.name AS transaction_type,
                        to_date("substring" (r.recurrence_rule::text, '[0-9]{8}'::text), 'YYYYMMDD'::text) AS start_date,
                        CASE WHEN r.recurrence_rule::text ~~ '%UNTIL%'::text THEN
                            to_date(regexp_replace(r.recurrence_rule::text, '.*UNTIL=([0-9]{8}).*'::text, '\\1'::text), 'YYYYMMDD'::text)
                        ELSE
                            to_date('20401231'::text, 'YYYYMMDD'::text)
                        END AS end_date,
                        CASE WHEN r.recurrence_rule::text ~~ '%FREQ%'::text THEN
                            regexp_replace(r.recurrence_rule::text, '.*FREQ=([^;]+);.*'::text, '\\1'::text)
                        ELSE
                            NULL::text
                        END AS frequency,
                        CASE WHEN r.recurrence_rule::text ~~ '%INTERVAL%'::text THEN
                            regexp_replace(r.recurrence_rule::text, '.*INTERVAL=([^;]+).*'::text, '\\1'::text)::integer
                        ELSE
                            NULL::integer
                        END AS "interval",
                        CASE WHEN r.recurrence_rule::text ~~ '%COUNT%'::text THEN
                            regexp_replace(r.recurrence_rule::text, '.*COUNT=([0-9]+).*'::text, '\\1'::text)::integer
                        ELSE
                            0
                        END AS num_grants
                    FROM
                        transaction_recurrence r
                        JOIN fund_transaction f ON f.transaction_recurrence_id = r.id
                        JOIN transaction_type tt ON tt.id = r.transaction_type_id
                        JOIN fund_transaction orig ON orig.id = f.original_fund_transaction_id
                        JOIN transaction_status ts ON ts.id = orig.transaction_status_id
                    WHERE
                        ts.name::text <> 'CANCELED'::text
                        AND r.enabled = TRUE
                        AND NOT (r.id IN (
                                SELECT
                                    outer_recurrence.id
                                FROM (
                                    SELECT
                                        inner_recurrence.id,
                                        inner_recurrence.start_date,
                                        inner_recurrence.end_date,
                                        inner_recurrence.frequency,
                                        inner_recurrence."interval",
                                        get_next_recurrence_schedule_date (inner_recurrence.start_date, inner_recurrence.end_date, inner_recurrence.frequency::character varying, inner_recurrence."interval", inner_recurrence.num_grants) AS next_scheduled_date
                                    FROM (
                                        SELECT
                                            transaction_recurrence.id,
                                            to_date("substring" (transaction_recurrence.recurrence_rule::text, '[0-9]{8}'::text), 'YYYYMMDD'::text) AS start_date,
                                            CASE WHEN transaction_recurrence.recurrence_rule::text ~~ '%UNTIL%'::text THEN
                                                to_date(regexp_replace(transaction_recurrence.recurrence_rule::text, '.*UNTIL=([0-9]{8}).*'::text, '\\1'::text), 'YYYYMMDD'::text)
                                            ELSE
                                                to_date('20401231'::text, 'YYYYMMDD'::text)
                                            END AS end_date,
                                            CASE WHEN transaction_recurrence.recurrence_rule::text ~~ '%FREQ%'::text THEN
                                                regexp_replace(transaction_recurrence.recurrence_rule::text, '.*FREQ=([^;]+);.*'::text, '\\1'::text)
                                            ELSE
                                                NULL::text
                                            END AS frequency,
                                            CASE WHEN transaction_recurrence.recurrence_rule::text ~~ '%INTERVAL%'::text THEN
                                                regexp_replace(transaction_recurrence.recurrence_rule::text, '.*INTERVAL=([^;]+).*'::text, '\\1'::text)::integer
                                            ELSE
                                                NULL::integer
                                            END AS "interval",
                                            CASE WHEN transaction_recurrence.recurrence_rule::text ~~ '%COUNT%'::text THEN
                                                regexp_replace(transaction_recurrence.recurrence_rule::text, '.*COUNT=([0-9]+).*'::text, '\\1'::text)::integer
                                            ELSE
                                                0
                                            END AS num_grants
                                        FROM
                                            transaction_recurrence) inner_recurrence) outer_recurrence
                                WHERE ((outer_recurrence.id, date_trunc('day'::text, outer_recurrence.next_scheduled_date::timestamp with time zone)) IN (
                                        SELECT
                                            ft.transaction_recurrence_id,
                                            date_trunc('day'::text, ft.scheduled_date) AS date_trunc
                                        FROM
                                            fund_transaction ft
                                        UNION
                                        SELECT
                                            trr.id,
                                            date_trunc('day'::text, fti.requested_process_date) AS date_trunc
                                        FROM
                                            transaction_recurrence trr
                                            JOIN fund_transaction ftn ON trr.id = ftn.transaction_recurrence_id
                                            JOIN fund_transaction_info fti ON fti.fund_transaction_id = ftn.id))))) inner_view_data) view_data
            WHERE ((
                    SELECT
                        view_data.next_scheduled_date
                    FROM
                        transaction_recurrence_job_date
                    LIMIT 1)) >= view_data.start_date
                AND ((
                        SELECT
                            view_data.next_scheduled_date
                        FROM
                            transaction_recurrence_job_date
                        LIMIT 1)) <= view_data.end_date
                AND view_data.next_scheduled_date < (((
                    SELECT
                        transaction_recurrence_job_date.date
                    FROM transaction_recurrence_job_date
                WHERE
                    transaction_recurrence_job_date.id = 1)) + '1 mon'::interval);
        `);
    }
}
