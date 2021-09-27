const cluster = require("cluster");
const http = require("http");
const { Server } = require("socket.io");
const numCPUs = require("os").cpus().length;
const { setupMaster, setupWorker } = require("@socket.io/sticky");
const { createAdapter, setupPrimary } = require("@socket.io/cluster-adapter");
const {
	createGameState,
	joinGameState,
	gameLoop,
	getNextObjectForLiveAuction,
	getRemainingTime,
  getLeaderboard,
  calculateTotalAmountSpent,
} = require("./helpers/game");

var mod = require("./constants");
var rooms = mod.rooms;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  const httpServer = http.createServer();

  // setup sticky sessions
  setupMaster(httpServer, {
    loadBalancingMethod: "least-connection",
  });

  // setup connections between the workers
  setupPrimary();

  // needed for packets containing buffers (you can ignore it if you only send plaintext objects)
  cluster.setupPrimary({
    serialization: "advanced",
  });

  httpServer.listen(3001);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  console.log(`Worker ${process.pid} started`);

  const httpServer = http.createServer();
  const io = new Server(httpServer);

  // use the cluster adapter
  io.adapter(createAdapter());

  // setup connection with the primary process
  setupWorker(io);

  io.on("connection", (socket) => {
    io.of("/").adapter.on("create-room", (room) => {
      console.log(`room ${room} was created`);
      console.log(`socket id of the room ${socket.id}`);
    });

    //create a game room event
    socket.on("createRoom", player => {
      console.log('inside createroom', player);
      var hostPlayer = JSON.parse(player);
      //socket.join(hostPlayer.hostCode);
      console.log('inside hostplayer', hostPlayer);
      createGameState(socket, hostPlayer);
    });

    //join a game room event
    socket.on("joinRoom", player => {
      var hostPlayer = JSON.parse(player);
      socket.join(hostPlayer.hostCode);
      const playerJoined = joinGameState(socket, hostPlayer);
      console.log('playerJoined', playerJoined);
      if (!playerJoined) {
        console.log('player counldnt join');
      }
    });

    //start a game event
    socket.on("startGame", async(client) => {
      const parsedClient = JSON.parse(client);
      io.to(parsedClient.hostCode).emit("gameState", JSON.stringify(rooms[parsedClient.hostCode]));
    });
  });
}