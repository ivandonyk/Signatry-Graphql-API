import { EntityManager } from 'typeorm';

export const getRecipientCode = async (manager: EntityManager) => {
    const value = await manager.query("SELECT nextval('recipientCode')");
    return `${value[0].nextval.toString().padStart(4, 0)}`;
};
