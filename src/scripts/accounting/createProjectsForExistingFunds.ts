import { getOrCreateConnection } from '../../typeorm';
import { AccountingFacade } from '../../accounting';
import { Fund } from '../../models';

async function createProjectsForExistingFunds() {
    console.log("Creating projects in Intacct for funds that don't have project IDs");
    const connection = await getOrCreateConnection();
    const fundRepo = connection.getRepository(Fund);
    const accounting = new AccountingFacade();
    const projects = await accounting.getAllProjects();
    const projectIds = projects.map(p => p.getProjectId());
    const fundsWithoutValidProjectId = await fundRepo
        .createQueryBuilder('fund')
        .where('fund.accountingProjectId NOT IN (:...projectIds)', { projectIds: projectIds })
        .getMany();
    for (const fund of fundsWithoutValidProjectId) {
        const projectId = await accounting.createProject(fund.name);
        await fundRepo.update(fund.id, { accountingProjectId: projectId });
        console.log(`Updated Intacct project ID for fund ${fund.name}: ${projectId}`);
    }
    return;
}
createProjectsForExistingFunds();
