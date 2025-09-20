const express = require('express');
const route = express.Router();
const { getMessages,createMessage,markAsRead, deleteMessage } = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/authentication');

route.get('/:conversationId',authMiddleware,getMessages);
route.post('/',authMiddleware,createMessage);
route.post('/read',authMiddleware,markAsRead);
route.delete('/:messageId',authMiddleware, deleteMessage);

module.exports = route;