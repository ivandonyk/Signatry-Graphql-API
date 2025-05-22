import { getOrCreateConnection } from '../../typeorm';

import {
  Fund,
  UserProfileNotification
} from '../../models';

(async () => {
  console.log('cleaning up notification settings');

  const connection = await getOrCreateConnection();
  const { manager } = connection;

  const fundRepo = manager.getRepository(Fund);
  const funds = await fundRepo.createQueryBuilder('fund')
    .leftJoinAndSelect('fund.fundUserProfiles', 'fundUserProfiles')
    .leftJoinAndSelect('fundUserProfiles.userProfile', 'userProfile')
    .getMany();

  const userProfileNotificationRepo = manager.getRepository(UserProfileNotification);

  for (let i = 0; i < funds.length; i += 1) {
    const notifications = await userProfileNotificationRepo.createQueryBuilder('userProfileNotification')
      .where('userProfileNotification.fundId = :fundId', {
        fundId: funds[i].id
      })
      .getMany();

    console.log(`found ${notifications.length} notifications for fund ${funds[i].id}`);

    const fundUserProfiles = funds[i].fundUserProfiles;
    for (let j = 0; j < notifications.length; j += 1) {
      const notification = notifications[j];
      const isRelated = fundUserProfiles.filter(profile => profile.id === notification.userProfileId).length > 0;
      console.log(`notification ${notification.id} is related ${isRelated}`);
      if (!isRelated) {
        await userProfileNotificationRepo.delete(notification.id);
        console.log(`notification ${notification.id} is deleted`);
      }
    }
  }
})();
