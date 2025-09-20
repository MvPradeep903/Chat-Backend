const express = require('express');
const router = express.Router();
const { register,login } = require('../controllers/authenticationController');
const upload = require('../middleware/multerConfig');

router.post('/register',upload.single('avatar'), register);

router.post('/login',login);

module.exports = router;