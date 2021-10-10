// Socket.io server that will service both node
// and react clients
// Req:
// - socket.io
// - socket.io-redis
// - farmhash

// entrypoint for our cluster which will make workers
// and the workers will do the Socket.io handling
//See https://github.com/elad/node-cluster-socket.io

const express = require('express');
const cluster = require('cluster');
const net = require('net');
const socketio = require('socket.io');
const socketMain = require('./events/socketMain');
const auctionEvents = require('./events/auctionEvents');
const leaderboard = require('./events/leaderboard');
var mod = require("./constants");
let rooms = mod.rooms;

const port = process.env.PORT || 3001;
const num_processes = require('os').cpus().length;
// Brew breaks for me more than it solves a problem, so I 
// installed redis from https://redis.io/topics/quickstart
// have to actually run redis via: $ redis-server (go to location of the binary)
// check to see if it's running -- redis-cli monitor
const io_redis = require('socket.io-redis');
const farmhash = require('farmhash');

if (cluster.isMaster) {
	// This stores our workers. We need to keep them to be able to reference
	// them based on source IP address. It's also useful for auto-restart,
	// for example.
	let workers = [];

	// Helper function for spawning worker at index 'i'.
	let spawn = function(i) {
		workers[i] = cluster.fork();

		// Optional: Restart worker on exit
		workers[i].on('exit', function(code, signal) {
			spawn(i);
		});
    };

    // Spawn workers.
	for (var i = 0; i < num_processes; i++) {
		spawn(i);
	}

	const worker_index = function(ip, len) {
		return farmhash.fingerprint32(ip) % len;
	};

	const server = net.createServer({ pauseOnConnect: true }, (connection) =>{
		let worker = workers[worker_index(connection.remoteAddress, num_processes)];
		  worker.send('sticky-session:connection', connection);
    });
    server.listen(port);
    console.log(`Master listening on port ${port}`);
} else {
  let app = express();
    
	// Don't expose our internal server to the outside world.
  const server = app.listen(0, 'localhost'); 
	const io = socketio(server, {
    cors: {
      origin: 'https://art-quest-4f7d6.firebaseapp.com/',
      credentials: true
    },
  });

  const onConnection = (socket) => {
    socketMain(io, socket, rooms);
    auctionEvents(io,socket, rooms);
  }

  io.on("connection", onConnection);

  const leaderboardns = io.of("/leaderboard-namespace");

  leaderboardns.on("connection", (socket) => {
    leaderboard(leaderboardns, socket, rooms);
  });

	// Listen to messages sent from the master. Ignore everything else.
	process.on('message', function(message, connection) {
		if (message !== 'sticky-session:connection') {
			return;
		}

		server.emit('connection', connection);

		connection.resume();
	});
}