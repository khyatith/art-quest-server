const { getRemainingTime } = require("../helpers/game");
var auctionsObj = require("../auctionData.json");

module.exports = (io, socket, client, rooms) => {

  const createRoom = async (stringifiedPlayer) => {
    player = JSON.parse(stringifiedPlayer);
    socket.join(player.hostCode);
    let room = await client.get(player.hostCode);
    let parsedRoom = room && JSON.parse(room);
    if (!room) {
      let playerObj = {
        socketId: socket.id,
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
      };
      parsedRoom = {
        roomCode: player.playerId,
        players: [playerObj],
        auctions: auctionsObj,
        leaderBoard: {},
        totalAmountSpentByTeam: {},
        englishAuctionBids: {},
        firstPricedSealedBids: {},
        secondPricedSealedBids: {},
        allPayAuctions: {},
        hasLandingPageTimerStarted: false,
        landingPageTimerDeadline: 0,
        winner: null,
      };
      rooms[player.hostCode] = parsedRoom;
      await client.set(player.hostCode, JSON.stringify(parsedRoom), 'ex', 1440);
    }
  }

  const joinRoom = async(player) => {
    const parsedPlayer = JSON.parse(player);
    socket.join(parsedPlayer.hostCode);
    const room = await client.get(parsedPlayer.hostCode);
    if (room) {
      const parsedRoom = JSON.parse(room);
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
      await client.set(parsedPlayer.hostCode, JSON.stringify(parsedRoom), 'ex', 1440);
    }
  }

  const startGame = async (player) => {
    const parsedPlayer = JSON.parse(player);
    client.get(parsedPlayer.hostCode, async (err, room) => {
      if (room) {
        io.to(parsedPlayer.hostCode).emit("gameState", room);
      }
    });
  }

  const startLandingPageTimer = async ({ roomCode }) => {
    const room = await client.get(roomCode);
    const parsedRoom = JSON.parse(room);
    const hasLandingPageTimerStarted = parsedRoom.hasLandingPageTimerStarted;
    if (!hasLandingPageTimerStarted) {
      const currentTime = Date.parse(new Date());
      parsedRoom.landingPageTimerDeadline = new Date(currentTime + 0.3 * 60 * 1000);
      parsedRoom.hasLandingPageTimerStarted = true;
      client.set(roomCode, JSON.stringify(parsedRoom), 'ex', 1440);
    }
    setInterval(() => {
      const timerValue = getRemainingTime(parsedRoom.landingPageTimerDeadline);
      if (timerValue.total <= 0) {
        io.sockets.in(roomCode).emit("landingPageTimerEnded", { roomCode, timerValue });
        //parsedRoom.hasLandingPageTimerStarted = false;
        client.set(roomCode, JSON.stringify(parsedRoom), 'ex', 1440);
      } else if (timerValue.total > 0) {
        io.sockets.in(roomCode).emit("landingPageTimerValue", { roomCode, timerValue });
      }
    }, 1000);
  }

  socket.on("createRoom", createRoom);
  socket.on("joinRoom", joinRoom);
  socket.on("startLandingPageTimer", startLandingPageTimer);
  socket.on("startGame", startGame);

}