const request = require('supertest');
const app = require('../src/app');

describe('POST /login', () => {
  it('refuse une requête sans mot de passe', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'ali@mail.com' });
    expect(res.statusCode).toBe(400);
  });
});