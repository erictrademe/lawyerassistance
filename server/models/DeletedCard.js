const mongoose = require('mongoose');

const deletedCardSchema = new mongoose.Schema({
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  columnId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Column'
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  creatorColor: {
    type: String
  },
  creatorAvatar: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['gray', 'red', 'green'],
    default: 'gray'
  },
  content: {
    type: String,
    default: ''
  },
  order: {
    type: Number
  },
  deletedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DeletedCard', deletedCardSchema);
