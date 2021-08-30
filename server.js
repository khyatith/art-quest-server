const { createGameState, joinGameState, gameLoop, getNextObjectForLiveAuction, getRemainingTime, updateAuctionState, addNewFirstPricedSealedBid, getBidWinner } = require("./helpers/game");
const frameRate = 500;
const io = require("socket.io")(5000, {
    cors: {
        origin: "http://localhost:3000",
    },
});
require("dotenv").config();

const currentTime = Date.parse(new Date());
let currentAuction = {};

// 10 mins landing page timer
const landingPageTimerDeadline = new Date(currentTime + 1*60*1000);
let landingPageTimeInterval;
let landingPageTimerEnded = false;

console.log('currentTime', currentTime);
let auctionsTimer;
let isAuctionTimerStarted = false;
let auctionTimerInterval;

function updateLandingPageClock() {
  const t = getRemainingTime(landingPageTimerDeadline);
  if (t.total <= 0) {
    landingPageTimerEnded = true;
    clearInterval(landingPageTimeInterval);
  } else if (!landingPageTimerEnded && t.total > 0) {
    io.emit("landingPageTimerValue", t);
  }
}

async function updateAuctionClock() {
  isAuctionTimerStarted = true;
  const t = getRemainingTime(auctionsTimer);
  if (t.total <=0) {
    console.log('inside t.total <=0', t);
    isAuctionTimerStarted = false;
    clearInterval(auctionTimerInterval);
    const bidWinner = getBidWinner(currentAuction);
    console.log('bidWinner', bidWinner);
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
					startGameInterval(client.playerId, room, socket);
				}
			});
		});
  });
  
  socket.on("startLiveAuctions", () => {
    console.log('ongoingAuction', currentAuction);
    if (!currentAuction || currentAuction.auctionState !== 1) {
      console.log('ongoingAuction inside if', currentAuction);
      currentAuction = getNextObjectForLiveAuction();
    }
    console.log('ongoingAuction after if', currentAuction);
    socket.emit("startNextAuction", currentAuction);
  });

  socket.on("startLandingPageTimer", timerInMinutes => {
    landingPageTimeInterval = setInterval(updateLandingPageClock, 1000);
  });

  socket.on("startAuctionsTimer", timerInMinutes => {
    if (!isAuctionTimerStarted) {
      const current = Date.parse(new Date());
      auctionsTimer = new Date(current + timerInMinutes*60*1000);
    } 
    auctionTimerInterval = setInterval(updateAuctionClock, 1000);
  });

  socket.on("addNewBid", bidInfo => {
    console.log('inside allbids winner', bidInfo);
    const { auctionType } = bidInfo;
    switch(auctionType) {
      case '1':
        addNewFirstPricedSealedBid(bidInfo);
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
