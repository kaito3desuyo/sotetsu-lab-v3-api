/** `a,b,c` 形式のクエリを配列にする（空要素と重複は捨てる）。 */
export function parseCommaList(value: string | undefined): string[] {
    return [
        ...new Set(
            (value ?? '')
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean),
        ),
    ];
}
