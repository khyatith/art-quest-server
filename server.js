const { createGameState, joinGameState, gameLoop } = require("./game");
const frameRate = 30;
const io = require("socket.io")(5000, {
	cors: {
		origin: "http://localhost:3000",
	},
});
require("dotenv").config();

var mod = require("./constants");
var rooms = mod.rooms;

io.on("connection", socket => {
	//create a game room event
	socket.on("createRoom", player => {
		player = JSON.parse(player);
		createGameState(socket, player);
	});

	//join a game room event
	socket.on("joinRoom", player => {
		player = JSON.parse(player);
		joinGameState(socket, player);
	});

	//start a game event
	socket.on("startGame", client => {
		rooms.forEach(room => {
			room.players.forEach(player => {
				if (player.playerId === client) {
					startGameInterval(client, room, socket);
				}
			});
		});
	});
});

function startGameInterval(client, room, socket) {
	const intervalId = setInterval(() => {
		const winner = gameLoop(room);

		if (!winner) {
			socket.emit("gameState", JSON.stringify(room));
		} else {
			socket.emit("gameOver");
			clearInterval(intervalId);
		}
	}, 1000 / frameRate);
}
