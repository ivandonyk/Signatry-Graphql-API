interface ProjectInterface {
    getName(): string;
    getProjectId(): string;
}

interface ProjectCreateResponseInterface {
    getProjectId(): string;
}

export { ProjectInterface, ProjectCreateResponseInterface };
