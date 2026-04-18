require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const authRoutes = require('./routes/auth')
const urlRoutes = require('./routes/url')
const Url = require('./models/Url')

const app = express()

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }))
app.use(express.json())

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/urlshortener')
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB error:', err.message)
    process.exit(1)
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'URL Shortener API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + ' seconds'
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/urls', urlRoutes)

app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params
    if (shortCode.startsWith('api') || shortCode === 'favicon.ico') {
      return res.status(404).json({ message: 'Not found' })
    }
    const url = await Url.findOne({ shortCode, isActive: true })
    if (!url) {
      return res.status(404).json({ success: false, message: 'Short URL not found' })
    }
    url.clicks += 1
    url.lastClickedAt = new Date()
    await url.save()
    return res.redirect(url.originalUrl)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

const PORT = process.env.PORT || 5000
const startServer = async () => {
  await connectDB()
  app.listen(PORT, '0.0.0.0', () => console.log(`URL Shortener Backend on port ${PORT}`))
}
startServer()
module.exports = app
