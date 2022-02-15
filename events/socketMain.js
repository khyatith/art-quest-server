const { getRemainingTime, calculateSellingRevenue } = require("../helpers/game");
var auctionsObj = require("../data/auctionData.json");
var sellingAuctionObj = require("../data/sellingAuctionData.json");
var dutchAuctionObj = require("../data/dutchAuctionData.json");
const dbClient = require('../mongoClient');
var cloneDeep = require('lodash.clonedeep');

module.exports = async (io, socket, rooms) => {

  const db = await dbClient.createConnection();
  const collection = db.collection('room');
  const collection_visits = db.collection('visits');
  const collection_flyTicketPrice = db.collection('flyTicketPrice');

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
        dutchAuctions: cloneDeep(dutchAuctionObj),
        dutchAuctionsOrder: [],
        allTeams: [],
        leaderBoard: {},
        numberOfPlayers: 0,
        totalAmountSpentByTeam: {},
        englishAuctionBids: {},
        maxEnglishAuctionBids: {},
        firstPricedSealedBids: {},
        secondPricedSealedBids: {},
        dutchAuctionBids: {},
        allPayAuctions: {},
        version: 1,
        hasLandingPageTimerStarted: false,
        hasDutchAuctionTimerStarted: false,
        landingPageTimerDeadline: 0,
        landingPageTimerValue: {},
        dutchAuctionTimerValue: {},
        hasLandingPageTimerEnded: false,
        hasDutchAuctionTimerEnded: false,
        hasAuctionResultStarted: false,
        auctionResultTimerDeadline: 0,
        auctionResultTimerValue: {},
        hasAuctionResultTimerEnded: false,
        winner: null,
        sellingRoundNumber: 1,
        hadLocationPageTimerEnded: false,
        locationPhaseTimerValue: {},
        sellPaintingTimerValue: {},
        hasSellPaintingTimerEnded: false,
        sellingResultsTimerValue: {},
        hasSellingResultsTimerEnded: false,
        calculatedRoundRevenue: {},
        totalArtScoreForTeams: {},
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
      const { players, allTeams } = parsedRoom;
      const isExistingPlayer = players.filter((item) => item.playerId === parsedPlayer.playerId);
      if (isExistingPlayer.length === 0) {
        parsedRoom.players.push(parsedPlayer);
      }
      if (!allTeams.includes(parsedPlayer.teamName)) {
        parsedRoom.allTeams.push(parsedPlayer.teamName);
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
    io.to(hostCode).emit("redirectToResults", auctionId);
  }

  const hasAuctionResultTimerEnded = async ({ player, auctionId }) => {
    const hostCode = player.hostCode;
    io.to(hostCode).emit("goToNextAuction", auctionId);
  }

  const hasLocationPhaseTimerEnded = ({ player }) => {
    const hostCode = player.hostCode;
    io.to(hostCode).emit("goToExpo");
  }

  const hasSellingResultsTimerEnded = ({ player }) => {
    const hostCode = player.hostCode;
    io.to(hostCode).emit("startNextRound");
  }

  const hasExpoBeginningTimerEnded = ({ hostCode }) => {
    io.to(hostCode).emit('goToSellingResults');
  }

  const startLandingPageTimer = async ({ roomCode }) => {
    const room = await collection.findOne({'hostCode': roomCode});
    const parsedRoom = room;
    const hasLandingPageTimerStarted = parsedRoom.hasLandingPageTimerStarted;
    if (!hasLandingPageTimerStarted) {
      const currentTime = Date.parse(new Date());
      parsedRoom.landingPageTimerDeadline = new Date(currentTime + 0.5 * 60 * 1000);
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

  const setTotalNumberOfPlayers = async ({ roomCode, numberOfPlayers, version }) => {
    const room = await collection.findOne({'hostCode': roomCode});
    const parsedRoom = room;
    parsedRoom.numberOfPlayers = parseInt(numberOfPlayers);
    parsedRoom.version = parseInt(version);
    rooms[roomCode].numberOfPlayers = parseInt(numberOfPlayers);
    rooms[roomCode].version = parseInt(version);
    await collection.findOneAndUpdate({"hostCode":roomCode},{$set:parsedRoom});
  }

  const updateFlyTicketPricesForLocation = async (roomId, locationId, flyTicketPrice) => {
    let result;
    let ticketPriceForLocation = {};
    const existingRecord = await collection_flyTicketPrice.findOne({'roomId': roomId});
    console.log('isExistingRecord', existingRecord);
    if (existingRecord) {
      ticketPriceForLocation = existingRecord.ticketPriceByLocation;
      ticketPriceForLocation = {
        ...ticketPriceForLocation,
        [locationId]: flyTicketPrice
      };
      result = await collection_flyTicketPrice.findOneAndUpdate({"roomId":roomId}, {$set: {"ticketPriceByLocation": ticketPriceForLocation}});
    } else {
      ticketPriceForLocation[locationId] = flyTicketPrice;
      result = await collection_flyTicketPrice.insertOne({"roomId": roomId, "ticketPriceByLocation": ticketPriceForLocation });
    }
    console.log('result after updating ticket price', result);
    return result;
  }

  const putCurrentLocation = async (data) => {
    const { roomId, locationId, teamName, roundId, flyTicketPrice } = data;
    console.log('data', data);
    const result = await updateFlyTicketPricesForLocation(roomId, locationId, flyTicketPrice);
    console.log('result after updating ticket price');
    if (result) {
      const existingRecord = await collection_visits.findOne({"roomId":roomId, "teamName": teamName});
      if (existingRecord) {
        console.log('inside existingRecord', existingRecord);
        if (parseInt(existingRecord.roundNumber, 10) === parseInt(roundId, 10)) {
          console.log('roundNumber equals', roundId);
          console.log('roundNumber equals', existingRecord.roundNumber);
          io.sockets.in(roomId).emit("locationUpdatedForTeam", { roomId, teamName, locationId: existingRecord.locationId, roundId, flyTicketPrice });
          return;
        }
        await collection_visits.findOneAndUpdate({"roomId":roomId, "teamName": teamName},{$set:{"roomId": roomId, "locationId": locationId, "teamName": teamName,"roundNumber": roundId}, $push:{locations:locationId}}, {upsert:true});
        io.sockets.in(roomId).emit("locationUpdatedForTeam", { roomId, teamName, locationId, roundId, flyTicketPrice });
      } else {
        console.log('not existing record');
        const result = await collection_visits.insertOne({"roomId":roomId, "teamName": teamName, "locationId": locationId, "locations": [locationId], "allVisitLocations": []});
        if (result) io.sockets.in(roomId).emit("locationUpdatedForTeam", { roomId, teamName, locationId, roundId, flyTicketPrice });
      }
    }
  }

  const calculateRevenue = async (data) => {
    const { teamName, roomCode, roundId, transportCost } = data;
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
    const formattedTransportCost = parseInt(transportCost, 10) / 1000000;
    const realCalculatedRevenue = parseFloat(calculatedRevenue) - parseFloat(formattedTransportCost);
    if (Object.keys(caculatedRevenueAfterRound).length > 0) {
      results.calculatedRoundRevenue[roundId][teamName] = parseFloat(realCalculatedRevenue);
    } else {
      results.calculatedRoundRevenue = { [roundId]: { [teamName]: parseFloat(realCalculatedRevenue) } };
    }
    await collection.findOneAndUpdate({"hostCode":roomCode},{$set:{ "totalAmountSpentByTeam": results.totalAmountSpentByTeam, "calculatedRoundRevenue": results.calculatedRoundRevenue}});
    return calculatedRevenue;
  }

  const emitNominatedPaintingId = async (data) => {
    const { paintingId, roomCode, teamName } = data;
    const calculatedRevenue = await calculateRevenue(data);
    io.sockets.in(roomCode).emit("emitNominatedPainting", {paintingId, teamName, ticketPrice: data.ticketPrice, calculatedRevenue});
  }

  socket.on("createRoom", createRoom);
  socket.on("joinRoom", joinRoom);
  socket.on("getPlayersJoinedInfo", getPlayersJoinedInfo);
  socket.on("startLandingPageTimer", startLandingPageTimer);
  socket.on("startGame", startGame);
  socket.on("landingPageTimerEnded", landingPageTimerEnded);
  socket.on("auctionTimerEnded", hasAuctionTimerEnded);
  socket.on("auctionResultTimerEnded", hasAuctionResultTimerEnded);
  socket.on("setTeams", setTotalNumberOfPlayers);
  socket.on("putCurrentLocation", putCurrentLocation);
  socket.on("calculateTeamRevenue", calculateRevenue);
  socket.on("paintingNominated", emitNominatedPaintingId);
  socket.on("locationPhaseTimerEnded", hasLocationPhaseTimerEnded);
  socket.on("expoBeginningTimerEnded", hasExpoBeginningTimerEnded);
  socket.on("sellingResultsTimerEnded", hasSellingResultsTimerEnded);
}