export const Role = {
    READER: 'reader',
    REPORTER: 'reporter',
    EDITOR: 'editor',
    MANAGER: 'manager',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

const ROLES: readonly string[] = Object.values(Role);

export const isRole = (value: unknown): value is Role =>
    typeof value === 'string' && ROLES.includes(value);
