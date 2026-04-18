const express = require('express')
const validUrl = require('valid-url')
const { nanoid } = require('nanoid')
const Url = require('../models/Url')
const { protect } = require('../middleware/auth')
const router = express.Router()

router.post('/', protect, async (req, res) => {
  try {
    const { originalUrl, customCode } = req.body
    if (!originalUrl) {
      return res.status(400).json({ success: false, message: 'Please provide a URL to shorten' })
    }
    if (!validUrl.isUri(originalUrl)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid URL including http:// or https://' })
    }
    let shortCode = customCode ? customCode.trim() : nanoid(6)
    if (customCode) {
      const existing = await Url.findOne({ shortCode })
      if (existing) {
        return res.status(400).json({ success: false, message: 'This custom code is already taken' })
      }
    }
    const url = await Url.create({ originalUrl, shortCode, user: req.user._id })
    const shortUrl = `${process.env.BASE_URL}/${shortCode}`
    res.status(201).json({ success: true, url: { ...url.toObject(), shortUrl } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.get('/', protect, async (req, res) => {
  try {
    const urls = await Url.find({ user: req.user._id }).sort({ createdAt: -1 })
    const baseUrl = process.env.BASE_URL
    const urlsWithShort = urls.map(url => ({ ...url.toObject(), shortUrl: `${baseUrl}/${url.shortCode}` }))
    res.json({ success: true, count: urls.length, urls: urlsWithShort })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.get('/stats', protect, async (req, res) => {
  try {
    const urls = await Url.find({ user: req.user._id })
    const totalUrls = urls.length
    const totalClicks = urls.reduce((sum, url) => sum + url.clicks, 0)
    const sorted = [...urls].sort((a, b) => b.clicks - a.clicks)
    res.json({
      success: true,
      stats: {
        totalUrls,
        totalClicks,
        mostClickedCode: sorted[0]?.shortCode || null,
        mostClickedCount: sorted[0]?.clicks || 0
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const url = await Url.findOneAndDelete({ _id: req.params.id, user: req.user._id })
    if (!url) return res.status(404).json({ success: false, message: 'URL not found' })
    res.json({ success: true, message: 'URL deleted successfully' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
