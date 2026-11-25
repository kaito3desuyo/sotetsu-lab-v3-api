// Lambda の CloudWatch アラームを組み立てる（api・backend・socket・client で同じ中身）。
// 通知先は monitoring リポがデプロイした SNS トピック（→ Discord）。
export const ALARM_TOPIC_ARN =
    "${ssm:sotetsu-lab-v3-${sls:stage}-monitoring-alarm-topic-arn, ''}";

export interface LambdaAlarm {
    logicalId: string;
    alarmName: string;
    description: string;
    functionLogicalId: string;
    metricName: 'Errors' | 'Url5xxCount';
    threshold: number;
}

export function lambdaAlarms(alarms: LambdaAlarm[]): {
    Conditions: { IsProd: { 'Fn::Equals': ['${sls:stage}', 'prod'] } };
    Resources: Record<string, unknown>;
} {
    const Resources: Record<string, unknown> = {};
    for (const alarm of alarms) {
        Resources[alarm.logicalId] = {
            Type: 'AWS::CloudWatch::Alarm',
            Condition: 'IsProd',
            Properties: {
                AlarmName: alarm.alarmName,
                AlarmDescription: alarm.description,
                Namespace: 'AWS/Lambda',
                MetricName: alarm.metricName,
                Dimensions: [
                    {
                        Name: 'FunctionName',
                        Value: { Ref: alarm.functionLogicalId },
                    },
                ],
                Statistic: 'Sum',
                Period: 3600,
                EvaluationPeriods: 1,
                Threshold: alarm.threshold,
                ComparisonOperator: 'GreaterThanOrEqualToThreshold',
                TreatMissingData: 'notBreaching',
                AlarmActions: [ALARM_TOPIC_ARN],
                OKActions: [ALARM_TOPIC_ARN],
            },
        };
    }
    return {
        Conditions: { IsProd: { 'Fn::Equals': ['${sls:stage}', 'prod'] } },
        Resources,
    };
}

export interface LogMetricAlarm {
    /** リソースの論理 id の前置き（`<prefix>MetricFilter`・`<prefix>Alarm` になる） */
    logicalIdPrefix: string;
    alarmName: string;
    description: string;
    /** Serverless が作るロググループの論理 id（例: AppLogGroup） */
    logGroupLogicalId: string;
    /** ログ（JSON）の絞り込み条件。CloudWatch Logs のフィルターパターン */
    filterPattern: string;
    metricNamespace: string;
    metricName: string;
    threshold: number;
}

/**
 * ログの文言を数えるメトリクスフィルターと、1 時間の件数で鳴らすアラーム（lambdaAlarms と同じ Conditions・通知先）。
 * Lambda の Errors に出ない、握りつぶした失敗を拾うのに使う。
 */
export function logMetricAlarms(
    alarms: LogMetricAlarm[],
): Record<string, unknown> {
    const Resources: Record<string, unknown> = {};
    for (const alarm of alarms) {
        Resources[`${alarm.logicalIdPrefix}MetricFilter`] = {
            Type: 'AWS::Logs::MetricFilter',
            Condition: 'IsProd',
            DependsOn: [alarm.logGroupLogicalId],
            Properties: {
                LogGroupName: { Ref: alarm.logGroupLogicalId },
                FilterPattern: alarm.filterPattern,
                MetricTransformations: [
                    {
                        MetricNamespace: alarm.metricNamespace,
                        MetricName: alarm.metricName,
                        MetricValue: '1',
                        Unit: 'Count',
                    },
                ],
            },
        };
        Resources[`${alarm.logicalIdPrefix}Alarm`] = {
            Type: 'AWS::CloudWatch::Alarm',
            Condition: 'IsProd',
            Properties: {
                AlarmName: alarm.alarmName,
                AlarmDescription: alarm.description,
                Namespace: alarm.metricNamespace,
                MetricName: alarm.metricName,
                Statistic: 'Sum',
                Period: 3600,
                EvaluationPeriods: 1,
                Threshold: alarm.threshold,
                ComparisonOperator: 'GreaterThanOrEqualToThreshold',
                TreatMissingData: 'notBreaching',
                AlarmActions: [ALARM_TOPIC_ARN],
                OKActions: [ALARM_TOPIC_ARN],
            },
        };
    }
    return Resources;
}
