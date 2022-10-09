export const ETripDirection = {
    INBOUND: 0,
    OUTBOUND: 1,
} as const;
export type ETripDirection = typeof ETripDirection[keyof typeof ETripDirection];
