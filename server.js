const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const SocketStore = require('./utils/socketUtils');
const User = require('./models/User');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const { verifySocketToken } = require('./middleware/authentication');

dotenv.config();
const app = express();
const server = http.createServer(app);

const mongo_url = process.env.MONGO_URL;
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authenticationRoutes = require('./routes/authenticationRoute');
const userRoutes = require('./routes/usersRoute');
const convoRoutes = require('./routes/conversationsRoute');
const messageRoutes = require('./routes/messagesRoute');
const uploadRoutes = require('./routes/uploadRoute');
const errorHandler = require('./middleware/errorHandler');


app.use('/api/authentication', authenticationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', convoRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

app.use(errorHandler);

mongoose
   .connect(mongo_url)
   .then((conn) => {
      console.log(`MongoDB Connected ${conn.connection.host}`);
   })
   .catch((error) => {
      console.log('MongoDB Connection Failed', error.message);
   })


const io = new Server(server, {
   cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
   }
});

io.on('connection', (socket) => {
   console.log('Socket connected', socket.id);

   socket.on('setup', async (token) => {
      try {
         const user = await verifySocketToken(token);
         socket.userId = user._id.toString();
         SocketStore.add(socket.userId, socket.id);
         await User.findByIdAndUpdate(user._id, { online: true, socketId: socket.id });
         socket.join(socket.userId);
         socket.emit('connected', { userId: socket.userId });
         console.log(`User setup : userId=${socket.userId}, socketId=${socket.id}`);
      } catch (err) {
         console.log('Socket setup error', err.message);
         socket.emit('unauthorized');
         socket.disconnect(true);
      }
   });
   socket.on('joinConversation', async (conversationId) => {
      if (!conversationId || !socket.userId || !mongoose.Types.ObjectId.isValid(conversationId)) {
         return;
      }
      const convo = await Conversation.findById(conversationId);
      if (!convo || !convo.members.map(id => id.toString()).includes(socket.userId)) {
         return;
      }
      socket.join(conversationId);
      socket.to(conversationId).emit('userJoined', { userId: socket.userId });
   });
   socket.on('leaveConversation', (conversationId) => {
      if (!conversationId || !socket.userId) {
         return;
      }
      socket.leave(conversationId);
      socket.to(conversationId).emit('userLeft', { userId: socket.userId });
   });
   socket.on('typing', ({ conversationId, isTyping }) => {
      if (!conversationId || !socket.userId) {
         return;
      }
      socket.to(conversationId).emit('typing', { conversationId, userId: socket.userId, isTyping });
   });
   // socket.on('sendMessage', async (data, ack) => {
   //    try {
   //       if (!socket.userId) {
   //       throw new Error('Not authenticated');
   //       }
   //       const { conversationId,text,media , clientTempId} = data;
   //       if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
   //          throw new Error('Invalid conversation id');
   //       }
   //       const convo = await Conversation.findById(conversationId);
   //       if (!convo || !convo.members.map(m =>m.toString()).includes(socket.userId)) {
   //          throw new Error('Not a member of this conversation');
   //       }
   //       const msg = new Message({
   //          conversation : conversationId,
   //          sender : socket.userId,
   //          text : text || '',
   //          media : media || []
   //       })
   //       console.log("new msg",msg)
   //       await msg.save();
   //       convo.lastMessage = msg._id;
   //       console.log("lastmsg",convo)
   //       await convo.save();

   //       const populated = await Message.findById(msg._id).populate('sender', 'username avatar');
   //       io.to(conversationId).emit('message',{ ...populated.toObject(), clientTempId });
   //       // Notify other members in the conversation 

   //       const otherMembers = convo.members.filter(id => id.toString() !== socket.userId);
   //       otherMembers.forEach(memberId => {
   //          const sockets = SocketStore.getSockets(memberId.toString()) || [];
   //          sockets.forEach(sid => {
   //             io.to(sid).emit('newMessageNotification', { conversationId, message : populated });
   //          });
   //       });
   //       if(ack){
   //          console.log("ack",populated)
   //          ack({ status : 'ok',message : populated });
   //       }
   //    } catch (err) {
   //       console.error('sendMessage error : ',err.message);
   //       if(ack){
   //          ack({ status : 'error',message : err.message });
   //       }
   //    }
   // });
   socket.on('sendMessage', async (data, ack) => {
      try {
         if (!socket.userId) {
            throw new Error('Not authenticated');
         }
         console.log("data", data)
         const { conversationId, text, media, clientTempId } = data;

         if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
            throw new Error('Invalid conversation id');
         }

         const convo = await Conversation.findById(conversationId);
         if (!convo || !convo.members.map(m => m.toString()).includes(socket.userId)) {
            throw new Error('Not a member of this conversation');
         }

         // Create new message
         const msg = new Message({
            conversation: conversationId,
            sender: socket.userId,
            text: text || '',
            media: media || []
         });

         await msg.save();

         // Update lastMessage in conversation
         convo.lastMessage = msg._id;
         await convo.save();

         // Populate sender details for the new message
         const populatedMsg = await Message.findById(msg._id)
            .populate('sender', 'username avatar online');

         // Also populate lastMessage for chatlist update
         const populatedConvo = await Conversation.findById(conversationId)
            .populate({
               path: 'lastMessage',
               populate: { path: 'sender', select: 'username avatar online' } // 👈 nested populate
            })
            .populate('members', 'username avatar online'); // Optional if you need members in chatlist

         // Emit message to the conversation room
         io.to(conversationId).emit('message', { ...populatedMsg.toObject(), clientTempId });

         // Emit chatlist update with latest lastMessage
         io.to(conversationId).emit('conversationUpdated', populatedConvo);

         // Notify other members
         const otherMembers = convo.members.filter(id => id.toString() !== socket.userId);
         otherMembers.forEach(memberId => {
            const sockets = SocketStore.getSockets(memberId.toString()) || [];
            sockets.forEach(sid => {
               io.to(sid).emit('newMessageNotification', {
                  conversationId,
                  message: populatedMsg,
                  lastMessage: populatedConvo.lastMessage
               });
            });
         });

         if (ack) {
            console.log('ack', { message: populatedMsg, lastMessage: populatedConvo.lastMessage })
            ack({ status: 'ok', message: populatedMsg, lastMessage: populatedConvo.lastMessage });
         }

      } catch (err) {
         console.error('sendMessage error:', err.message);
         if (ack) {
            ack({ status: 'error', message: err.message });
         }
      }
   });

   socket.on('exitGroup', ({ conversationId, userId }) => {
      if (!conversationId || !userId || !mongoose.Types.ObjectId.isValid(conversationId)) {
         return;
      }
      io.to(conversationId).emit('memberExited', { conversationId, userId });
      socket.leave(conversationId);
   });
   socket.on('removeMemberFromGroup', ({ conversationId, memberId }) => {
      if (!conversationId || !memberId) {
         return;
      }
      io.to(conversationId).emit('memberRemoved', { conversationId, memberId });
      const sockets = SocketStore.getSockets(memberId.toString()) || [];
      sockets.forEach(sid => {
         io.sockets.sockets.get(sid)?.leave(conversationId);
      });
   });

   socket.on('disconnect', async () => {
      try {
         if (socket.userId) {
            SocketStore.remove(socket.userId, socket.id);
            const remaining = SocketStore.getSockets(socket.userId);
            if (remaining.length == 0) {
               await User.findByIdAndUpdate(socket.userId, { online: false, socketId: null });
            }
         }
         console.log('Socket disconnected : ', socket.id);
      } catch (err) {
         console.error('Disconnect error : ', err.message);
      }
   })
})

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
   console.log(`Server is Running on ${PORT}`);
})