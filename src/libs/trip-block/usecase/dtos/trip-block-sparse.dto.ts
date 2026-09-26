/**
 * `fields` を指定した `GET /v3/trip-blocks` の応答（docs/adr/0002-v3-sparse-fieldsets.md）。
 * trip-block と trip の id だけが必ずあり、ほかは指定した項目だけ（null は省く）。
 */
export interface TripBlockSparseDto {
    id: string;
    trips: ({ id: string } & Record<string, unknown>)[];
}
