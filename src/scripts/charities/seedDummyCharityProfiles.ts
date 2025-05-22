import { getOrCreateConnection } from '../../typeorm';
import { Recipient } from '../../models/Recipient';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const repo = connection.getRepository(Recipient);

    const recipientsWithGuideStarData = await connection
        .createQueryBuilder(Recipient, 'recipient')
        .where('recipient.guideStarSeal IS NOT NULL')
        .getMany();

    await Promise.all(
        recipientsWithGuideStarData.map(async recipient => {
            recipient.guideStarPublicProfileLink = `https://www.guidestar.org/profile/${recipient.ein}`;

            await repo.save(recipient);
        })
    );

    process.exit(0);
})();
