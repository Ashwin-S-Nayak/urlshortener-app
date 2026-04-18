const mongoose = require('mongoose')

const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: [true, 'Original URL is required'],
      trim: true
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    clicks: {
      type: Number,
      default: 0
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastClickedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
)

urlSchema.index({ shortCode: 1 })
urlSchema.index({ user: 1 })

module.exports = mongoose.model('Url', urlSchema)
