const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../server')

let token = ''
let urlId = ''

beforeAll(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/urlshortener_test'
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri)
  }
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
})

describe('GET /api/health', () => {
  it('should return status ok with database and uptime fields', async () => {
    const res = await request(app).get('/api/health')
    expect(res.statusCode).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body).toHaveProperty('database')
    expect(res.body).toHaveProperty('uptime')
  })
})

describe('POST /api/auth/register', () => {
  it('should register new user and return JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@urltest.com', password: 'password123' })
    expect(res.statusCode).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body).toHaveProperty('token')
    token = res.body.token
  })
  it('should reject duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: 'test@urltest.com', password: 'pass123' })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('should login with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@urltest.com', password: 'password123' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('token')
  })
  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@urltest.com', password: 'wrongpass' })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /api/urls', () => {
  it('should shorten a valid URL', async () => {
    const res = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://www.github.com/very/long/path' })
    expect(res.statusCode).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.url.shortCode).toHaveLength(6)
    urlId = res.body.url._id
  })
  it('should reject invalid URL format', async () => {
    const res = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'not-a-valid-url' })
    expect(res.statusCode).toBe(400)
  })
  it('should reject without auth token', async () => {
    const res = await request(app)
      .post('/api/urls')
      .send({ originalUrl: 'https://www.google.com' })
    expect(res.statusCode).toBe(401)
  })
  it('should accept custom short code', async () => {
    const res = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://www.google.com', customCode: 'mygoogle' })
    expect(res.statusCode).toBe(201)
    expect(res.body.url.shortCode).toBe('mygoogle')
  })
  it('should reject duplicate custom code', async () => {
    const res = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://www.yahoo.com', customCode: 'mygoogle' })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/urls', () => {
  it('should return URLs for authenticated user', async () => {
    const res = await request(app)
      .get('/api/urls')
      .set('Authorization', `Bearer ${token}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.urls)).toBe(true)
  })
  it('should reject unauthenticated access', async () => {
    const res = await request(app).get('/api/urls')
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/urls/stats', () => {
  it('should return user statistics', async () => {
    const res = await request(app)
      .get('/api/urls/stats')
      .set('Authorization', `Bearer ${token}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.stats).toHaveProperty('totalUrls')
    expect(res.body.stats).toHaveProperty('totalClicks')
  })
})

describe('DELETE /api/urls/:id', () => {
  it('should delete URL belonging to user', async () => {
    const res = await request(app)
      .delete(`/api/urls/${urlId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
