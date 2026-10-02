import api from "./api";
import type { TaskPage, TaskComment, Activity } from "../lib/types";

export const getProjects = async () => {
    const response = await api.get("/projects");
    return response.data.projects;
};

export const createProject = async (
    name: string,
    description: string
) => {
    const response = await api.post("/projects", {
        name,
        description
    });

    return response.data;
};

export const getProject = async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data.project;
};

export const getProjectMembers = async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/members`);
    return response.data.members;
};

export const getUserByEmail = async (email: string) => {
    const response = await api.get("/users", {
        params: {
            email
        }
    });

    return response.data.user;
};

export const addProjectMember = async (
    projectId: string,
    userId: string,
    role: string
) => {
    const response = await api.post(
        `/projects/${projectId}/members`,
        {
            userId,
            role
        }
    );

    return response.data;
};

export const updateProjectMemberRole = async (
    projectId: string,
    userId: string,
    role: string
) => {
    const response = await api.patch(
        `/projects/${projectId}/members/${userId}`,
        {
            role
        }
    );

    return response.data;
};

export const removeProjectMember = async (
    projectId: string,
    userId: string
) => {
    const response = await api.delete(
        `/projects/${projectId}/members/${userId}`
    );

    return response.data;
};

export const createTask = async (
    projectId: string,
    title: string,
    description: string,
    status: string,
    priority: string,
    assignedTo?: string,
    dueDate?: string
) => {
    const response = await api.post(
        `/projects/${projectId}/tasks`,
        {
            title,
            description,
            status,
            priority,
            assignedTo,
            dueDate
        }
    );

    return response.data;
};

export const getProjectTasks = async (
    projectId: string
) => {
    const response = await api.get(
        `/projects/${projectId}/tasks`
    );

    return response.data;
};

export const deleteTask = async (
    projectId: string,
    taskId: string
) => {
    const response = await api.delete(
        `/projects/${projectId}/tasks/${taskId}`
    );

    return response.data;
};

export const deleteProject = async (
    projectId: string
) => {
    const response = await api.delete(
        `/projects/${projectId}`
    );

    return response.data;
}

export const updateTask = async (
    projectId: string,
    taskId: string,
    data: {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        assignedTo?: string | null;
        dueDate?: string | null;
    }
) => {
    const response = await api.patch(
        `/projects/${projectId}/tasks/${taskId}`,
        data
    );

    return response.data;
};
// ---- Added for the full app ----

export const updateProject = async (projectId: string, data: { name?: string; description?: string }) =>
    (await api.patch(`/projects/${projectId}`, data)).data;

// Backend caps limit at 100
export const getProjectTasksPage = async (projectId: string): Promise<TaskPage> =>
    (await api.get(`/projects/${projectId}/tasks`, { params: { limit: 100 } })).data;

export const getTaskComments = async (taskId: string): Promise<TaskComment[]> =>
    (await api.get(`/tasks/${taskId}/comments`)).data.comments;

export const createComment = async (taskId: string, content: string) =>
    (await api.post(`/tasks/${taskId}/comments`, { content })).data;

export const updateComment = async (commentId: string, content: string) =>
    (await api.patch(`/comments/${commentId}`, { content })).data;

export const deleteComment = async (commentId: string) =>
    (await api.delete(`/comments/${commentId}`)).data;

export const getProjectActivity = async (projectId: string): Promise<Activity[]> =>
    (await api.get(`/projects/${projectId}/activity`)).data.logs;
