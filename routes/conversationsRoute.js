const express = require('express');
const routes = express.Router();
const { createPrivateConversation,createGroupConversation,getUserConversations,addMembersToGroup,exitGroup,removeMemberFromGroup,makeAdmin,removeAdmin, deleteConversation, updateGroup } = require('../controllers/conversationController');
const { authMiddleware } = require('../middleware/authentication');

routes.post('/private',authMiddleware,createPrivateConversation);
routes.post('/group',authMiddleware,createGroupConversation);
routes.get('/',authMiddleware,getUserConversations);
routes.post('/group/add',authMiddleware,addMembersToGroup);
routes.post('/group/exit',authMiddleware,exitGroup);
routes.post('/group/removemember',authMiddleware,removeMemberFromGroup);
routes.post('/group/make-admin',authMiddleware,makeAdmin);
routes.post('/group/remove-admin',authMiddleware,removeAdmin);
routes.delete('/:conversationId', authMiddleware, deleteConversation);
routes.patch('/group/:conversationId',authMiddleware,updateGroup);

module.exports = routes;