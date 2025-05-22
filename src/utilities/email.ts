import { NotificationType } from '../../src/models/Notification';
import { Notification } from '../../src/models';
import { EntityManager } from 'typeorm';

export function isEmail(testString: string): boolean {
    const $emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

    return $emailRegex.test(testString);
}

export async function shouldSendNotification(
    manager: EntityManager,
    profileId: string,
    notificationType: NotificationType,
    fundId?: string
) {
    try {
        const notification = await manager.findOne(Notification, {
            notificationType
        });
        const userProfileNotification = await manager.query(`
            SELECT * FROM user_profile_notification
            WHERE
                user_profile_id = '${profileId}' AND
                notification_id = '${notification.id}'
                ${fundId ? `AND fund_id = '${fundId}'` : ''}
            ORDER BY created_on ASC
            LIMIT 1
        `);
        const toggleNotification = userProfileNotification[0];
        return toggleNotification ? toggleNotification.enabled : false;
    } catch (error) {
        console.error('Utilities email, shouldSendNotification error: ', error);
        throw error;
    }
}
