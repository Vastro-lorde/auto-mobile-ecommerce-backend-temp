const mongoose = require('mongoose');

const participantSchema = {
  type: String,
  ref: 'User',
  required: true
};

const conversationSchema = new mongoose.Schema({
  participants: {
    type: [participantSchema],
    validate: [
      (value) => Array.isArray(value) && value.length >= 2,
      'Conversations require at least two participants'
    ]
  }
}, {
  timestamps: true
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

conversationSchema.methods.toJSON = function() {
  const conversation = this.toObject({ virtuals: true });
  conversation.id = conversation._id;
  delete conversation._id;
  delete conversation.__v;
  return conversation;
};

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: String,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  }
}, {
  timestamps: true
});

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });

messageSchema.methods.toJSON = function() {
  const message = this.toObject({ virtuals: true });
  message.id = message._id;
  delete message._id;
  delete message.__v;
  return message;
};

const messageReadSchema = new mongoose.Schema({
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  user: {
    type: String,
    ref: 'User',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

messageReadSchema.index({ message: 1, user: 1 }, { unique: true });
messageReadSchema.index({ user: 1, readAt: -1 });

messageReadSchema.methods.toJSON = function() {
  const messageRead = this.toObject({ virtuals: true });
  messageRead.id = messageRead._id;
  delete messageRead._id;
  delete messageRead.__v;
  return messageRead;
};

const Conversation = mongoose.model('Conversation', conversationSchema);
const Message = mongoose.model('Message', messageSchema);
const MessageRead = mongoose.model('MessageRead', messageReadSchema);

module.exports = {
  Conversation,
  Message,
  MessageRead
};
