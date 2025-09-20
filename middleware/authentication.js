// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
// const dotenv = require('dotenv');
// dotenv.config();

// const verifyTokenAndGetUser = async(token) => {
//     if(!token) { throw new Error('No Token Provided') };
//     const { id } = jwt.verify(token,process.env.JWT_SECRET);
//     const user = await User.findById(id).select('-password');
    
//     if(!user) { throw new Error('User Not Found') };
//     return user;
// }


// // const authMiddleware = async (req,res,next) => {
// //     const token = req.headers.authorization?.split(' ')[1];

// //     try {
// //         const user = await verifyTokenAndGetUser(token);
// //         req.user = user;
// //         next();
// //     } catch (err) {
// //         res.status(401).json({ message : err.message || 'Unauthorized' });
// //     }
// // }

// const authMiddleware = async (req, res, next) => {
//     const token = req.headers.authorization?.split(' ')[1];
//     console.log("🔐 Received Token:", token);

//     try {
//         const user = await verifyTokenAndGetUser(token);
//         console.log("✅ Authenticated User:", user);

//         req.user = user;
//         next();
//     } catch (err) {
//         console.error("❌ Auth Middleware Error:", err.message);
//         res.status(401).json({ message: err.message || 'Unauthorized' });
//     }
// };

// const verifySocketToken = async (token) => {
//     return await verifyTokenAndGetUser(token);
// }

// // const errorHandler = (err,req,res,next) => {
// //     console.error(err.stack);
// //     res.status(err.status || 500 ).json({ message : err.message || 'Server Error' });
// // };

// module.exports = { authMiddleware,verifySocketToken };

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config();

const verifyTokenAndGetUser = async (token) => {
  if (!token) {
    throw new Error('No Token Provided');
  }
  
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    if (!id) {
      throw new Error('Token verification failed: No user ID');
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      throw new Error('User Not Found');
    }
    
    return user;
  } catch (error) {
    console.error('Token verification error:', error.message);
    throw new Error('Invalid Token');
  }
};

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  console.log('Authorization header:', authHeader);
  console.log('Extracted token:', token);

  try {
    const user = await verifyTokenAndGetUser(token);
    req.user = user;
    console.log('Authenticated user:', user._id.toString());
    next();
  } catch (err) {
    console.error('Authentication Middleware Error:', err.message);
    res.status(401).json({ message: err.message || 'Unauthorized' });
  }
};

const verifySocketToken = async (token) => {
  return await verifyTokenAndGetUser(token);
};

module.exports = { authMiddleware, verifySocketToken };
