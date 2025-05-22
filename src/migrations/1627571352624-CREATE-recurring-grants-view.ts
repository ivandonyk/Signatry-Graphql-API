import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATERecurringGrantsView1627571352624 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS recurring_grant_job_date
        (
            the_current_date timestamp without time zone,
            id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 )
        );
        insert into recurring_grant_job_date values( '2021-05-01');`);
        await queryRunner.query(`create or replace function get_next_recurring_grant_scheduled_date(start_date date, end_date date, frequency varchar, the_interval integer) returns date as $$
        declare
        today date;
        scheduled_date date;
        time_frame text;
        begin
        if frequency = 'MONTHLY' then 
            time_frame := the_interval || ' month';
        elsif frequency = 'WEEKLY' then 
            time_frame := the_interval || ' week';
        else 
            time_frame := the_interval || ' year';
        end if;
        select into today the_current_date from recurring_grant_job_date;
        scheduled_date := start_date + cast(time_frame as interval); 
          while today > scheduled_date loop
            scheduled_date :=  scheduled_date + cast(time_frame as interval); 
          end loop;
        return scheduled_date;
        exception 
            when others then
                RAISE NOTICE 'Error %',time_frame;
                RAISE NOTICE 'Error %',scheduled_date;
                return null;
        end;
        $$ LANGUAGE plpgsql;`);
        await queryRunner.query(`create or replace view recurring_records_to_process
        as
        select x.* from (
        select w.id, w.transaction_type, get_next_recurring_grant_scheduled_date(w.start_date, w.end_date, w.frequency, w.interval) as next_scheduled_date, w.start_date, w.end_date from (
        select distinct r.id,  tt.name as transaction_type, to_date(substring(r.recurrence_rule from '[0-9]{8}'), 'YYYYMMDD') as start_date,
            case 
            when recurrence_rule like '%UNTIL%' THEN to_date(regexp_replace(recurrence_rule,'.*UNTIL=([0-9]{8}).*','\\1'),'YYYYMMDD')
            else to_date('20401231', 'YYYYMMDD')
            end as end_date, 
            regexp_replace(recurrence_rule,'.*FREQ=([^;]+);.*','\\1') as frequency,
            cast(regexp_replace(recurrence_rule,'.*INTERVAL=([^;]+).*','\\1') as integer) as interval from transaction_recurrence r 
            inner join fund_transaction f on f.transaction_recurrence_id = r.id
            inner join transaction_type tt on tt.id = r.transaction_type_id
            inner join fund_transaction orig on orig.id = f.original_fund_transaction_id
            inner join transaction_status ts on ts.id = orig.transaction_status_id
            inner join transaction_type ttt on ttt.id = r.transaction_type_id
            inner join fund_transaction_info i on i.fund_transaction_id = f.id
            where ts.name != 'CANCELED' and tt.name = 'GRANT_SERIES' and r.id not in (
        -- get the ids of the transaction_recurrence records that have 'scheduled_date' matching the calculated 'next_scheduled_date'
        select b.id from (
        -- use data from recurrence_rule to determine next 'scheduled_date'
        select a.id, a.start_date, a.end_date, a.frequency, a.interval, get_next_recurring_grant_scheduled_date(a.start_date, a.end_date, a.frequency, a.interval) as next_scheduled_date from (
        -- parse the recurrence_rule
        select id, to_date(substring(recurrence_rule from '[0-9]{8}'), 'YYYYMMDD') as start_date,
            case 
            when recurrence_rule like '%UNTIL%' THEN to_date(regexp_replace(recurrence_rule,'.*UNTIL=([0-9]{8}).*','\\1'),'YYYYMMDD')
            else to_date('20401231', 'YYYYMMDD')
            end as end_date, 
            regexp_replace(recurrence_rule,'.*FREQ=([^;]+);.*','\\1') as frequency,
            cast(regexp_replace(recurrence_rule,'.*INTERVAL=([^;]+).*','\\1') as integer) as interval
            from transaction_recurrence 
            )a
        )b  
        where (b.id, date_trunc('day',b.next_scheduled_date)) in (
            select ft.transaction_recurrence_id, date_trunc('day', ft.scheduled_date) from fund_transaction ft
            union
            select trr.id,  date_trunc('day',fti.requested_process_date) from transaction_recurrence trr 
        inner join fund_transaction ftn on trr.id = ftn.transaction_recurrence_id
        inner join fund_transaction_info fti on fti.fund_transaction_id = ftn.id
            
        ) 
        ))w 
        )x where (select x.next_scheduled_date from recurring_grant_job_date limit 1) between x.start_date and x.end_date
        and x.next_scheduled_date < (( select the_current_date from recurring_grant_job_date where id = 1)  + cast ('1 month' as interval));`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP view recurring_records_to_process;');
        await queryRunner.query('DROP function get_next_recurring_grant_scheduled_date;');
        await queryRunner.query('DROP table recurring_grant_job_date;');
    }
}
