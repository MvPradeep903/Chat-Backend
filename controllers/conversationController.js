const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');


const createPrivateConversation = async (req, res) => {
    try {
        const { otherUserId } = req.body;
        if (!otherUserId) {
            return res.status(400).json({ message: 'otherUserId required' });
        }
        if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
            return res.status(400).json({ message: 'Invalid user Id' });
        }
        let convo = await Conversation.findOne({
            isGroup: false,
            members: { $all: [req.user._id, otherUserId], $size: 2 }
        }).populate('members', 'username email avatar phoneNumber online aboutme').lean();

        if (convo) {
            return res.json(convo)
        } else {
            convo = new Conversation({
                isGroup: false,
                members: [req.user._id, otherUserId]
            })
            await convo.save();
        }
        const populated = await Conversation.findById(convo._id).populate('members', 'username email avatar phoneNumber online aboutme').lean();
        console.log("populated", populated);
        res.status(201).json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const createGroupConversation = async (req, res) => {
    try {
        const { name, memberIds } = req.body;
        if (!name || !Array.isArray(memberIds) || memberIds.length < 1) {
            return res.status(400).json({ message: 'name and memberIds required' });
        }
        const validIds = memberIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        const members = Array.from(new Set([req.user._id.toString(), ...validIds]));
        const group = new Conversation({
            name,
            isGroup: true,
            members,
            admins: [req.user._id]
        });
        await group.save();
        const populated = await Conversation.findById(group.id).populate('members', 'username email avatar phoneNumber')
            .populate('admins', 'username email avatar phoneNumber').lean();
        res.status(201).json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const getUserConversations = async (req, res) => {
    try {
        const convos = await Conversation.find({ members: req.user._id }).populate('members', 'username email avatar phoneNumber online aboutme')
            .populate('admins', 'username email avatar phoneNumber')
            .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username avatar phoneNumber online aboutme' } })
            .sort({ updatedAt: -1 }).lean();
        console.log("convos", convos)
        res.json(convos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}
// const getUserConversations = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // Fetch conversations where the user is a member
//     const conversations = await Conversation.find({ members: userId })
//       .sort({ updatedAt: -1 })
//       .populate({
//         path: 'members',
//         select: '_id username avatar',
//       })
//       .lean();

//     // Transform response: include only the other user in one-to-one chats
//     const formattedConversations = conversations.map(convo => {
//       const isGroup = convo.isGroup;

//       if (!isGroup) {
//         // In 1-on-1 chat, find the other user
//         const otherUser = convo.members.find(
//           member => member._id.toString() !== userId.toString()
//         );

//         return {
//           ...convo,
//           isGroup: false,
//           otherUser, // 👈 use this in frontend to display their name/avatar
//         };
//       }

//       return convo; // group chat unchanged
//     });
//     console.log("formattedConversations",formattedConversations)
//     res.json(formattedConversations);
//   } catch (err) {
//     console.error('getConversations Error:', err.message);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };


const addMembersToGroup = async (req, res) => {
    try {
        const { conversationId, memberIds } = req.body;
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: 'Invalid conversation ID' });
        }

        const convo = await Conversation.findById(conversationId);
        if (!convo || !convo.isGroup) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isAdmin = convo.admins.map(id => id.toString()).includes(req.user._id.toString());
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admins can add members' });
        }
        const validIds = memberIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        const newMembers = Array.from(new Set([...convo.members.map(m => m.toString()), ...validIds]));
        convo.members = newMembers;
        convo.updatedAt = Date.now();
        await convo.save();

        const populated = await Conversation.findById(conversationId).populate('members', 'username email avatar phoneNumber')
            .populate('admins', 'username email avatar phoneNumber').lean();
        res.json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const exitGroup = async (req, res) => {
    try {
        const { conversationId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: 'Invalid conversation ID' });
        }
        const convo = await Conversation.findById(conversationId);
        if (!convo || !convo.isGroup) {
            return res.status(404).json({ message: 'Group not found' });
        }
        convo.members = convo.members.filter(id => id.toString() !== req.user._id.toString());
        convo.admins = convo.admins.filter(id => id.toString() !== req.user._id.toString());

        if (convo.members.length === 0) {
            await convo.deleteOne();
            return res.json({ message: 'Group deleted as no members remain' });
        }

        if (convo.admins.length === 0 && convo.members.length > 0) {
            convo.admins.push(convo.members[0]);
        }

        await convo.save();
        const populated = await Conversation.findById(conversationId).populate('members', 'username email avatar phoneNumber')
            .populate('admins', 'username email avatar phoneNumber').lean();
        res.json({ message: 'Exited Group Successfully', conversation: populated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const removeMemberFromGroup = async (req, res) => {
    try {
        const { conversationId, memberId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ message: 'Invalid IDs' });
        }
        const convo = await Conversation.findById(conversationId);
        if (!convo || !convo.isGroup) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isAdmin = convo.admins.map(id => id.toString()).includes(req.user._id.toString());
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admins can remove members' });
        }
        if (!convo.members.map(id => id.toString()).includes(memberId.toString())) {
            return res.status(404).json({ message: 'User not in this group' });
        }
        convo.members = convo.members.filter(id => id.toString() !== memberId.toString());
        convo.admins = convo.admins.filter(id => id.toString() !== memberId.toString());

        if (convo.members.length === 0) {
            await convo.deleteOne();
            return res.json({ message: 'Group deleted as no members remain' });
        }
        if (convo.admins.length === 0 && convo.members.length > 0) {
            convo.admins.push(convo.members[0]);
        }
        await convo.save();
        const populated = await Conversation.findById(conversationId).populate('members', 'username email avatar phoneNumber')
            .populate('admins', 'username email avatar phoneNumber').lean();
        res.json({ message: 'Member Removed Successfully', conversation: populated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const makeAdmin = async (req, res) => {
    try {
        const { conversationId, memberId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ message: 'Invalid IDs' });
        }
        const convo = await Conversation.findById(conversationId);
        if (!convo || !convo.isGroup) {
            return res.status(404).json({ message: 'Group not found' });
        }
        const isAdmin = convo.admins.map(id => id.toString()).includes(req.user._id.toString());
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admins can assign new admins' });
        }
        if (!convo.members.map(id => id.toString()).includes(memberId.toString())) {
            return res.status(404).json({ message: 'User is not a member of this group' });
        }
        if (!convo.admins.map(id => id.toString()).includes(memberId.toString())) {
            convo.admins.push(memberId);
        }
        await convo.save();
        const populated = await Conversation.findById(conversationId).populate('members', 'username email avatar phoneNumber')
            .populate('admins', 'username email avatar phoneNumber').lean();
        res.json({ message: 'User promoted to admin successfully', conversation: populated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const removeAdmin = async (req, res) => {
    try {
        const { conversationId, memberId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ message: 'Invalid IDs' });
        }
        const convo = await Conversation.findById(conversationId);
        if (!convo || !convo.isGroup) {
            return res.status(404).json({ message: 'Group not found' });
        }
        const isAdmin = convo.admins.map(id => id.toString()).includes(req.user._id.toString());
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admins can remove admin rights' });
        }
        if (!convo.admins.map(id => id.toString()).includes(memberId.toString())) {
            return res.status(404).json({ message: 'User is not an admin in this group' });
        }
        convo.admins = convo.admins.filter(id => id.toString() !== memberId.toString());
        if (convo.admins.length === 0 && convo.members.length > 0) {
            convo.admins.push(convo.members[0]);
        }
        await convo.save();
        const populated = await Conversation.findById(conversationId).populate('members', 'username email avatar phoneNumber')
            .populate('admins', 'username email avatar phoneNumber').lean();
        res.json({ message: 'Admin rights removed successfully', conversation: populated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const deleteConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        // Check if user is a member of the conversation
        if (!conversation.members.map(id => id.toString()).includes(userId.toString())) {
            return res.status(403).json({ message: "Not authorized to delete this conversation" });
        }

        // Delete all messages in that conversation
        await Message.deleteMany({ conversation: conversationId });

        // Delete the conversation itself
        await Conversation.findByIdAndDelete(conversationId);

        res.json({ message: "Conversation deleted successfully" });
    } catch (err) {
        console.error("Delete Conversation Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};
const updateGroup = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { name, avatar } = req.body;
        // avatar can be either a URL (from your upload API) or base64 string

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Update fields only if provided
        if (name) conversation.name = name;
        if (avatar) conversation.avatar = avatar;

        await conversation.save();

        res.status(200).json(conversation);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update group' });
    }
};
// const updateGroup = async (req, res) => {
//   try {
//     const { conversationId } = req.params;
//     const { name, avatar } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(conversationId)) {
//       return res.status(400).json({ message: "Invalid conversation Id" });
//     }

//     const updates = {};
//     if (name) updates.name = name;
//     if (avatar) updates.avatar = avatar;

//     if (Object.keys(updates).length === 0) {
//       return res.status(400).json({ message: "No valid fields to update" });
//     }

//     const conversation = await Conversation.findByIdAndUpdate(
//       conversationId,
//       { $set: updates },
//       { new: true, runValidators: true, context: "query" }
//     ).populate("participants", "_id username email avatar phoneNumber");

//     if (!conversation) {
//       return res.status(404).json({ message: "Conversation not found" });
//     }

//     res.json(conversation);
//   } catch (err) {
//     console.error("Update Group Error:", err);
//     res.status(500).json({ message: "Server Error" });
//   }
// };



module.exports = { createPrivateConversation, createGroupConversation, getUserConversations, addMembersToGroup, exitGroup, removeMemberFromGroup, makeAdmin, removeAdmin, deleteConversation, updateGroup };