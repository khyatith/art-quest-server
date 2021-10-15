const socketio = require("socket.io");
const frameRate = 500;
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const routes = require('./routes/index');

//HTTP connection
app.use('/landing-page', routes);

//Socket IO connection
const io = socketio(server, {
	cors: {
		origin: '*'
	}
});

const socketMain = require('./events/socketMain');
const auctionEvents = require('./events/auctionEvents');
const leaderboard = require('./events/leaderboard');
var mod = require("./constants");
let rooms = mod.rooms;

const port = process.env.PORT || 3001;

const onConnection = (socket) => {
	socketMain(io, socket, rooms);
	auctionEvents(io,socket, rooms);
}

io.on("connection", onConnection);

const leaderboardns = io.of("/leaderboard-namespace");

leaderboardns.on("connection", (socket) => {
	leaderboard(leaderboardns, socket, rooms);
});

server.listen(port);