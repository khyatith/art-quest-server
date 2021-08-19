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
	socket.on("joinRoom", client => {
		client = JSON.parse(client);
    joinGameState(socket, client);
    console.log('rooms', rooms);
    rooms.forEach(room => {
			room.players.forEach(player => {
				if (player.playerId === client.hostCode) {
					sendLandingPageGameState(player, room, socket);
				}
			});
		});
  });

	//start a game event
	socket.on("startGame", clientId => {
		rooms.forEach(room => {
			room.players.forEach(player => {
				if (player.playerId === clientId) {
					startGameInterval(clientId, room, socket);
				}
			});
		});
	});
});

function sendLandingPageGameState(client, room, socket) {
  socket.emit("gameState", JSON.stringify(room));
}

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
