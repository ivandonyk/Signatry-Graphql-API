import { getOrCreateConnection } from '../../typeorm';
import { UserProfile } from '../../models/UserProfile';
import { getUserCode } from '../../utilities/getUserCode';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const users = await connection
        .getRepository(UserProfile)
        .find({ select: ['id'], relations: [] });

    for (const user of users) {
        const userCode = await getUserCode(connection.manager);

        await connection
            .createQueryBuilder()
            .update(UserProfile)
            .set({ userCode })
            .where('id = :id', { id: user.id })
            .execute();
    }

    process.exit(0);
})();
