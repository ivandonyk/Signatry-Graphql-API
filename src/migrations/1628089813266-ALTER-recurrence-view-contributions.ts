import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class ALTERRecurrenceViewContributions1628089813266 implements MigrationInterface {
    private correctedTableName = 'transaction_recurrence_job_date';
    private correctedFunctionName = 'get_next_recurrence_schedule_date';

    private recurrenceJobTable = new Table({
        name: this.correctedTableName,
        columns: [
            new TableColumn({
                name: 'id',
                type: 'integer',
                isPrimary: true,
                isNullable: false,
                isGenerated: true,
                generationStrategy: 'increment'
            }),
            new TableColumn({
                name: 'date',
                type: 'timestamp without time zone',
                comment: 'date recurrence engine last run on'
            }),
            new TableColumn({
                name: 'updated_on',
                type: 'timestamp without time zone',
                isNullable: false,
                default: 'CURRENT_TIMESTAMP'
            })
        ]
    });

    public async up(queryRunner: QueryRunner): Promise<void> {
        // drop existing table
        await queryRunner.query('DROP VIEW recurring_records_to_process');
        // rename table that tracks recurrence job date
        await queryRunner.dropTable('recurring_grant_job_date');
        await queryRunner.createTable(this.recurrenceJobTable);
        // set first record in table with last date we manually ran the grant recurrence job
        await queryRunner.query(
            `INSERT INTO ${this.correctedTableName} (date) VALUES ('2021-08-03 12:00:00')`
        );

        /**
         * rename function
         * correct table name in function
         * corrected column name for job_date table: `date`
         */
        await queryRunner.query('DROP FUNCTION get_next_recurring_grant_scheduled_date');
        await queryRunner.query(`CREATE OR REPLACE FUNCTION ${this.correctedFunctionName} (start_date date, end_date date, frequency varchar, the_interval integer, num_grants integer)
            RETURNS date
            AS $$
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
                ${this.correctedTableName};
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
        
        $$
        LANGUAGE plpgsql;`);

        /**
         * @note if you want to copy this into sql:
         * replace all '\\1' with '\1'
         * replace all interpolated values (corrected function/table names)
         *
         * @note made the following changes:
         * removed transaction_type = 'GRANT_SERIES' constraint
         * add constraint for enabled transaction_recurrences
         * rename view with `vw` prefix
         * corrected references to job_date table
         * corrected column name for job_date table: `date`
         * corrected reference to next_date function
         * don't inner join `fund_transaction_info` AND `transaction_type` in `inner_view_data`
         * */
        await queryRunner.query(`
        CREATE OR REPLACE VIEW vw_recurring_records_to_process AS
            SELECT
                view_data.*
            FROM (
                SELECT
                    inner_view_data.id,
                    inner_view_data.transaction_type,
                    ${this.correctedFunctionName} (inner_view_data.start_date, inner_view_data.end_date, inner_view_data.frequency, inner_view_data.interval, inner_view_data.num_grants) AS next_scheduled_date,
                    inner_view_data.start_date,
                    inner_view_data.end_date,
                    inner_view_data.num_grants
                FROM ( SELECT DISTINCT
                        r.id,
                        tt.name AS transaction_type,
                        to_date(substring(r.recurrence_rule
                            FROM '[0-9]{8}'), 'YYYYMMDD') AS start_date,
                        -- if rule contains UNTIL, grab it and use the 8 numbers after 'UNTIL=[8 numbers] and create a date
                        CASE WHEN recurrence_rule LIKE '%UNTIL%' THEN
                            to_date(regexp_replace(recurrence_rule, '.*UNTIL=([0-9]{8}).*', '\\1'), 'YYYYMMDD')
                        ELSE
                            to_date('20401231', 'YYYYMMDD')
                        END AS end_date,
                        -- if rule contains FREQ, grab it and use everything between 'FREQ=' and ';' and put that in the frequency
                        CASE WHEN recurrence_rule LIKE '%FREQ%' THEN
                            regexp_replace(recurrence_rule, '.*FREQ=([^;]+);.*', '\\1')
                        ELSE
                            NULL
                        END AS frequency,
                        -- if rule contains INTERVAL, grab it and use everything between 'INTERVAL=' and ';' and put that in the interval
                        CASE WHEN recurrence_rule LIKE '%INTERVAL%' THEN
                            cast(regexp_replace(recurrence_rule, '.*INTERVAL=([^;]+).*', '\\1') AS integer)
                        ELSE
                            NULL
                        END AS interval,
                        -- if rule contains COUNT, grab it and use everything between 'COUNT=' and ';' and put that in the num_grants
                        CASE WHEN recurrence_rule LIKE '%COUNT%' THEN
                            cast(regexp_replace(recurrence_rule, '.*COUNT=([0-9]+).*', '\\1') AS integer)
                        ELSE
                            0
                        END AS num_grants
                    FROM
                        transaction_recurrence r
                        INNER JOIN fund_transaction f ON f.transaction_recurrence_id = r.id
                        INNER JOIN transaction_type tt ON tt.id = r.transaction_type_id
                        INNER JOIN fund_transaction orig ON orig.id = f.original_fund_transaction_id
                        INNER JOIN transaction_status ts ON ts.id = orig.transaction_status_id
                    WHERE
                        ts.name != 'CANCELED' AND r.enabled = true
                        AND r.id NOT IN (
                            -- get the ids of the transaction_recurrence records that have 'scheduled_date' matching the calculated 'next_scheduled_date'
                            SELECT
                                outer_recurrence.id
                            FROM (
                                -- use data from recurrence_rule to determine next 'scheduled_date'
                                SELECT
                                    inner_recurrence.id, inner_recurrence.start_date, inner_recurrence.end_date, inner_recurrence.frequency, inner_recurrence.interval, ${this.correctedFunctionName} (inner_recurrence.start_date, inner_recurrence.end_date, inner_recurrence.frequency, inner_recurrence.interval, num_grants) AS next_scheduled_date
                                FROM (
                                    -- parse the recurrence_rule
                                    SELECT
                                        id, to_date(substring(recurrence_rule
                                            FROM '[0-9]{8}'), 'YYYYMMDD') AS start_date, CASE
                                    -- if rule contains until, grab it and put the value
                                    WHEN recurrence_rule LIKE '%UNTIL%' THEN
                                        to_date(regexp_replace(recurrence_rule, '.*UNTIL=([0-9]{8}).*', '\\1'), 'YYYYMMDD')
                                    ELSE
                                        to_date('20401231', 'YYYYMMDD')
                                    END AS end_date, CASE WHEN recurrence_rule LIKE '%FREQ%' THEN
                                        regexp_replace(recurrence_rule, '.*FREQ=([^;]+);.*', '\\1')
                                    ELSE
                                        NULL
                                    END AS frequency, CASE WHEN recurrence_rule LIKE '%INTERVAL%' THEN
                                        cast(regexp_replace(recurrence_rule, '.*INTERVAL=([^;]+).*', '\\1') AS integer)
                                    ELSE
                                        NULL
                                    END AS interval, CASE WHEN recurrence_rule LIKE '%COUNT%' THEN
                                        cast(regexp_replace(recurrence_rule, '.*COUNT=([0-9]+).*', '\\1') AS integer)
                                    ELSE
                                        0
                                    END AS num_grants
                                FROM transaction_recurrence) inner_recurrence) outer_recurrence
                        WHERE (outer_recurrence.id, date_trunc('day', outer_recurrence.next_scheduled_date)) IN (
                            SELECT
                                ft.transaction_recurrence_id, date_trunc('day', ft.scheduled_date)
                            FROM fund_transaction ft
                        UNION
                        SELECT
                            trr.id, date_trunc('day', fti.requested_process_date)
                        FROM transaction_recurrence trr
                        INNER JOIN fund_transaction ftn ON trr.id = ftn.transaction_recurrence_id
                        INNER JOIN fund_transaction_info fti ON fti.fund_transaction_id = ftn.id))) inner_view_data) view_data
            WHERE (
                SELECT
                    view_data.next_scheduled_date
                FROM
                    ${this.correctedTableName}
                LIMIT 1) BETWEEN view_data.start_date AND view_data.end_date
            AND view_data.next_scheduled_date < ((
                SELECT
                    date
                FROM ${this.correctedTableName}
            WHERE
                id = 1) + cast('1 month' AS interval));`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        return Promise.resolve();
    }
}
