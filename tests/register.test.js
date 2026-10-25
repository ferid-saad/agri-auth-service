const request = require('supertest');
const app = require('../src/app');

describe('POST /register', () => {
  it('refuse une requête sans mot de passe', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'ali@mail.com' });
    expect(res.statusCode).toBe(400);
  });
});