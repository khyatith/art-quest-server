var CONSTANTS = require("../constants");
var rooms = CONSTANTS.rooms;
var auctionsObj = require("../auctionData.json");
var { FirstPricedSealedBidAuction } = require("../auctions/FirstPricedSealedBidAuction");

const Redis = require("redis");
// const redisClient = Redis.createClient();

const expiration = 3600;

const firebaseMod = require("../firebase/firebase");

const db = firebaseMod.db;

function createGameState(socket, player) {
	try {
		let playerObj = {
			socketId: socket.id,
			playerId: player.playerId,
			playerName: player.playerName,
			teamName: player.teamName,
			gold: 1000000,
			inventory: [],
			playerCoordinates: {
				longitude: 0,
				latitude: 0,
			},
		};
		let time = new Date().getTime();
		let gameClockObj = {
			timerState: true,
			timeStamp: time,
		};

		rooms.push({
			roomCode: player.playerId,
			players: [playerObj],
			auctions: auctionsObj,
			gameClock: gameClockObj,
		});

		//add room to database
		db.collection("rooms").doc(player.playerId).set({
			roomCode: player.playerId,
			gameClock: gameClockObj,
			auctions: auctionsObj,
		});

		db.collection("rooms").doc(player.playerId).collection("players").doc(player.playerId).set(playerObj);

		//redis
		//redisClient.setex("rooms", expiration, JSON.stringify(rooms));
	} catch (err) {
		console.log(err);
	}
}

function joinGameState(socket, player) {
	try {
		db.collection("rooms")
			.doc(player.hostCode)
			.collection("players")
			.where("playerId", "==", player.playerId)
			.onSnapshot(snapshot => {
				if (snapshot.empty) {
					console.log("no player found");
					let playerObj = {
						socketId: socket.id,
						playerId: player.playerId,
						playerName: player.playerName,
						teamName: player.teamName,
						gold: 1000000,
						inventory: [],
						playerCoordinates: {
							longitude: 0,
							latitude: 0,
						},
					};

					rooms.forEach(room => {
						if (room.roomCode === player.hostCode) {
							room.players.push(playerObj);
							db.collection("rooms").doc(player.hostCode).collection("players").doc(player.playerId).set(playerObj);
						} else {
							console.log("not found");
						}
					});
					//redis
					//redisClient.setex("rooms", expiration, JSON.stringify(rooms));
				} else {
					console.log("player already exists");
				}
			});
	} catch (err) {
		console.log(err);
	}
}

function gameLoop(state) {
	if (!state) {
		return;
	}
}

function getNextObjectForLiveAuction() {
	const obj = auctionsObj.artifacts.filter(auctionObj => {
		if (auctionObj.auctionState === 1) {
			console.log("the one auction obj in progress", auctionObj);
			return auctionObj;
		}
		return auctionObj.auctionState === 0;
	});
	if (!obj || obj.length === 0) return null;
	//auctionState can be one of 'todo','in-progress', 'done' which can be denoted by 0, 1 and 2
	obj[0].auctionState = 1;
	return obj[0];
}

function updateAuctionState(currentAuction, newState) {
	console.log("auctionObj", currentAuction);
	if (CONSTANTS.AUCTION_STATES.includes(newState)) {
		auctionsObj.artifacts.map(currentObj => {
			if (currentObj.id === currentAuction.id) {
				currentObj.auctionState = newState;
				currentAuction.auctionState = newState;
			}
		});
	}
	return currentAuction;
}

function getRemainingTime(deadline) {
	const total = Date.parse(deadline) - Date.parse(new Date());
	const seconds = Math.floor((total / 1000) % 60);
	const minutes = Math.floor((total / 1000 / 60) % 60);
	return {
		total,
		minutes,
		seconds,
	};
}

function getBidWinner(allBidsInfo) {
	console.log("inside get bid winner");
	const { currentAuctionType } = allBidsInfo;
	const service = AUCTION_TYPES[currentAuctionType];
	console.log("service", service);
}

function addNewFirstPricedSealedBid(bidInfo, socket) {
	const { auctionObj, bidAt, bidAmount, player } = bidInfo;
	const firstPriceSealedBidObj = new FirstPricedSealedBidAuction(auctionObj, "blue", bidAmount, bidAt);
	const updatedObj = firstPriceSealedBidObj.updateBidObject();
	console.log("udpatedObj", updatedObj);
	socket.emit("setLiveStyles", player.teamName);
	return updatedObj;
}

function getBidWinner(auctionObj) {
	const { auctionType } = auctionObj;
	switch (auctionType) {
		case "1":
			const firstPricedSealedBidObj = new FirstPricedSealedBidAuction();
			const winner = firstPricedSealedBidObj.calculateWinner();
			console.log("winner", winner);
			return winner;
		default:
			return;
	}
}

module.exports = {
	createGameState,
	gameLoop,
	joinGameState,
	getNextObjectForLiveAuction,
	getRemainingTime,
	updateAuctionState,
	getBidWinner,
	addNewFirstPricedSealedBid,
};
