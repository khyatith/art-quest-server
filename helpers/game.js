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
      firstPricedSealedBids: {},
      secondPricedSealedBids: {}
		};
	} catch (err) {
		console.log(err);
	}
}

function joinGameState(socket, player) {
	if (!player || !player.hostCode) return null;
	const hostCode = player.hostCode;
	rooms[hostCode].players.push(player);
}

function findSecondHighestBid(arr, arrSize) {
  let i;

  if (arrSize < 2) {
    return arr.bidAmount;
  }

  // sort the array
  arr.sort();

  for (i = arrSize - 2; i >= 0; i--) {
      // if the element is not
      // equal to largest element
      if (arr[i] != arr[arrSize - 1]) {
        return arr[i];
      }
  }

  return null;
}

function getLeaderboard(roomCode) {
	const leaderboard = rooms[roomCode].leaderBoard;
	const currentRoom = rooms[roomCode];
  const englishAuctionsObj = currentRoom.englishAuctionBids;;
  const firstPricedSealedBidAuctionsObj = currentRoom.firstPricedSealedBids;
  const secondPricedSealedBidAuctionObj = currentRoom.secondPricedSealedBids;

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
        const accBid = parseInt(acc.bidAmount);
        const objBid = parseInt(obj.bidAmount);
        if (accBid === objBid) {
          if (acc.bidAt < obj.bidAt) {
            return acc;
          } else {
            return obj;
          }
        }
        return (accBid > objBid) ? acc : obj;
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

  //secondPricedSealedBidAuctions
  if (secondPricedSealedBidAuctionObj) {
    for (var secondPricedSealedAuction in secondPricedSealedBidAuctionObj) {
      const leaderBoardSPSBKeys = Object.keys(leaderboard);
      const SPSBItem = secondPricedSealedBidAuctionObj[secondPricedSealedAuction];
      //Find the second highest bid amount
      const allBidsArr = SPSBItem.map((obj) => parseInt(obj.bidAmount));
      const secondHighestBid = findSecondHighestBid(allBidsArr, allBidsArr.length);
      let SPSBwinner = SPSBItem.filter(item => parseInt(item.bidAmount) > parseInt(secondHighestBid));
      if (SPSBwinner.length > 1) {
        SPSBwinner = SPSBwinner.reduce((acc, winner) => {
          return winner.bidAt < acc.bidAt ? winner : acc;
        });
      } else {
        SPSBwinner = SPSBwinner[0];
      }
      const SBSPWinnerFinal = Object.assign({}, SPSBwinner);
      SBSPWinnerFinal.bidAmount = secondHighestBid;
      const SPSBwinningteam = SBSPWinnerFinal.bidTeam;
      if (leaderBoardSPSBKeys && leaderBoardSPSBKeys.includes(SPSBwinningteam)) {
        const isExistingSPSBAuction = leaderboard[SPSBwinningteam].filter(item => item.auctionObj.id === SBSPWinnerFinal.auctionId)[0];
        if (!isExistingSPSBAuction) {
          leaderboard[`${SPSBwinningteam}`].push(SBSPWinnerFinal);
        }
      } else {
        leaderboard[`${SPSBwinningteam}`] = [SBSPWinnerFinal];
      }
    }
  }
  return leaderboard;
}

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

module.exports = {
	createGameState,
	gameLoop,
	joinGameState,
	getNextObjectForLiveAuction,
	getRemainingTime,
  getLeaderboard,
};
