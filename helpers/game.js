var CONSTANTS = require("../constants");
var rooms = CONSTANTS.rooms;
var boardArray = CONSTANTS.boardArray;
var auctionsObj = require("../auctionData.json");
var { FirstPricedSealedBidAuction } = require("../auctions/FirstPricedSealedBidAuction");
var { EnglishAuction } = require("../auctions/EnglishAuction");

const Redis = require("redis");
// const redisClient = Redis.createClient();

const expiration = 3600;
var found = 0;

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

		rooms[player.hostCode] = {
			roomCode: player.playerId,
			players: [playerObj],
			auctions: auctionsObj,
			leaderBoard: {},
			englishAuctionBids: {},
			firstPricedSealedBids: {}
		};

		//add room to database
		// db.collection("rooms").doc(player.playerId).set({
		// 	roomCode: player.playerId,
		// 	gameClock: gameClockObj,
		// 	auctions: auctionsObj,
		// });

		// db.collection("rooms").doc(player.playerId).collection("players").doc(player.playerId).set(playerObj);

		//redis
		//redisClient.setex("rooms", expiration, JSON.stringify(rooms));
	} catch (err) {
		console.log(err);
	}
}

function joinGameState(socket, player) {
	if (!player || !player.hostCode) return null;
	const hostCode = player.hostCode;
	rooms[hostCode].players.push(player);
}

function getLeaderboard(roomCode) {
	const leaderboard = rooms[roomCode].leaderBoard;
	const currentRoom = rooms[roomCode];
  const englishAuctionsObj = currentRoom.englishAuctionBids;;
  const firstPricedSealedBidAuctionsObj = currentRoom.firstPricedSealedBids;
	//englishAuctions
	if (englishAuctionsObj) {
		for (var englishAuction in englishAuctionsObj) {
			const leaderBoardKeys = Object.keys(leaderboard);
      const auctionItem = englishAuctionsObj[englishAuction];
      const EAwinningTeam = auctionItem.bidTeam;
			if (leaderBoardKeys && leaderBoardKeys.includes(EAwinningTeam)) {
        const isExistingAuction = leaderboard[EAwinningTeam].filter(item => item.auctionObj.id === auctionItem.auctionId)[0];
        if (!isExistingAuction) {
          leaderboard[`${EAwinningTeam}`].push(auctionItem);
        }
      } else {
        leaderboard[`${EAwinningTeam}`] = [auctionItem];
      }
		}
  }
  
  //firstPricedSealedBidAuctions
  if (firstPricedSealedBidAuctionsObj) {
    for (var fristPricedSealedAuction in firstPricedSealedBidAuctionsObj) {
      const leaderBoardFSBKeys = Object.keys(leaderboard);
      const FPSBItem = firstPricedSealedBidAuctionsObj[fristPricedSealedAuction];
      const FPSBwinner = FPSBItem.reduce((acc, obj) => {
        if (acc.bidAmount === obj.bidAmount) {
          if (acc.bidAt < obj.bidAt) {
            return acc;
          } else {
            return obj;
          }
        }
        return (acc.bidAmount > obj.bidAmount) ? acc : obj;
      }, {});
      const FPSBwinningteam = FPSBwinner.bidTeam;
      if (leaderBoardFSBKeys && leaderBoardFSBKeys.includes(FPSBwinningteam)) {
        const isExistingFPSBAuction = leaderboard[FPSBwinningteam].filter(item => item.auctionObj.id === FPSBwinner.auctionId)[0];
        if (!isExistingFPSBAuction) {
          leaderboard[`${FPSBwinningteam}`].push(FPSBwinner);
        }
      } else {
        leaderboard[`${FPSBwinningteam}`] = [FPSBwinner];
      }
    }
  }

  return leaderboard;
}

// function joinGameState(socket, player) {
// 	try {
// 		db.collection("rooms")
// 			.doc(player.hostCode)
// 			.collection("players")
// 			.where("playerId", "==", player.playerId)
// 			.onSnapshot(snapshot => {
// 				if (snapshot.empty) {
// 					console.log("no player found");
// 					let playerObj = {
// 						socketId: socket.id,
// 						playerId: player.playerId,
// 						playerName: player.playerName,
// 						teamName: player.teamName,
// 						gold: 1000000,
// 						inventory: [],
// 						playerCoordinates: {
// 							longitude: 0,
// 							latitude: 0,
// 						},
// 					};

// 					rooms.forEach(room => {
// 						if (room.roomCode === player.hostCode) {
// 							room.players.push(playerObj);
// 							db.collection("rooms").doc(player.hostCode).collection("players").doc(player.playerId).set(playerObj);
// 						} else {
// 							console.log("not found");
// 						}
// 					});
// 					//redis
// 					//redisClient.setex("rooms", expiration, JSON.stringify(rooms));
// 				} else {
// 					console.log("player already exists");
// 				}
// 			});
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

function gameLoop(state) {
	if (!state) {
		return;
	}
}

function getNextObjectForLiveAuction(prevAuction) {
	let newAuction;
	const { currentAuctionObj, client } = prevAuction;
	if (!currentAuctionObj) {
		newAuction = rooms[client.hostCode].auctions.artifacts[0];
	} else {
		const { id } = prevAuction.currentAuctionObj;
		const nextId = id + 1;
		newAuction = rooms[client.hostCode].auctions.artifacts.filter(item => item.id === nextId)[0];
		rooms[client.hostCode].auctions.artifacts.forEach(item => {
			if (item.id === currentAuctionObj.id) {
				item.auctionState = 2;
			}
		});
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

// function addNewFirstPricedSealedBid(bidInfo) {
// 	const { auctionObj, bidAt, bidAmount, player } = bidInfo;
// 	//const firstPriceSealedBidObj = new FirstPricedSealedBidAuction(auctionObj, "blue", bidAmount, bidAt);
// 	rooms.forEach(room => {
// 		if (room.roomCode === player.hostCode) {
// 			room.auctions.artifacts.forEach(auction => {
// 				if (auction.id === auctionObj.id) {
// 					if (auction.bid.bidAmount === 0) {
// 						auction.bid.bidAmount = bidAmount;
// 						auction.bid.bidTeam = player.teamName;
// 					} else if (auction.bid.bidAmount < bidAmount) {
// 						auction.bid.bidAmount = bidAmount;
// 						auction.bid.bidTeam = player.teamName;
// 					}
// 				}
// 			});
// 		}
// 	});
// 	//const updatedObj = firstPriceSealedBidObj.updateBidObject();
// 	//return updatedObj;
// }

// function addNewEnglishAuctionBid(bidInfo) {
// 	const { auctionObj, bidAt, bidAmount, player } = bidInfo;
// 	let updatedObj = {};
// 	rooms.forEach(room => {
// 		if (room.roomCode === player.hostCode) {
// 			room.auctions.artifacts.forEach(auction => {
// 				if (auction.id === auctionObj.id && auction.bid.bidAmount < bidAmount)  {
// 					auction.bid.bidAmount = bidAmount;
// 					auction.bid.bidTeam = player.teamName;
// 					updatedObj = auction;
// 				}
// 			});
// 		}
// 	});
// 	return updatedObj;
// }

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

function updateLeaderBoard(client) {
	var board = [];
	rooms.forEach(room => {
		if (room.roomCode === client.hostCode) {
			db.collection("rooms")
				.doc(client.hostCode)
				.onSnapshot(snapshot => {
					let data = snapshot.data();
					data.auctions.artifacts.forEach(artifact => {
						if (artifact.bid.bidTeam) {
							switch (artifact.bid.bidTeam) {
								case "Blue":
									found = room.leaderBoard[0].artifacts.some(el => el.id === artifact.id);
									if (!found) room.leaderBoard[0].artifacts.push(artifact);
									break;
								case "Red":
									found = room.leaderBoard[0].artifacts.some(el => el.id === artifact.id);
									if (!found) room.leaderBoard[0].artifacts.push(artifact);
									break;
								case "Green":
									found = room.leaderBoard[0].artifacts.some(el => el.id === artifact.id);
									if (!found) room.leaderBoard[0].artifacts.push(artifact);
									break;
								case "Yellow":
									found = room.leaderBoard[0].artifacts.some(el => el.id === artifact.id);
									if (!found) room.leaderBoard[0].artifacts.push(artifact);
									break;
								case "Purple":
									found = room.leaderBoard[0].artifacts.some(el => el.id === artifact.id);
									if (!found) room.leaderBoard[0].artifacts.push(artifact);
									break;
								case "Orange":
									found = room.leaderBoard[0].artifacts.some(el => el.id === artifact.id);
									if (!found) room.leaderBoard[0].artifacts.push(artifact);
									break;
								case "Indigo":
									found = room.leaderBoard[0].artifacts.some(el => el.id === artifact.id);
									if (!found) room.leaderBoard[0].artifacts.push(artifact);
									break;
								case "White":
									found = room.leaderBoard[0].artifacts.some(el => el.id === artifact.id);
									if (!found) room.leaderBoard[0].artifacts.push(artifact);
									break;
								case "Black":
									found = room.leaderBoard[0].artifacts.some(el => el.id === artifact.id);
									if (!found) room.leaderBoard[0].artifacts.push(artifact);
									break;
								case "Gold":
									found = room.leaderBoard[0].artifacts.some(el => el.id === artifact.id);
									if (!found) room.leaderBoard[0].artifacts.push(artifact);
									break;
							}
						}
					});
				});
		}
	});
}

module.exports = {
	createGameState,
	gameLoop,
	joinGameState,
	getNextObjectForLiveAuction,
	getRemainingTime,
	updateAuctionState,
  getBidWinner,
  getLeaderboard,
	//addNewFirstPricedSealedBid,
	//addNewEnglishAuctionBid,
};
