// 本番は app.ts / cli.ts で Asia/Tokyo に固定されるため、テストも同じ前提に揃える。
// これを行わないと、実行環境のタイムゾーンによって運行日の判定結果が変わる。
// ワーカー起動前に設定する必要があるため setupFiles ではなく globalSetup で行う。
module.exports = async (): Promise<void> => {
    process.env.TZ = 'Asia/Tokyo';
};
