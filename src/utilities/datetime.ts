// Set default timezone to EST in order to align with data we receive from ByAllAccounts

import { default as _dayjs } from 'dayjs';
import { default as _utc } from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
_dayjs.extend(_utc);
_dayjs.extend(timezone);
_dayjs.extend(customParseFormat);

export function parseBAATimestampToUTC(timestamp: string): Date {
    // Regex for BAA's timestamp format
    try {
        const regex = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}) \[([+-])(\d):\w{3}\]/;
        const parts = regex.exec(timestamp);

        // Format date string to be parsed by _dayjs with correct timezone offset
        // e.g. -5 => -05:00
        let offset = parts[8];
        if (parseInt(offset) <= 9) {
            offset = parts[7] + '0' + offset + ':00';
        } else {
            offset = parts[7] + offset + ':00';
        }
        const dateString = `${parts[1]}-${parts[2]}-${parts[3]} ${parts[4]}:${parts[5]}:${parts[6]} ${offset}`;
        const dateFormat = 'YYYY-MM-DD HH:mm:ss Z';

        return _dayjs(dateString, dateFormat)
            .tz('UTC')
            .toDate();
    } catch (error) {
        console.log(`Unable to parse date ${timestamp}: ${error.message}`);
    }
}

export function utc() {
    return _dayjs.utc();
}

// Format date object using format string.
// Optionally convert to given timezone (used when querying ByAllAccounts API, which uses EST dates)
export function formatDate(date: Date, formatString: string, timezone?: string): string {
    let dateObj = _dayjs(date);
    if (timezone) {
        dateObj = dateObj.tz(timezone);
    }
    return dateObj.format(formatString);
}

export function parseFromFormat(dateString: string, formatString: string): Date {
    return _dayjs(dateString, formatString)
        .tz('UTC')
        .toDate();
}

// Making _dayjs accessible from this module
export const dayjs = _dayjs;

export function isToday(date: Date) {
    return _dayjs(date).format('YYYY-MM-DD') === _dayjs().format('YYYY-MM-DD');
}

export function getStartAndEndOfToday(): { startOfDay: string; endOfDay: string } {
    const startOfDay = dayjs()
        .startOf('day')
        .format('YYYY-MM-DD HH:mm');
    const endOfDay = dayjs()
        .endOf('day')
        .format('YYYY-MM-DD HH:mm');

    return { startOfDay: startOfDay, endOfDay: endOfDay };
}

// Queries for holding data frequently use the previous day's start and end
export function getStartAndEndOfYesterday(): { startOfDay: string; endOfDay: string } {
    const startOfDay = dayjs()
        .subtract(1, 'day')
        .startOf('day')
        .format('YYYY-MM-DD HH:mm');
    const endOfDay = dayjs()
        .subtract(1, 'day')
        .endOf('day')
        .format('YYYY-MM-DD HH:mm');

    return { startOfDay: startOfDay, endOfDay: endOfDay };
}

export function getStartAndEndOfDay(
    date: Date | string,
    tzOffset?: number
): { startOfDay: string; endOfDay: string } {
    const startOfDay = dayjs(date)
        .startOf('day')
        .subtract(tzOffset || 0, 'hour')
        .format('YYYY-MM-DD HH:mm:ss');
    const endOfDay = dayjs(date)
        .endOf('day')
        .subtract(tzOffset || 0, 'hour')
        .format('YYYY-MM-DD HH:mm:ss');

    return { startOfDay: startOfDay, endOfDay: endOfDay };
}

export function stringIsdate(dateString: string): boolean {
    const $dateRegex = /(0\d{1}|1[0-2])\/([0-2]\d{1}|3[0-1])\/(19|20)\d{2}/;

    return $dateRegex.test(dateString);
}

export function parseToDatetime(date: Date) {
    const dateFormat = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    const time = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    return `${dateFormat} ${time}`;
}

export function getMinuteDiffFromNow(date1: Date) {
    const now = new Date();
    const endDate = new Date(date1);
    const duration = endDate.valueOf() - now.valueOf();
    return duration / 60000;
}

export function parseToDateAndAddDay(date: Date) {
    const dateFormat = dayjs(date).add(1, 'day').format('YYYY-MM-DD');
    const currentDate = new Date();
    const time = currentDate.getHours() + ':' + currentDate.getMinutes() + ':' + currentDate.getSeconds();
    return `${dateFormat} ${time}`;
}