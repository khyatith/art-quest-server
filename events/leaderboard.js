const { getLeaderboard, calculateTotalAmountSpent } = require("../helpers/game");
var mod = require("../constants");
let rooms = mod.rooms;

module.exports = (io, socket, client) => {

  const getLeaderboardDisplay = async (player) => {
    socket.join(player.hostCode);
    if (!rooms[player.hostCode]) {
      return getFromRedis(player.hostCode);
    }
    const leaderboard = await getLeaderboard(rooms, player.hostCode);
    rooms[player.hostCode].leaderBoard = leaderboard;
    const totalAmountByTeam = await calculateTotalAmountSpent(leaderboard, player.hostCode, rooms);
    rooms[player.hostCode].totalAmountSpentByTeam = totalAmountByTeam;
    await client.set(player.hostCode, JSON.stringify(rooms[player.hostCode]), 'ex', 1440);
    io.to(player.hostCode).emit("leaderboard", { leaderboard, totalAmountByTeam});
  }

  socket.on("getLeaderBoard", getLeaderboardDisplay);
}

const getFromRedis = async (hostCode) => {
  const room = await client.get(hostCode);
  const parsedRoom = JSON.parse(room);
  io.to(hostCode).emit("leaderboard", { leaderboard: parsedRoom.leaderboard, totalAmountByTeam: parsedRoom.totalAmountByTeam })
}