// const mongoose = require('mongoose');
// const User = require('../models/User');

// // const getUsers = async (req,res) => {
// //     try {
// //         const includeSelf = req.query.includeSelf == 'true';
// //         const currentUserId = mongoose.Types.ObjectId(req.user._id);
// //         const filter = includeSelf ? {} : { _id : { $ne : currentUserId } };
// //         const users = await User.find(filter).select('_id username email avatar').lean();
// //         res.json(users);
// //     } catch (err) {
// //         console.error(err);
// //         res.status(500).json({ message : 'Server Error' });
// //     }
// // }

// const getUsers = async (req, res) => {
//   try {
//     console.log("Decoded user from token:", req.user); // ← Add this

//     const includeSelf = req.query.includeSelf == 'true';

//     if (!req.user || !req.user._id) {
//       return res.status(400).json({ message: "Invalid user data from token" });
//     }

//     const currentUserId = mongoose.Types.ObjectId(req.user._id);
//     const filter = includeSelf ? {} : { _id: { $ne: currentUserId } };
    
//     const users = await User.find(filter).select('_id username email avatar').lean();

//     res.json(users);
//   } catch (err) {
//     console.error("Get Users Error:", err); // ← Better error logging
//     res.status(500).json({ message: 'Server Error' });
//   }
// }

// const getUserById = async (req,res) => {
//     try {
//         if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
//             return res.status(400).json({ message : 'Invalid user Id' });
//         }
//         const user = await User.findById(req.params.id).select('_id username email avatar');
//         if (!user) {
//             return res.status(404).json({ message : 'User not found' });
//         }
//         res.json(user);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message : 'Server Error' });
//     }
// }

// const updateProfile = async (req,res) => {
//     try {
//         console.log("Request body received:", req.body);
//         const updates = {};
//         if (req.body.username) {
//             updates.username = req.body.username;
//         }
//         if (req.body.phoneNumber) {
//             updates.phoneNumber = req.body.phoneNumber;
//         }
//         if (req.body.avatar) {
//             updates.avatar = req.body.avatar;
//         }
//         if (req.body.email) {
//             updates.email = req.body.email;
//         }
//         if (Object.keys(updates).length == 0) {
//             return res.status(400).json({ message : 'No Valid Fields to Update' });
//         }
//         const user = await User.findByIdAndUpdate(
//             req.user._id, { $set : updates }, {new : true, runValidators : true, context : 'query' }).select('_id username email avatar phoneNumber');
//         if (!user) {
//             return res.status(404).json({ message : 'User not found'});
//         }
//         res.json(user);
//     } catch (err) {
//         console.error('Update Profile Error :',err);
//         res.status(500).json({ message : 'Server Error' });
//     }
// }

// const searchUsers = async (req, res) => {
//   try {
//     const { query } = req.params; // /search/:query

//     if (!query || query.trim() === "") {
//       return res.status(400).json({ message: "Search query is required" });
//     }

//     // Case-insensitive regex search
//     const regex = new RegExp(query, "i");

//     const users = await User.find({
//       $or: [
//         { username: regex },
//         { email: regex },
//         { phoneNumber: regex }
//       ],
//       _id: { $ne: req.user._id }   // ✅ exclude current logged-in user
//     }).select("-password"); // don't send password in response

//     res.json(users);
//   } catch (err) {
//     console.error("Search Users Error:", err);
//     res.status(500).json({ message: "Server Error" });
//   }
// };

// module.exports = { getUsers,getUserById,updateProfile,searchUsers };

const mongoose = require('mongoose');
const User = require('../models/User');

const getUsers = async (req, res) => {
  try {
    console.log("getUsers called. Authenticated user:", req.user._id);

    const includeSelf = req.query.includeSelf === 'true';

    // Use string _id directly, mongoose accepts this
    const currentUserId = req.user._id;

    const filter = includeSelf ? {} : { _id: { $ne: currentUserId } };

    const users = await User.find(filter).select('_id username email avatar phoneNumber').lean();

    res.json(users);
  } catch (err) {
    console.error('getUsers Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
}


const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    console.log('getUserById called with id:', userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user Id' });
    }

    const user = await User.findById(userId).select('_id username email avatar phoneNumber');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('getUserById Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    console.log('updateProfile request body:', req.body);

    const updates = {};
    if (req.body.username) updates.username = req.body.username;
    if (req.body.phoneNumber) updates.phoneNumber = req.body.phoneNumber;
    if (req.body.avatar) updates.avatar = req.body.avatar;
    if (req.body.email) updates.email = req.body.email;
    if(req.body.aboutMe) updates.aboutme = req.body.aboutMe;
    console.log("req.body.avatar",req.body.avatar);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No Valid Fields to Update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true, context: 'query' }
    ).select('_id username email avatar phoneNumber aboutme');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// const searchUsers = async (req, res) => {
//   try {
//     const { query } = req.params;
//     console.log('searchUsers called with query:', query);

//     if (!query || query.trim() === '') {
//       return res.status(400).json({ message: 'Search query is required' });
//     }

//     const regex = new RegExp(query, 'i');

//     const users = await User.find({
//       $or: [
//         { username: regex },
//         // { email: regex },
//         { phoneNumber: regex }
//       ],
//       _id: { $ne: req.user._id }
//     }).select('-password');

//     console.log(`searchUsers found ${users.length} users matching query`);

//     res.json(users);
//   } catch (err) {
//     console.error('Search Users Error:', err);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };

const searchUsers = async (req, res) => {
  try {
    const { query } = req.params;
    console.log('searchUsers called with query:', query);

    if (!query || !query.trim()) {
      return res.json([]); // instead of 400, return empty array
    }

    const regex = new RegExp(query, 'i');

    const users = await User.find({
      $or: [
        { username: regex },
        { phoneNumber: regex }
      ],
      _id: { $ne: req.user._id } // exclude logged-in user
    }).select('-password');

    console.log(`searchUsers found ${users.length} users matching query`);
    res.json(users);
  } catch (err) {
    console.error('Search Users Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getUsers, getUserById, updateProfile, searchUsers };
