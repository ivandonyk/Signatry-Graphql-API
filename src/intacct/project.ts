import { ProjectInterface, ProjectCreateResponseInterface } from '../accounting/project';
import { Functions, Xml } from '@intacct/intacct-sdk';

class IntacctProject implements ProjectInterface {
    name: string;
    projectId: string;

    constructor(name: string, projectId: string) {
        this.name = name;
        this.projectId = projectId;
    }

    public getName(): string {
        return this.name;
    }

    public getProjectId(): string {
        return this.projectId;
    }

    public getProjectCreateObject(): Functions.Projects.ProjectCreate {
        const project = new Functions.Projects.ProjectCreate();
        project.projectName = this.getName();
        project.projectType = 'DAF - Fund'; // Assuming all Edison-created projects are DAFs
        project.projectCategory = 'Internal Non-billable';
        project.projectId = this.getProjectId();

        return project;
    }

    public getProjectUpdateObject(): Functions.Projects.ProjectUpdate {
        const project = new Functions.Projects.ProjectUpdate();
        project.projectName = this.getName();
        project.projectType = 'DAF - Fund'; // Assuming all Edison-created projects are DAFs
        project.projectCategory = 'Internal Non-billable';
        project.projectId = this.getProjectId();
        project.customerId = '';

        return project;
    }
}

class IntacctProjectFactory {
    static create(data: Xml.Response.Result) {
        const project = new IntacctProject(data['NAME'], data['PROJECTID']);
        return project;
    }
}

class IntacctProjectCreateResponse implements ProjectCreateResponseInterface {
    projectId: string;

    constructor(data: Xml.OnlineResponse) {
        this.projectId = data['PROJECTID'];
    }

    public getProjectId(): string {
        return this.projectId;
    }
}

export { IntacctProject, IntacctProjectFactory, IntacctProjectCreateResponse };
