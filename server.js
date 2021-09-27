const {
	createGameState,
	joinGameState,
	gameLoop,
	getNextObjectForLiveAuction,
	getRemainingTime,
  getLeaderboard,
  calculateTotalAmountSpent,
} = require("./helpers/game");

const socketIO = require("socket.io");
const frameRate = 500;
var express = require('express'),
  app = express(),
  server = require('http').createServer(app);

const io = socketIO(server, {
	cors: {
		origin: ["*"],
		credentials: true
	},
});

require("dotenv").config();

let currentAuction = {};

const firebaseMod = require("./firebase/firebase");
const db = firebaseMod.db;

// 10 mins landing page timer
let landingPageTimerDeadline;
let landingPageTimeInterval;
let landingPageTimerStarted = false;

let auctionsTimer;
let isAuctionTimerStarted = false;
let auctionTimerInterval;

var mod = require("./constants");

var rooms = mod.rooms;

function updateLandingPageClock(roomCode, timerInMinutes) {
	landingPageTimerStarted = true;
	const t = getRemainingTime(landingPageTimerDeadline);
	if (t.total <= 0) {
		landingPageTimerStarted = false;
    clearInterval(landingPageTimeInterval);
		io.sockets.in(roomCode).emit("landingPageTimerEnded", { roomCode, timerValue: t });
	} else if (landingPageTimerStarted && t.total > 0) {
		io.sockets.in(roomCode).emit("landingPageTimerValue", { roomCode, timerValue: t });
	}
}

function updateAuctionClock(player) {
	isAuctionTimerStarted = true;
	const t = getRemainingTime(auctionsTimer);
	if (t.total <= 0) {
		isAuctionTimerStarted = false;
    clearInterval(auctionTimerInterval);
		io.to(player.hostCode).emit("auctionPageTimerEnded", t);
	}  else if (isAuctionTimerStarted && t.total > 0) {
		io.to(player.hostCode).emit("auctionTimerValue", t);
	}
}

io.on("connection", socket => {

	io.of("/").adapter.on("create-room", (room) => {
		console.log(`room ${room} was created`);
	});
	//create a game room event
	socket.on("createRoom", player => {
    player = JSON.parse(player);
		socket.join(player.hostCode);
		createGameState(socket, player);
	});

	//join a game room event
	socket.on("joinRoom", player => {
		player = JSON.parse(player);
		socket.join(player.hostCode);
		const playerJoined = joinGameState(socket, player);
		if (!playerJoined) {
			console.log('player counldnt join');
		}
	});

	//start a game event
	socket.on("startGame", async(client) => {
		client = JSON.parse(client);
		io.to(client.hostCode).emit("gameState", JSON.stringify(rooms[client.hostCode]));
	});

	socket.on("startLiveAuctions", prevAuctionObj => {
    currentAuction = getNextObjectForLiveAuction(prevAuctionObj);
    socket.emit("startNextAuction", currentAuction);
	});

	socket.on("startLandingPageTimer", ({ roomCode, timerInMinutes }) => {
		if (!landingPageTimerStarted) {
			const currentTime = Date.parse(new Date());
			landingPageTimerDeadline = new Date(currentTime + 0.3 * 60 * 1000);
		}
		landingPageTimeInterval = setInterval(() => updateLandingPageClock(roomCode, timerInMinutes), 1000);
	});

	socket.on("startAuctionsTimer", (player) => {
		if (!isAuctionTimerStarted) {
			const current = Date.parse(new Date());
			auctionsTimer = new Date(current + 0.5 * 60 * 1000);
		}
		auctionTimerInterval = setInterval(() => updateAuctionClock(player), 1000);
	});

	socket.on("addNewBid", (bidInfo) => {
    const { auctionType, player, auctionId } = bidInfo;
		switch (auctionType) {
			case "1":
        const allFirstPricedSealedBids = rooms[player.hostCode].firstPricedSealedBids;
        const fpsbObj = Object.keys(allFirstPricedSealedBids);
        if (fpsbObj.includes(`${auctionId}`)) {
          rooms[player.hostCode].firstPricedSealedBids[`${auctionId}`].push(bidInfo);
        } else {
          rooms[player.hostCode].firstPricedSealedBids[`${auctionId}`] = [bidInfo];
        }
				socket.emit("setLiveStyles", player.teamName);
				break;
			case "2":
        rooms[player.hostCode].englishAuctionBids[`${auctionId}`] = bidInfo;
				io.sockets.in(player.hostCode).emit("setPreviousBid", bidInfo);
        break;
      case "3":
        const allSecondPricedSealedBids = rooms[player.hostCode].secondPricedSealedBids;
        const spsbObj = Object.keys(allSecondPricedSealedBids);
        if (spsbObj.includes(`${auctionId}`)) {
          rooms[player.hostCode].secondPricedSealedBids[`${auctionId}`].push(bidInfo);
        } else {
          rooms[player.hostCode].secondPricedSealedBids[`${auctionId}`] = [bidInfo];
        }
				socket.emit("setLiveStyles", player.teamName);
        break;
      case "4":
        const allPayAuctionBids = rooms[player.hostCode].allPayAuctions;
        const allPayObj = Object.keys(allPayAuctionBids);
        if (allPayObj.includes(`${auctionId}`)) {
          rooms[player.hostCode].allPayAuctions[`${auctionId}`].push(bidInfo);
        } else {
          rooms[player.hostCode].allPayAuctions[`${auctionId}`] = [bidInfo];
        }
        socket.emit("setLiveStyles", player.teamName);
      break;
			default:
				return;
		}
  });
});

//leaderboard namespace

const leaderboardns = io.of("/leaderboard-namespace");

leaderboardns.use((socket, next) => {
  next();
});

leaderboardns.on("connection", socket => {
  socket.on("getLeaderBoard", async (player) => {
    socket.join(player.hostCode);
    const leaderboard = await getLeaderboard(player.hostCode);
    rooms[player.hostCode].leaderBoard = leaderboard;
    const totalAmountByTeam = await calculateTotalAmountSpent(leaderboard, player.hostCode);
    rooms[player.hostCode].totalAmountSpentByTeam = totalAmountByTeam;
    leaderboardns.to(player.hostCode).emit("leaderboard", { leaderboard, totalAmountByTeam});
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

server.listen(process.env.PORT || 3001);
