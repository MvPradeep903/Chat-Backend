const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const getMessages = async (req,res) => {
    try {
        const { conversationId } = req.params;
        const { page = 1, limit = 30 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message : 'Invalid conversation id' });
        }

        const convo = await Conversation.findById(conversationId).lean();
        if(!convo || !convo.members.map(m => m.toString()).includes(req.user._id.toString())){
            return res.status(403).json({ message : 'Access Denied' });
        }

        const messages = await Message.find({ conversation : conversationId }).sort({ createdAt : -1 }).skip(skip)
                         .limit(parseInt(limit)).populate('sender','username avatar').lean();
        console.log("messages",messages);
        res.json(messages.reverse());
    } catch (err) {
        console.error(err);
        res.status(500).json({ message : 'Server Error' });
    }
}

const createMessage = async (req,res) => {
    // try {
    //     const { conversationId,text,media } = req.body;
    //     if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    //         return res.status(400).json({ message : 'Invalid conversation id' });
    //     }
    //     const convo = await Conversation.findById(conversationId);
    //     if (!convo || !convo.members.map(m => m.toString()).includes(req.user._id.toString())) {
    //         return res.status(403).json({ message : 'Access Denied' });
    //     }
    //     const message = new Message({
    //         conversation : conversationId,
    //         sender : req.user._id,
    //         text : text || '',
    //         media : media || []
    //     });
    //     await message.save();

    //     convo.lastMessage = message._id;
    //     convo.updatedAt = Date.now();
    //     await convo.save();

    //     const populated = await Message.findById(message._id).populate('sender','username avatar').lean();
    //     res.status(201).json(populated);
    // } catch (err) {
    //     console.error(err);
    //     res.status(500).json({ message : 'Server Error' });
    // }
}

const markAsRead = async (req,res) => {
    try {
        const { messageId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ message : 'Invalid message id' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message : 'Message not found' });
        }
        if (!message.readBy.map(m => m.toString()).includes(req.user._id.toString())) {
            message.readBy.push(req.user._id);
            await message.save();
        }
        res.json({ message : 'Marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message : 'Server Error' });
    }
}

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Only sender can delete their message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(messageId);

    // Optional: update lastMessage if needed
    const convo = await Conversation.findById(message.conversation);
    if (convo && convo.lastMessage?.toString() === messageId.toString()) {
      const latestMsg = await Message.findOne({ conversation: convo._id })
        .sort({ createdAt: -1 })
        .lean();
      convo.lastMessage = latestMsg ? latestMsg._id : null;
      await convo.save();
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Delete Message Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getMessages,createMessage,markAsRead,deleteMessage };