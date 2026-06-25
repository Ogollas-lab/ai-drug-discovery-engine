'use strict';

const request = require('supertest');
const { startServer } = require('../src/index');

describe('Chat API', () => {
  let app;

  beforeAll(async () => {
    app = await startServer();
  });

  test('POST /api/engine/chat returns text and tools', async () => {
    const res = await request(app)
      .post('/api/engine/chat')
      .send({
        messages: [
          { role: 'user', content: 'Analyze aspirin SMILES CC(=O)Oc1ccccc1C(=O)O briefly.' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.text).toBe('string');
  }, 90000);

  test('GET /api/auth/config returns neon auth url', async () => {
    const res = await request(app).get('/api/auth/config');
    expect(res.status).toBe(200);
    expect(res.body.providers).toContain('google');
  });
});
