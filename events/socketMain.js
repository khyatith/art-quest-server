const { getRemainingTime, calculateSellingRevenue } = require("../helpers/game");
var auctionsObj = require("../auctionData.json");
var sellingAuctionObj = require("../sellingAuctionData.json");
const dbClient = require('../mongoClient');
var cloneDeep = require('lodash.clonedeep');

module.exports = async (io, socket, rooms) => {

  const db = await dbClient.createConnection();
  const collection = db.collection('room');
  const collection_visits = db.collection('visits');

  const createRoom = async (stringifiedPlayer) => {
    player = JSON.parse(stringifiedPlayer);
    socket.join(player.hostCode);
    let room = await collection.findOne({'hostCode': player.hostCode});
    let parsedRoom = room;
    if (!room) {
      let playerObj = {
        socketId: socket.id,
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
      };
      parsedRoom = {
        hostCode: player.hostCode,
        roomCode: player.playerId,
        players: [playerObj],
        auctions: cloneDeep(auctionsObj),
        sellingAuctions: cloneDeep(sellingAuctionObj),
        leaderBoard: {},
        numberOfPlayers: 0,
        totalAmountSpentByTeam: {},
        englishAuctionBids: {},
        firstPricedSealedBids: {},
        secondPricedSealedBids: {},
        allPayAuctions: {},
        hasLandingPageTimerStarted: false,
        landingPageTimerDeadline: 0,
        landingPageTimerValue: {},
        hasLandingPageTimerEnded: false,
        winner: null,
        sellingRoundNumber: 1,
        hadLocationPageTimerEnded: false,
        locationPhaseTimerValue: {},
        sellPaintingTimerValue: {},
        hasSellPaintingTimerEnded: false,
        sellingResultsTimerValue: {},
        hasSellingResultsTimerEnded: false,
        calculatedRoundRevenue: {},
      };
      rooms[player.hostCode] = parsedRoom;
      await collection.insertOne(parsedRoom);
    }
  }

  const joinRoom = async(player) => {
    const parsedPlayer = JSON.parse(player);
    const room = await collection.findOne({'hostCode': parsedPlayer.hostCode});
    if (room) {
      const parsedRoom = room;
      const { players } = parsedRoom;
      const isExistingPlayer = players.filter((item) => item.playerId === parsedPlayer.playerId);
      if (isExistingPlayer.length === 0) {
        parsedRoom.players.push(parsedPlayer);
      }
      if (!rooms || !rooms[parsedPlayer.hostCode]) {
        rooms[parsedPlayer.hostCode] = parsedRoom;
      } else {
        rooms[parsedPlayer.hostCode].players.push(parsedPlayer);
      }
      socket.join(parsedPlayer.hostCode);
      await collection.findOneAndUpdate({"hostCode":parsedPlayer.hostCode},{$set:parsedRoom});
    }
  }

  const getPlayersJoinedInfo = async(data) => {
    const { roomCode } = data;
    const room = await collection.findOne({'hostCode': roomCode});
    if (room) {
      io.sockets.in(roomCode).emit("numberOfPlayersJoined", { numberOfPlayers: room.numberOfPlayers, playersJoined: room.players.length });
    }
  }

  const startGame = async (player) => {
    const parsedPlayer = JSON.parse(player);
    collection.findOne({'hostCode': parsedPlayer.hostCode}, async (err, room) => {
      if (room) {
        io.to(parsedPlayer.hostCode).emit("gameState", room);
      }
    });
  }

  const landingPageTimerEnded = async (player) => {
    const parsedPlayer = JSON.parse(player);
    collection.findOne({'hostCode': parsedPlayer.hostCode}, async (err, room) => {
      if (room) {
        io.to(parsedPlayer.hostCode).emit("redirectToNextPage", room);
      }
    });
  }

  const hasAuctionTimerEnded = async ({ player, auctionId }) => {
    const hostCode = player.hostCode;
    io.to(hostCode).emit("redirectToNextAuction", auctionId);
  }

  const startLandingPageTimer = async ({ roomCode }) => {
    const room = await collection.findOne({'hostCode': roomCode});
    const parsedRoom = room;
    const hasLandingPageTimerStarted = parsedRoom.hasLandingPageTimerStarted;
    if (!hasLandingPageTimerStarted) {
      const currentTime = Date.parse(new Date());
      parsedRoom.landingPageTimerDeadline = new Date(currentTime + 0.2 * 60 * 1000);
      parsedRoom.hasLandingPageTimerStarted = true;
      collection.findOneAndUpdate({"hostCode":roomCode},{$set:parsedRoom});
    }
    setInterval(() => {
      const timerValue = getRemainingTime(parsedRoom.landingPageTimerDeadline);
      if (timerValue.total <= 0) {
        io.sockets.in(roomCode).emit("landingPageTimerEnded", { roomCode, timerValue });
        //parsedRoom.hasLandingPageTimerStarted = false;
        collection.findOneAndUpdate({"hostCode":roomCode},{$set:parsedRoom});
      } else if (timerValue.total > 0) {
        io.sockets.in(roomCode).emit("landingPageTimerValue", { roomCode, timerValue });
      }
    }, 1000);
  }

  const setTotalNumberOfPlayers = async ({ roomCode, numberOfPlayers }) => {
    const room = await collection.findOne({'hostCode': roomCode});
    const parsedRoom = room;
    parsedRoom.numberOfPlayers = parseInt(numberOfPlayers);
    rooms[roomCode].numberOfPlayers = parseInt(numberOfPlayers);
    await collection.findOneAndUpdate({"hostCode":roomCode},{$set:parsedRoom});
  }

  const putCurrentLocation = async (data) => {
    const { roomId, locationId, teamName, roundId } = data;
    const existingRecord = await collection_visits.findOne({"roomId":roomId, "teamName": teamName});
    if (existingRecord) {
      if (existingRecord.roundNumber === roundId) {
        io.sockets.in(roomId).emit("locationUpdatedForTeam", { roomId, teamName, locationId: existingRecord.locationId, roundId });
        return;
      }
      await collection_visits.findOneAndUpdate({"roomId":roomId, "teamName": teamName},{$set:{"roomId": roomId, "locationId": locationId, "teamName": teamName,"roundNumber": roundId}, $push:{locations:locationId}}, {upsert:true});
      io.sockets.in(roomId).emit("locationUpdatedForTeam", { roomId, teamName, locationId: locationId, roundId });
    } else {
      const result = await collection_visits.insertOne({"roomId":roomId, "teamName": teamName, "locationId": locationId, "locations": [locationId]});
      if (result) io.sockets.in(roomId).emit("locationUpdatedForTeam", { roomId, teamName, locationId, roundId });
    }
  }

  const calculateRevenue = async (data) => {
    const { teamName, roomCode, roundId } = data;
    const calculatedRevenue = calculateSellingRevenue(data);
    const results = await collection.findOne({'hostCode':roomCode});
    let totalAmountByCurrentTeam = results?.totalAmountSpentByTeam[teamName];
    if (totalAmountByCurrentTeam) {
      totalAmountByCurrentTeam = parseFloat(totalAmountByCurrentTeam) + parseFloat(calculatedRevenue);
    } else {
      totalAmountByCurrentTeam = parseFloat(calculatedRevenue);
    }
    results.totalAmountSpentByTeam[teamName] = parseFloat(totalAmountByCurrentTeam).toFixed(1);
    const caculatedRevenueAfterRound = results.calculatedRoundRevenue[roundId] || {};
    if (Object.keys(caculatedRevenueAfterRound).length > 0) {
      results.calculatedRoundRevenue[roundId][teamName] = caculatedRevenueAfterRound[teamName] ? parseFloat(caculatedRevenueAfterRound[teamName]) + parseFloat(calculatedRevenue) : parseFloat(calculatedRevenue);
    } else {
      results.calculatedRoundRevenue = { [roundId]: { [teamName]: parseFloat(calculatedRevenue) } };
    }
    await collection.findOneAndUpdate({"hostCode":roomCode},{$set:{ "totalAmountSpentByTeam": results.totalAmountSpentByTeam, "calculatedRoundRevenue": results.calculatedRoundRevenue}});
    return calculatedRevenue;
  }

  const emitNominatedPaintingId = (data) => {
    const { paintingId, roomCode } = data;
    io.sockets.in(roomCode).emit("emitNominatedPainting", paintingId);
    calculateRevenue(data);
  }

  socket.on("createRoom", createRoom);
  socket.on("joinRoom", joinRoom);
  socket.on("getPlayersJoinedInfo", getPlayersJoinedInfo);
  socket.on("startLandingPageTimer", startLandingPageTimer);
  socket.on("startGame", startGame);
  socket.on("landingPageTimerEnded", landingPageTimerEnded);
  socket.on("auctionTimerEnded", hasAuctionTimerEnded);
  socket.on("setTeams", setTotalNumberOfPlayers);
  socket.on("putCurrentLocation", putCurrentLocation);
  socket.on("calculateTeamRevenue", calculateRevenue);
  socket.on("paintingNominated", emitNominatedPaintingId);
}