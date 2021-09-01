const {
	createGameState,
	joinGameState,
	gameLoop,
	getNextObjectForLiveAuction,
	getRemainingTime,
	updateAuctionState,
	addNewFirstPricedSealedBid,
	getBidWinner,
} = require("./helpers/game");
const frameRate = 500;
const io = require("socket.io")(5000, {
	cors: {
		origin: "http://localhost:3000",
	},
});
require("dotenv").config();

let currentAuction = {};

// 10 mins landing page timer
let landingPageTimerDeadline;
let landingPageTimeInterval;
let landingPageTimerStarted = false;

let auctionsTimer;
let isAuctionTimerStarted = false;
let auctionTimerInterval;

function updateLandingPageClock() {
	landingPageTimerStarted = true;
	const t = getRemainingTime(landingPageTimerDeadline);
	if (t.total <= 0) {
		landingPageTimerStarted = false;
		clearInterval(landingPageTimeInterval);
	} else if (landingPageTimerStarted && t.total > 0) {
		io.emit("landingPageTimerValue", t);
	}
}

async function updateAuctionClock() {
	isAuctionTimerStarted = true;
	const t = getRemainingTime(auctionsTimer);
	if (t.total <= 0) {
		isAuctionTimerStarted = false;
		clearInterval(auctionTimerInterval);
		const bidWinner = getBidWinner(currentAuction);
		if (bidWinner) {
			currentAuction = updateAuctionState(currentAuction, 2);
			io.emit("displayBidWinner", bidWinner);
		}
	} else if (isAuctionTimerStarted && t.total > 0) {
		io.emit("auctionTimerValue", t);
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
					console.log("start");
					startGameInterval(client.playerId, room, socket);
				}
			});
		});
	});

	socket.on("startLiveAuctions", () => {
		console.log("inside start live auctions");
		if (!currentAuction || currentAuction.auctionState !== 1) {
			console.log("inside current auction");
			currentAuction = getNextObjectForLiveAuction();
		}
		socket.emit("startNextAuction", currentAuction);
	});

	socket.on("startLandingPageTimer", timerInMinutes => {
		if (!landingPageTimerStarted) {
			const currentTime = Date.parse(new Date());
			landingPageTimerDeadline = new Date(currentTime + 1 * 60 * 1000);
		}
		landingPageTimeInterval = setInterval(updateLandingPageClock, 1000);
	});

	socket.on("startAuctionsTimer", timerInMinutes => {
		if (!isAuctionTimerStarted) {
			const current = Date.parse(new Date());
			auctionsTimer = new Date(current + timerInMinutes * 60 * 1000);
		}
		auctionTimerInterval = setInterval(updateAuctionClock, 1000);
	});

	socket.on("addNewBid", bidInfo => {
		const { auctionType } = bidInfo;
		switch (auctionType) {
			case "1":
				addNewFirstPricedSealedBid(bidInfo, socket);
				break;
			default:
				return;
		}
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
