'use strict';

const request = require('supertest');
const app = require('../src/index');
const { startServer } = require('../src/index');

describe('Engine API', () => {
  beforeAll(async () => {
    await startServer();
  });

  test('GET /api/engine/health', async () => {
    const res = await request(app).get('/api/engine/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.engine).toBe('3.0.0');
  });

  test('POST /api/engine/analyze aspirin', async () => {
    const res = await request(app)
      .post('/api/engine/analyze')
      .send({ smiles: 'CC(=O)Oc1ccccc1C(=O)O', targetName: 'COX-2' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.analysis.descriptors.molecularWeight).toBeGreaterThan(100);
    expect(res.body.analysis.engagement.disclaimer).toMatch(/NOT a trained GNN|experimental/i);
  }, 30000);

  test('POST /api/engine/runs starts async workflow', async () => {
    const res = await request(app)
      .post('/api/engine/runs')
      .send({ smiles: 'CC(=O)Oc1ccccc1C(=O)O', targetName: 'COX-2' });

    expect(res.status).toBe(202);
    expect(res.body.runId).toBeDefined();

    await new Promise((r) => setTimeout(r, 4000));
    const runRes = await request(app).get(`/api/engine/runs/${res.body.runId}`);
    expect(runRes.body.run.status).toMatch(/completed|awaiting_hitl|running/);

    if (runRes.body.run.status === 'awaiting_hitl') {
      const approve = await request(app)
        .post(`/api/engine/runs/${res.body.runId}/approve`)
        .send({ rationale: 'Test approval' });
      expect(approve.status).toBe(200);
      expect(approve.body.status).toBe('completed');
    }
  }, 45000);
});
