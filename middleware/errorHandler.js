// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config();

const errorHandler = (err,req,res,next) => {
    console.error(err.stack);
    res.status(err.status || 500 ).json({ message : err.message || 'Server Error' });
};

module.exports = errorHandler ;