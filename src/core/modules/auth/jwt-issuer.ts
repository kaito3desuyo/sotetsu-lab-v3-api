/** 署名を確かめる前に、Supabase の発行元かだけを見分けるため iss を読む。信用はしない */
export const readUnverifiedIssuer = (jwt: string): string | null => {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    try {
        const json = JSON.parse(
            Buffer.from(payload, 'base64url').toString('utf-8'),
        );
        return typeof json.iss === 'string' ? json.iss : null;
    } catch {
        return null;
    }
};
