const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username : { type : String, required : true, trim : true },
    phoneNumber: { type: String, required: true, unique: true }, 
    email : { type : String, required : true , lowercase : true, trim : true },
    password : { type : String, required : true },
    avatar : { type : String },
    online : { type : Boolean, default : false },
    aboutme:{type:String,default :"Hey there! I am using WhatsApp."},
    socketId : { type : String, default : null }
}, { timestamps : true });

module.exports = mongoose.model('User',userSchema);