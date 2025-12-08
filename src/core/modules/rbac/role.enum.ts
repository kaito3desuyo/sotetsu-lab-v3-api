export const Role = {
    READER: 'sotetsu-lab-v3-api/reader',
    REPORTER: 'sotetsu-lab-v3-api/reporter',
    EDITOR: 'sotetsu-lab-v3-api/editor',
    MANAGER: 'sotetsu-lab-v3-api/manager',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
