import { EntityManager } from 'typeorm';

export const getUserCode = async (manager: EntityManager) => {
    const [{ nextval }] = await manager.query("SELECT nextval('userCode')");
    return nextval.padStart(4, 0);
};
