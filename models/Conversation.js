const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    name : { type : String },
    isGroup : { type : Boolean, default : false },
    members : [ { type : mongoose.Schema.Types.ObjectId,ref : 'User', required : true }],
    admins : [ { type : mongoose.Schema.Types.ObjectId, ref : 'User' }],
    avatar : { type : String },
    lastMessage : { type : mongoose.Schema.Types.ObjectId , ref : 'Message' }
}, {timestamps : true });

module.exports = mongoose.model('Conversation',conversationSchema);