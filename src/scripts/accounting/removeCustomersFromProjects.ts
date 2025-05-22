import { getOrCreateConnection } from '../../typeorm';
import { Fund } from '../../models';
import { AccountingFacade } from '../../accounting';

export async function removeCustomersFromProjects() {
    const accounting = new AccountingFacade();
    const connection = await getOrCreateConnection();
    const projects = await accounting.getAllProjects();
    for (const project of projects) {
        console.log(`Updating ${project.getName()}, ${project.getProjectId()}`);
        try {
            await accounting.updateProject(project.getProjectId(), project.getName());
        } catch (error) {
            console.log(`Unable to update project ${project.getName()}`);
        }
    }
}

removeCustomersFromProjects();
