const jwt = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized — please log in' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id)
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' })
    }
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized — invalid token' })
  }
}

module.exports = { protect }
