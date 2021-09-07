var CONSTANTS = require("../constants");
var rooms = CONSTANTS.rooms;
var auctionsObj = require("../auctionData.json");
var { FirstPricedSealedBidAuction } = require("../auctions/FirstPricedSealedBidAuction");
var { EnglishAuction } = require("../auctions/EnglishAuction");

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

function getNextObjectForLiveAuction(prevAuction) {
	let newAuction;
	if (!prevAuction.auctions) {
		newAuction = auctionsObj.artifacts[0];
	} else {
		const { id } = prevAuction.auctions;
		const nextId = id + 1;
		newAuction = auctionsObj.artifacts.filter(item => item.id === nextId)[0];
		prevAuction.auctionState = 2;
	}
	if (!newAuction) return null;
	newAuction.auctionState = 1;
	return newAuction;
}

function updateAuctionState(currentAuction, newState) {
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

function addNewFirstPricedSealedBid(bidInfo) {
	const { auctionObj, bidAt, bidAmount, player } = bidInfo;
	//const firstPriceSealedBidObj = new FirstPricedSealedBidAuction(auctionObj, "blue", bidAmount, bidAt);
	rooms.forEach(room => {
		if (room.roomCode === player.hostCode) {
			room.auctions.artifacts.forEach(auction => {
				if (auction.id === auctionObj.id) {
					if (auction.bid.currentBid === 0) {
						auction.bid.currentBid = bidAmount;
						auction.bid.biddingteam = player.teamName;
					} else if (auction.bid.currentBid < bidAmount) {
						auction.bid.currentBid = bidAmount;
						auction.bid.biddingteam = player.teamName;
					}
				}
			});
		}
	});
	//const updatedObj = firstPriceSealedBidObj.updateBidObject();
	//return updatedObj;
}

function addNewEnglishAuctionBid(bidInfo) {
	const { auctionObj, bidAt, bidAmount, player } = bidInfo;
	const englishAuctionObj = new EnglishAuction(auctionObj, "blue", bidAmount, bidAt);
	const updatedObj = englishAuctionObj.updateBidObject();
	return updatedObj;
}

function getBidWinner(auctionObj) {
	const { auctionType } = auctionObj;
	let winner;
	switch (auctionType) {
		case "1":
			if (!isWinnerCalculated) {
				const firstPricedSealedBidObj = new FirstPricedSealedBidAuction();
				winner = firstPricedSealedBidObj.calculateWinner();
				return winner;
			}
			return {};
		case "2":
			const englishAuctionObj = new EnglishAuction();
			winner = englishAuctionObj.calculateWinner();
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
	addNewEnglishAuctionBid,
};
