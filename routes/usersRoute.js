const express = require('express');
const userroutes = express.Router();
const { getUsers,getUserById,updateProfile, searchUsers } = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authentication');

userroutes.get('/',authMiddleware,getUsers);
userroutes.get('/:id',authMiddleware,getUserById);
userroutes.patch('/me',authMiddleware,updateProfile);
userroutes.get('/search/:query',authMiddleware,searchUsers);

module.exports = userroutes;