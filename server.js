const { createGameState, joinGameState, gameLoop, getNextObjectForLiveAuction, getRemainingTime } = require("./game");
const frameRate = 500;
const io = require("socket.io")(5000, {
	cors: {
		origin: "http://localhost:3000",
	},
});
require("dotenv").config();

const currentTime = Date.parse(new Date());
// 10 mins landing page timer
const landingPageTimerDeadline = new Date(currentTime + 10*60*1000);
let landingPageTimeInterval;

function updateLandingPageClock() {
	const t = getRemainingTime(landingPageTimerDeadline);
  
	if (t.total <= 0) {
	  clearInterval(landingPageTimeInterval);
	} else {
	  io.emit("timerValue", t);
	}
  }

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
		client = JSON.parse(client);
		rooms.forEach(room => {
			room.players.forEach(player => {
				if (player.playerId === client.playerId) {
					startGameInterval(client.playerId, room, socket);
				}
			});
		});
  });
  
  socket.on("startLiveAuctions", () => {
    const nextAuctionObj = getNextObjectForLiveAuction();
    socket.emit("startNextAuction", nextAuctionObj);
  });

  socket.on("startLandingPageTimer", timeInMinutes => {
    landingPageTimeInterval = setInterval(updateLandingPageClock, 1000);
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
