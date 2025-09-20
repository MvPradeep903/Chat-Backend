const express = require('express');
const uprouter = express.Router();
const { uploadSingle,uploadMultiple } = require('../controllers/uploadController');
const upload = require('../middleware/multerConfig');
const { authMiddleware } = require('../middleware/authentication');

uprouter.post('/single',authMiddleware,upload.single('file'),uploadSingle);
uprouter.post('/multiple',authMiddleware,upload.array('files',10),uploadMultiple);

module.exports = uprouter;