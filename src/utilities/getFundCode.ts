import { EntityManager } from 'typeorm';

export const getFundCode = async (manager: EntityManager) => {
    const value = await manager.query("SELECT nextval('fundCode')");
    return `${value[0].nextval.toString().padStart(4, 0)}`;
};
