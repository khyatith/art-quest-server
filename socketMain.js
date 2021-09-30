const {
	createGameState,
	joinGameState,
	gameLoop,
	getNextObjectForLiveAuction,
	getRemainingTime,
  getLeaderboard,
  calculateTotalAmountSpent,
} = require("./helpers/game");
var auctionsObj = require("./auctionData.json");

function socketMain(io, socket, client){

  socket.on("createRoom", stringifiedPlayer => {
    player = JSON.parse(stringifiedPlayer);
    socket.join(player.hostCode);
    client.get(player.hostCode, async (err, room) => {
      if (!room) {
        let playerObj = {
          socketId: socket.id,
          playerId: player.playerId,
          playerName: player.playerName,
          teamName: player.teamName,
        };
        const room = {
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
        };
        await client.set(player.hostCode, JSON.stringify(room), 'ex', 1440);
      }
    })
  });

  socket.on("joinRoom", player => {
    const parsedPlayer = JSON.parse(player);
    socket.join(parsedPlayer.hostCode);
    client.get(parsedPlayer.hostCode, async (err, room) => {
      if (room) {
        const parsedRoom = JSON.parse(room);
        const { players, roomCode } = parsedRoom;
        const isExistingPlayer = players.filter((item) => item.playerId === parsedPlayer.playerId);
        if (isExistingPlayer.length === 0) {
          parsedRoom.players.push(parsedPlayer);
        }
        await client.set(parsedPlayer.hostCode, JSON.stringify(parsedRoom), 'ex', 1440);
      }
    });
  });

  socket.on("startGame", async(player) => {
    const parsedPlayer = JSON.parse(player);
    client.get(parsedPlayer.hostCode, async (err, room) => {
      if (room) {
        io.to(parsedPlayer.hostCode).emit("gameState", room);
      }
    });
  });
  
  socket.on("startLandingPageTimer", async ({ roomCode, timerInMinutes }) => {
    const room = await client.get(roomCode);
    const parsedRoom = JSON.parse(room);
    console.log('parsedRoom', parsedRoom);
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
        parsedRoom.hasLandingPageTimerStarted = false;
        client.set(roomCode, JSON.stringify(parsedRoom), 'ex', 1440);
      } else if (timerValue.total > 0) {
        io.sockets.in(roomCode).emit("landingPageTimerValue", { roomCode, timerValue });
      }
    }, 1000);
  });
};

module.exports = socketMain;