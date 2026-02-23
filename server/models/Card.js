const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  columnId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Column',
    required: true
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
    type: String,
    required: true
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
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Card', cardSchema);
