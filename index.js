//const cluster = require("cluster");
const http = require("http");
const socketIO = require("socket.io");
//const numCPUs = require("os").cpus().length;
//const { setupMaster, setupWorker } = require("@socket.io/sticky");
//const { setupPrimary } = require("@socket.io/cluster-adapter");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
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

// if (cluster.isMaster) {
//   console.log(`Master ${process.pid} is running`);

//   const httpServer = http.createServer();

//   // setup sticky sessions
//   setupMaster(httpServer, {
//     loadBalancingMethod: "least-connection",
//   });

//   // setup connections between the workers
//   setupPrimary();

//   httpServer.listen(3001);

//   for (let i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }

//   cluster.on("exit", (worker) => {
//     console.log(`Worker ${worker.process.pid} died`);
//     cluster.fork();
//   });
// } else {
  const httpServer = http.createServer();
  httpServer.listen(3001);
  const io = socketIO(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true
    },
  });
  const pubClient = createClient({ host: "localhost", port: 6379 });
  const subClient = pubClient.duplicate();

  io.adapter(createAdapter(pubClient, subClient));

  // use the cluster adapter
  //io.adapter(createAdapter());

  // setup connection with the primary process
  //setupWorker(io);

  io.on("connection", socket => {
    console.log('inside connections');
    io.of("/").adapter.on("create-room", (room) => {
      console.log(`room ${room} was created`);
    });

    socket.on("createRoom", player => {
      console.log('inside create room', player);
      player = JSON.parse(player);
      socket.join(player.hostCode);
      console.log('player', player);
      createGameState(socket, player);
    });

    socket.on("joinRoom", player => {
      player = JSON.parse(player);
      socket.join(player.hostCode);
      console.log('player', player);
      console.log('rooms', rooms[player.hostCode]);
      //const playerJoined = joinGameState(socket, player);
      // if (!playerJoined) {
      //   console.log('player counldnt join');
      // }
    });
  });