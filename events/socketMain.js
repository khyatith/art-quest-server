const { getRemainingTime } = require("../helpers/game");
var auctionsObj = require("../auctionData.json");
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
      };
      rooms[player.hostCode] = parsedRoom;
      await collection.insertOne(parsedRoom);
    }
  }

  const joinRoom = async(player) => {
    const parsedPlayer = JSON.parse(player);
    socket.join(parsedPlayer.hostCode);
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
      await collection.findOneAndUpdate({"hostCode":parsedPlayer.hostCode},{$set:parsedRoom});
      io.sockets.in(parsedPlayer.hostCode).emit("numberOfPlayersJoined", { numberOfPlayers: rooms[parsedPlayer.hostCode].numberOfPlayers , playersJoined: rooms[parsedPlayer.hostCode].players.length});
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

  const startLandingPageTimer = async ({ roomCode }) => {
    const room = await collection.findOne({'hostCode': roomCode});
    const parsedRoom = room;
    const hasLandingPageTimerStarted = parsedRoom.hasLandingPageTimerStarted;
    if (!hasLandingPageTimerStarted) {
      const currentTime = Date.parse(new Date());
      parsedRoom.landingPageTimerDeadline = new Date(currentTime + 3 * 60 * 1000);
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
    console.log('data', data);
    const { roomId, locationId, teamName, roundId } = data;
    const existingRecord = await collection_visits.findOne({"roomId":roomId, "teamName": teamName});
    //const room = await collection.findOne({'hostCode': roomId});
    //const roundIdInRoomCollection = room.sellingRoundNumber;
    console.log('isExisits', existingRecord);
    if (existingRecord) {
      //const { locations } = existingRecord;
      //If record exists, and roundNumber is different, we can update the record
      if (existingRecord.roundNumber === roundId) {
        io.sockets.in(roomId).emit("locationUpdatedForTeam", { roomId, teamName, locationId: existingRecord.locationId, roundId });
        return;
      }
      // if (!locations.includes(locationId)) {
      //   locations.push(locationId);
      // }
      await collection_visits.findOneAndUpdate({"roomId":roomId, "teamName": teamName},{$set:{"roomId": roomId, "locationId": locationId, "teamName": teamName,"roundNumber": roundId}, $push:{locations:locationId}}, {upsert:true});
      io.sockets.in(roomId).emit("locationUpdatedForTeam", { roomId, teamName, locationId: locationId, roundId });
    } else {
      const result = await collection_visits.insertOne({"roomId":roomId, "teamName": teamName, "locationId": locationId, "locations": [locationId]});
      console.log('updatedLocation', result);
      if (result) io.sockets.in(roomId).emit("locationUpdatedForTeam", { roomId, teamName, locationId, roundId });
    }
  }

  socket.on("createRoom", createRoom);
  socket.on("joinRoom", joinRoom);
  socket.on("startLandingPageTimer", startLandingPageTimer);
  socket.on("startGame", startGame);
  socket.on("setTeams", setTotalNumberOfPlayers);
  socket.on("putCurrentLocation", putCurrentLocation);
}