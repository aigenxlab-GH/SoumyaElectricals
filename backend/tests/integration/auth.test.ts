import request from 'supertest'
import app from '../../src/app'

describe('POST /api/v1/auth/login', () => {
  it('returns 422 for missing body', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({})
    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
  })

  it('returns 401 for invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      employee_id: 'SE_9999',
      password: 'wrongpassword',
    })
    expect(res.status).toBe(401)
  })
})
