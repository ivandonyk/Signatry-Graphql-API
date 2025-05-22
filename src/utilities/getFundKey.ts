import { EntityManager } from 'typeorm';
import { UserProfile } from '../models/UserProfile';

export const getFundKey = async (manager: EntityManager, profile: UserProfile) => {
    // Extract up to the first 5 characters of the Last Name of the profile
    const name = profile.lastName
        .trim()
        .slice(0, 5)
        .toUpperCase();

    // Get the length of extracted name
    const nameLen = name.length + 1;

    // Extract the name, get the max number and increment by 1
    const [{ next }] = await manager.query(/*sql*/ `
        SELECT COALESCE(MAX(CAST(SUBSTRING(fund_key, ${nameLen}) as integer)), 0) + 1 AS next
        FROM fund
        WHERE fund_key ~ ('^' || '${name}' || '[0-9]+');
    `);

    return `${name}${next}`;
};
