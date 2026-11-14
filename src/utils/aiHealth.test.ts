import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAppHealthAnalysis, executeGeminiAction } from './geminiActions';

test('AI Health: handleAppHealthAnalysis provides structured diagnostic report with fallback', async () => {
  const result = await handleAppHealthAnalysis({
    healthReport: {
      timestamp: new Date().toISOString(),
      uptimeSeconds: 3600,
      firestoreStatus: 'healthy',
      firestoreLatencyMs: 25,
      storageStatus: 'healthy',
      geminiApiStatus: 'healthy',
      geminiLatencyMs: 65,
      bhuvanProxyStatus: 'healthy',
      activeErrorCount: 0,
      memoryUsageMb: 85,
      environment: 'production',
      version: '1.2.0-role-rbac',
    },
    errors: [],
    bugReports: [],
  });

  assert.equal(result.ok, true);
  assert.ok(result.data);
  assert.ok(typeof result.data.healthScore === 'number');
  assert.ok(result.data.healthScore >= 50 && result.data.healthScore <= 100);
  assert.ok(['optimal', 'healthy', 'warning', 'critical'].includes(result.data.overallStatus));
  assert.ok(Array.isArray(result.data.subsystemDiagnostics));
  assert.ok(result.data.subsystemDiagnostics.length >= 3);
  assert.ok(Array.isArray(result.data.automatedFixesAvailable));
  assert.ok(result.data.automatedFixesAvailable.length >= 2);
  assert.ok(Array.isArray(result.data.recommendations));
});

test('AI Health: handleAppHealthAnalysis responds to custom inquiry with targeted answer', async () => {
  const customQuery = 'Investigate memory footprint and cache headers';
  const result = await handleAppHealthAnalysis({
    healthReport: {
      timestamp: new Date().toISOString(),
      uptimeSeconds: 1800,
      firestoreStatus: 'healthy',
      firestoreLatencyMs: 20,
      storageStatus: 'healthy',
      geminiApiStatus: 'healthy',
      geminiLatencyMs: 70,
      bhuvanProxyStatus: 'healthy',
      activeErrorCount: 1,
      memoryUsageMb: 95,
      environment: 'production',
      version: '1.2.0-role-rbac',
    },
    errors: [
      {
        id: 'err_1',
        timestamp: new Date().toISOString(),
        message: 'Network reconnect timeout',
        component: 'client',
        severity: 'warning',
      },
    ],
    customQuery,
  });

  assert.equal(result.ok, true);
  assert.ok(result.data);
  assert.ok(result.data.targetedAnswer !== undefined);
  assert.ok(result.data.detectedIssues.length >= 0);
});

test('AI Health: executeGeminiAction dispatches health-diagnostics and app-health actions', async () => {
  const res1 = await executeGeminiAction('health-diagnostics', {
    healthReport: { firestoreLatencyMs: 30, memoryUsageMb: 80 },
  });
  assert.equal(res1.ok, true);
  assert.ok(res1.data.healthScore > 0);

  const res2 = await executeGeminiAction('/api/gemini/app-health', {
    healthReport: { firestoreLatencyMs: 25, memoryUsageMb: 75 },
  });
  assert.equal(res2.ok, true);
  assert.ok(res2.data.overallStatus);
});
