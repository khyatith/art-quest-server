const { getNextObjectForLiveAuction, getRemainingTime } = require("../helpers/game");

let auctionsTimer;
let isAuctionTimerStarted = false;
let auctionTimerInterval;

function updateAuctionClock() {
  isAuctionTimerStarted = true;
  const t = getRemainingTime(auctionsTimer);
  return t;
}


module.exports = (io, socket, client, rooms) => {
  const startLiveAuctions = async (prevAuctionObj) => {
    const { player } = prevAuctionObj;
    const room = await client.get(player.hostCode);
    const parsedRoom = JSON.parse(room);
    const globalRoom = rooms[player.hostCode];
    const returnObj = getNextObjectForLiveAuction(parsedRoom, prevAuctionObj);
    //update redis
    const udpatedParsedRoom = returnObj.parsedRoom
    globalRoom.auctions.artifacts = udpatedParsedRoom.auctions.artifacts;
    //There is a bug right now where leaderboard is not persisting across the auctions
    //This is happening because somehow the redis object is not persisting the data.
    //This is a workaround that but eventually I have to find a solution for it
    udpatedParsedRoom.leaderBoard = globalRoom.leaderBoard;
    udpatedParsedRoom.totalAmountSpentByTeam = globalRoom.totalAmountSpentByTeam;
    await client.set(player.hostCode, JSON.stringify(udpatedParsedRoom), 'ex', 1440);
    socket.emit("startNextAuction", returnObj.newAuction);
  }

  const startAuctionsTimer = async ({ player }) => {
		if (!isAuctionTimerStarted) {
			const current = Date.parse(new Date());
			auctionsTimer = new Date(current + 0.5 * 60 * 1000);
		}
    auctionTimerInterval = setInterval(() => {
      const t = updateAuctionClock();
      if (t.total <= 0) {
        isAuctionTimerStarted = false;
        clearInterval(auctionTimerInterval);
        io.to(player.hostCode).emit("auctionPageTimerEnded", t);
      }  else if (isAuctionTimerStarted && t.total > 0) {
        io.to(player.hostCode).emit("auctionTimerValue", t);
      }
    }, 1000);
  }

  const addNewBid = async (bidInfo) => {
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
  }

  socket.on("startLiveAuctions", startLiveAuctions);
  socket.on("startAuctionsTimer", startAuctionsTimer);
  socket.on("addNewBid", addNewBid);
}