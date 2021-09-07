const {
	createGameState,
	joinGameState,
	gameLoop,
	getNextObjectForLiveAuction,
	getRemainingTime,
	addNewFirstPricedSealedBid,
	getBidWinner,
	addNewEnglishAuctionBid,
} = require("./helpers/game");
const frameRate = 500;
const io = require("socket.io")(5000, {
	cors: {
		origin: "http://localhost:3000",
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
let bidWinner = {};

function updateLandingPageClock() {
	landingPageTimerStarted = true;
	const t = getRemainingTime(landingPageTimerDeadline);
	if (t.total <= 0) {
		landingPageTimerStarted = false;
		clearInterval(landingPageTimeInterval);
		io.emit("landingPageTimerEnded", t);
	} else if (landingPageTimerStarted && t.total > 0) {
		io.emit("landingPageTimerValue", t);
	}
}

async function updateAuctionClock() {
	isAuctionTimerStarted = true;
	bidWinner = {};
	const t = getRemainingTime(auctionsTimer);
	if (t.total <= 0) {
		isAuctionTimerStarted = false;
		clearInterval(auctionTimerInterval);
		console.log("currentAuction in t.total < 0", bidWinner);
		if (!bidWinner || !bidWinner.isWinnerCalculated) {
			bidWinner = getBidWinner(currentAuction);
			if (bidWinner) {
				io.emit("displayBidWinner", bidWinner);
				bidWinner = {};
			}
		} else {
			io.emit("displayBidWinner", null);
		}
	} else if (isAuctionTimerStarted && t.total > 0) {
		bidWinner = {};
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

	socket.on("startLiveAuctions", prevAuctionObj => {
		bidWinner = {};
		currentAuction = getNextObjectForLiveAuction(prevAuctionObj);
		socket.emit("startNextAuction", currentAuction);
	});

	socket.on("startLandingPageTimer", timerInMinutes => {
		if (!landingPageTimerStarted) {
			const currentTime = Date.parse(new Date());
			landingPageTimerDeadline = new Date(currentTime + 0.3 * 60 * 1000);
		}
		landingPageTimeInterval = setInterval(updateLandingPageClock, 1000);
	});

	socket.on("startAuctionsTimer", timerInMinutes => {
		if (!isAuctionTimerStarted) {
			const current = Date.parse(new Date());
			auctionsTimer = new Date(current + 0.5 * 60 * 1000);
		}
		auctionTimerInterval = setInterval(updateAuctionClock, 1000);
	});

	socket.on("addNewBid", bidInfo => {
		const { auctionType, player } = bidInfo;
		switch (auctionType) {
			case "1":
				addNewFirstPricedSealedBid(bidInfo);
				socket.emit("setLiveStyles", player.teamName);
				break;
			case "2":
				const prevBid = addNewEnglishAuctionBid(bidInfo);
				io.emit("setPreviousBid", prevBid);
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
