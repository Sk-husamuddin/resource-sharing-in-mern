const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');

// GET /api/messages
const getMessages = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .populate('sender', 'username displayName avatar')
      .populate('recipient', 'username displayName avatar')
      .populate('relatedResource', 'title')
      .populate('relatedLostFound', 'title')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ messages });
  } catch (err) {
    next(err);
  }
};

// POST /api/messages
const sendMessage = async (req, res, next) => {
  try {
    const { recipient, content, relatedResource, relatedLostFound } = req.body;

    if (!mongoose.Types.ObjectId.isValid(recipient)) {
      return res.status(400).json({ message: 'Invalid recipient ID.' });
    }
    if (recipient === req.session.userId) {
      return res.status(400).json({ message: 'You cannot message yourself.' });
    }

    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ message: 'Recipient not found.' });
    }

    const message = await Message.create({
      sender: req.session.userId,
      recipient,
      content,
      relatedResource: relatedResource || null,
      relatedLostFound: relatedLostFound || null,
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'username displayName avatar')
      .populate('recipient', 'username displayName avatar');

    return res.status(201).json({ message: 'Message sent.', data: populated });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/messages/:id/read
const markRead = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid message ID.' });
    }
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });

    if (msg.recipient.toString() !== req.session.userId) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    msg.isRead = true;
    await msg.save();
    return res.json({ message: 'Marked as read.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/messages/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.session.userId,
      isRead: false,
    });
    return res.json({ unreadCount: count });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMessages, sendMessage, markRead, getUnreadCount };
