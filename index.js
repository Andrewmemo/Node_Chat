const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

mongoose
  .connect(
    "mongodb://mix-sumdu:sayonara2020@ds031895.mlab.com:31895/heroku_241kfctg",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connected to MongoDB"));

const messageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 15,
  },
  text: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 635,
  },
  messageType: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 255,
  },
});

let Message;

const router = require("./router");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on("connect", (socket) => {
  socket.on("join", async ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    Message = mongoose.model(`${user.room}`, messageSchema);

    const messages = await Message.find();

    io.sockets.emit("display-chat", messages);

    if (error) return callback(error);

    socket.join(user.room);

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", async ({ message, messageType }, callback) => {
    const user = getUser(socket.id);

    serverMesage = new Message({
      name: user.name,
      text: message,
      messageType: messageType,
    });

    await serverMesage.save();

    io.to(user.room).emit("message", {
      user: user.name,
      text: message,
      type: messageType,
    });
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendFile", async ({ fileName, messageType }, callback) => {
    const user = getUser(socket.id);

    serverFileMesage = new Message({
      name: user.name,
      text: fileName,
      messageType: messageType,
    });

    await serverFileMesage.save();

    io.to(user.room).emit("file", {
      user: user.name,
      text: fileName,
      type: messageType,
    });

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(process.env.PORT || 5000, () =>
  console.log(`Server has started.`)
);
