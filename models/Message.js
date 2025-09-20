const mongoose = require('mongoose');

const mediaSchema = mongoose.Schema({
    url : String,
    filename : String,
    mimeType : String,
    size : Number
}, { _id : false });

const messageSchema = mongoose.Schema({
    conversation : { type : mongoose.Schema.Types.ObjectId, ref : 'Conversation', required : true },
    sender : { type : mongoose.Schema.Types.ObjectId ,ref : 'User', required : true },
    text : { type : String },
    media : [mediaSchema],
    deliveredTo : [{ type : mongoose.Schema.Types.ObjectId, ref : 'User' }],
    readBy : [{ type : mongoose.Schema.Types.ObjectId, ref : 'User' }]
},{ timestamps : true });

module.exports = mongoose.model('Message',messageSchema);