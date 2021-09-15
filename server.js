const {
	createGameState,
	joinGameState,
	gameLoop,
	getNextObjectForLiveAuction,
	getRemainingTime,
	addNewFirstPricedSealedBid,
	getBidWinner,
	addNewEnglishAuctionBid,
	getUpdatedLeaderBoard,
} = require("./helpers/game");
const frameRate = 500;
const io = require("socket.io")(5000, {
	cors: {
		origin: "http://localhost:3000",
	},
});
require("dotenv").config();

let currentAuction = {};
let updatedLeaderBoard = [];

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
		updatedLeaderBoard = getUpdatedLeaderBoard(prevAuctionObj.client);
		socket.emit("startNextAuction", currentAuction);
		socket.emit("updatedLeaderBoard", updatedLeaderBoard);
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
			//auctionsTimer = new Date(current + timerInMinutes.auctionType * 60 * 1000);
			auctionsTimer = new Date(current + 60 * 1000 * 0.5);
		}
		auctionTimerInterval = setInterval(async function updateAuctionClock() {
			isAuctionTimerStarted = true;
			let bidWinner = {};
			const t = getRemainingTime(auctionsTimer);
			if (t.total <= 0) {
				isAuctionTimerStarted = false;
				clearInterval(auctionTimerInterval);
				rooms.forEach(room => {
					if (room.roomCode === timerInMinutes.client.hostCode) {
						room.auctions.artifacts.forEach(auction => {
							if (auction.id === currentAuction.id) {
								bidWinner = auction;
								auction.auctionState = 2;

								db.collection("rooms").doc(room.roomCode).set(room, { merge: true });
							}
						});
					}
				});
				if (bidWinner) {
					//send and save bid winner
					io.emit("displayBidWinner", bidWinner);
				}
			} else if (isAuctionTimerStarted && t.total > 0) {
				io.emit("auctionTimerValue", t);
			}
		}, 1000);
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

	socket.on("setTeams", teams => {
		rooms.forEach(room => {
			if (room.roomCode === teams.client.hostCode) {
				room.leaderBoard.splice(teams.teams, 10 - teams.teams);
				db.collection("rooms").doc(room.roomCode).set(room, { merge: true });
			}
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
