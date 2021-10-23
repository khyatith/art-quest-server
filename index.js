const socketio = require("socket.io");
const frameRate = 500;
var cors = require('cors')
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const routes = require('./routes/index');

app.use(cors());

//HTTP connection
app.use('/buying', routes);

//Socket IO connection
const io = socketio(server, {
	cors: {
		origin: '*'
	}
});

const socketMain = require('./events/socketMain');
const auctionEvents = require('./events/auctionEvents');
var mod = require("./constants");
let rooms = mod.rooms;

const port = process.env.PORT || 3001;

const onConnection = (socket) => {
	socketMain(io, socket, rooms);
	auctionEvents(io,socket, rooms);
}

io.on("connection", onConnection);

server.listen(port);