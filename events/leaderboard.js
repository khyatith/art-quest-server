const { getLeaderboard, calculateTotalAmountSpent, calculateBuyingPhaseWinner } = require("../helpers/game");
var mod = require("../constants");
const dbClient = require('../mongoClient');
let rooms = mod.rooms;

module.exports = async (io, socket) => {

  var mongoClient = await dbClient.createConnection();
  const db = mongoClient.db('art_quest');
	const collection = db.collection('room');

  const getLeaderboardDisplay = async (player) => {
    socket.join(player.hostCode);
    if (!rooms[player.hostCode]) {
      return getFromDb(player.hostCode);
    }
    const leaderboard = await getLeaderboard(rooms, player.hostCode);
    rooms[player.hostCode].leaderBoard = leaderboard;
    const totalAmountByTeam = await calculateTotalAmountSpent(leaderboard, player.hostCode, rooms);
    rooms[player.hostCode].totalAmountSpentByTeam = totalAmountByTeam;
    await collection.findOneAndUpdate({"hostCode":player.hostCode},{$set:rooms[player.hostCode]})
    
    io.to(player.hostCode).emit("leaderboard", { leaderboard, totalAmountByTeam});
  }

  const displayGameWinner = async (player) => {
    let room = await collection.findOne({'hostCode': player.hostCode});
    let parsedRoom;
    if (room) {
      parsedRoom = room;
    }
    if (parsedRoom.winner) return parsedRoom.winner;
    const winner = calculateBuyingPhaseWinner(parsedRoom);
    io.to(player.hostCode).emit("displayGameWinner", { winner, leaderboard: parsedRoom.leaderBoard });
  }

  socket.on("getLeaderBoard", getLeaderboardDisplay);
  socket.on("getWinner", displayGameWinner);
}

const getFromDb = async (hostCode) => {
  const room = await collection.findOne({'hostCode': hostCode});
  const parsedRoom = room;
  io.to(hostCode).emit("leaderboard", { leaderboard: parsedRoom.leaderboard, totalAmountByTeam: parsedRoom.totalAmountByTeam })
}