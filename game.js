var mod = require("./constants");
var rooms = mod.rooms;
var auctionsObj = require("./auctionData.json");

const Redis = require("redis");
// const redisClient = Redis.createClient();

const expiration = 3600;

const firebaseMod = require("./firebase/firebase");
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
		console.log("auctionObj", auctionObj);
		return !auctionObj.isAuctioned;
	});
	if (!obj) return null;
	obj[0].isAuctioned = true;
	return obj[0];
}

function getRemainingTime(deadline) {
	const total = Date.parse(deadline) - Date.parse(new Date());
	const seconds = Math.floor( (total/1000) % 60 );
	const minutes = Math.floor( (total/1000/60) % 60 );
	return {
	  total,
	  minutes,
	  seconds
	};
  }

module.exports = {
	createGameState,
	gameLoop,
	joinGameState,
	getNextObjectForLiveAuction,
	getRemainingTime,
};
