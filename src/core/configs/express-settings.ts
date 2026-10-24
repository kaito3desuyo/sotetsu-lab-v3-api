import { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Express の設定。Express 5 はクエリの解析の既定が simple に変わり、
 * `include`・`fields[資源]=項目`（docs/adr/0010-v3-include-and-fields.md）の `fields` が入れ子にならないので、Express 4 と同じ extended（qs）に戻す。
 */
export function configureExpress(app: NestExpressApplication): void {
    app.set('query parser', 'extended');
}
