const express = require("express");
const router = express.Router();
const dbClient = require('../mongoClient');
const { getRemainingTime, getLeaderboard, calculateTotalAmountSpent, calculateBuyingPhaseWinner, getNextObjectForLiveAuction, calculateTeamEfficiency, calculateSellingRevenue } = require("../helpers/game");
router.use(express.json());
var mod = require("../constants");
let rooms = mod.rooms;
const { resolve } = require("q");
const { nanoid } = require('nanoid');

let db;

router.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

router.get('/getUID', (req, res) => {
  res.send(nanoid(5));
});

router.get('/timer/:hostCode', function (req, res) {
  const { params } = req;
  const hostCode = params.hostCode;
  let room = rooms[hostCode];
  if (room && room.hasLandingPageTimerEnded) {
    res.send({ landingPageTimerValue: {} });
    return;
  }
  if (room && Object.keys(room.landingPageTimerValue).length > 0) {
    res.send({ landingPageTimerValue: room.landingPageTimerValue });
  } else {
    const currentTime = Date.parse(new Date());
    const deadline = new Date(currentTime + 0.3 * 60 * 1000);
    const timerValue = getRemainingTime(deadline);
    setInterval(() => startServerTimer(room, deadline), 1000);
    res.send({ landingPageTimerValue: timerValue });
  }
});


router.get('/getResults/:hostCode', async (req, res) => {
  db = await dbClient.createConnection();
  const collection = db.collection('room');
  const { params } = req;
  const hostCode = params.hostCode;
  const room = rooms[hostCode];
  //leaderboard
  const leaderboard = await getLeaderboard(rooms, hostCode);
  room.leaderBoard = leaderboard;

  //total amt by teams
  const totalAmountByTeam = await calculateTotalAmountSpent(leaderboard, hostCode, rooms);
  room.totalAmountSpentByTeam = totalAmountByTeam;

  const teamStats = await calculateTeamEfficiency(totalAmountByTeam, leaderboard);
  room.teamEfficiency = teamStats.efficiencyByTeam;

  room.totalPaintingsWonByTeam = teamStats.totalPaintingsWonByTeams;

  const result = JSON.stringify({ leaderboard, totalAmountByTeam, teamEfficiency: teamStats.efficiencyByTeam, totalPaintingsWonByTeams: teamStats.totalPaintingsWonByTeams });
  await collection.findOneAndUpdate({"hostCode":hostCode},{$set:rooms[hostCode]});
  res.send(result);
});

// router.get('/getResults/:hostCode', async (req, res) => {
//   db = await dbClient.createConnection();
//   const collection = db.collection('room');
//   const { params } = req;
//   const hostCode = params.hostCode;
//   const room = rooms[hostCode];
//   //leaderboard
//   const leaderboard = await getLeaderboard(rooms, hostCode);
//   room.leaderBoard = leaderboard;

//   //total amt by teams
//   const totalAmountByTeam = await calculateTotalAmountSpent(leaderboard, hostCode, rooms);
//   room.totalAmountSpentByTeam = totalAmountByTeam;

//   //painting quality avg & total points
//   const averagebyTeam = await calculatePaintingQualityAndTotalPoints(room);
//   room.paintingQualityAvg = averagebyTeam.paintingQualityResult;
//   room.totalPointsAvg = averagebyTeam.totalPointsResult;
//   const result = JSON.stringify({ leaderboard, totalAmountByTeam, paintingQualityAvg: averagebyTeam.paintingQualityResult, totalPointsAvg: averagebyTeam.totalPointsResult });
//   await collection.findOneAndUpdate({"hostCode":hostCode},{$set:rooms[hostCode]});
//   res.send(result);
// });

router.get('/getWinner/:hostCode', async (req, res) => {
  //db = await dbClient.createConnection();
  //const collection = db.collection('room');
  const { params } = req;
  const hostCode = params.hostCode;
  const room = rooms[hostCode];
  //TODO: update winner in mongodb
  //let room = await collection.findOne({'hostCode': hostCode});
  let parsedRoom;
  if (room) {
    parsedRoom = room;
  }
  if (parsedRoom && parsedRoom.winner) return parsedRoom.winner;
  const winnerData = calculateBuyingPhaseWinner(parsedRoom);
  res.send(winnerData);
  //io.to(player.hostCode).emit("displayGameWinner", { winner, leaderboard: parsedRoom.leaderBoard });
});

router.get('/getNextAuction/:hostCode/:prevAuctionId', async(req, res) => {
  let db = await dbClient.createConnection();
  const collection = db.collection('room');
  const { hostCode, prevAuctionId } = req.params;
  const room = await collection.findOne({'hostCode': hostCode});

  const parsedRoom = room;
  const globalRoom = rooms[hostCode];
  const returnObj = getNextObjectForLiveAuction(parsedRoom, prevAuctionId);

  const udpatedParsedRoom = returnObj.parsedRoom;
  if (globalRoom && globalRoom.auctions) {
    globalRoom.auctions.artifacts = udpatedParsedRoom.auctions.artifacts;
  }
  //There is a bug right now where leaderboard is not persisting across the auctions
  //This is happening because somehow the redis object is not persisting the data.
  //This is a workaround that but eventually I have to find a solution for it
  udpatedParsedRoom.leaderBoard = globalRoom.leaderBoard;
  udpatedParsedRoom.totalAmountSpentByTeam = globalRoom.totalAmountSpentByTeam;
  await collection.findOneAndUpdate({"hostCode":hostCode},{$set:udpatedParsedRoom});
  res.send(returnObj.newAuction)
});

router.get('/auctionTimer/:hostCode/:auctionId', function (req, res) {
  const { params } = req;
  const hostCode = params.hostCode;
  let room = rooms[hostCode];
  let auctionObj = room.auctions.artifacts.filter((item) => parseInt(item.id) === parseInt(params.auctionId));
  if (!auctionObj) return;
  const currentAuctionObj = auctionObj[0];
  if (currentAuctionObj && currentAuctionObj.hasAuctionTimerEnded) {
    res.send({ currentAuctionObjTimer: {} });
    return;
  }
  if (currentAuctionObj && Object.keys(currentAuctionObj.auctionTimerValue).length > 0) {
    res.send({ currentAuctionObjTimer: currentAuctionObj.auctionTimerValue });
  } else {
    const currentTime = Date.parse(new Date());
    const deadline = new Date(currentTime + 0.5 * 60 * 1000);
    const timerValue = getRemainingTime(deadline);
    setInterval(() => startAuctionServerTimer(room, currentAuctionObj, deadline), 1000);
    res.send({ currentAuctionObjTimer: timerValue });
  }
});

const startAuctionServerTimer = (room, currentAuctionObj, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    currentAuctionObj.hasAuctionTimerEnded = true;
    currentAuctionObj.auctionTimerValue = {};
  } else if (room && timerValue.total > 0) {
    currentAuctionObj.auctionTimerValue = timerValue;
  }
}

const startServerTimer = (room, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    room.hasLandingPageTimerEnded = true;
    room.landingPageTimerValue = {};
  } else if (room && timerValue.total > 0) {
    room.landingPageTimerValue = timerValue;
  }
}

var mongoClient = dbClient.createConnection();
  
mongoClient.then(db => {

  const collection = db.collection('city');
  const collection_visits = db.collection('visits');
  const collection_room = db.collection('room');

  const startLocationPhaseServerTimer = async (hostCode, deadline) => {
    let timerValue = getRemainingTime(deadline);
    //const room = await collection_room.findOne({'hostCode': hostCode});
    const serverRoom = rooms[hostCode];
    if (timerValue.total <= 0) {
      //room.hadLocationPageTimerEnded = true;
      //room.locationPhaseTimerValue = {};
      serverRoom.hadLocationPageTimerEnded = true;
      serverRoom.locationPhaseTimerValue = {};
      //await collection_room.findOneAndUpdate({"hostCode":hostCode},{$set:{locationPhaseTimerValue: {}, hadLocationPageTimerEnded: true}});
    } else if (timerValue.total > 0) {
      //room.locationPhaseTimerValue = timerValue;
      serverRoom.locationPhaseTimerValue = timerValue;
      //await collection_room.findOneAndUpdate({"hostCode":hostCode},{$set:{locationPhaseTimerValue:timerValue}});
    }
  }

  const startSellingServerTimer = async (hostCode, deadline) => {
    let sellingPhaseTimerValue = getRemainingTime(deadline);
    const serverRoom = rooms[hostCode];
    if (sellingPhaseTimerValue.total <= 0) {
      serverRoom.hasSellPaintingTimerEnded = true;
      serverRoom.sellPaintingTimerValue = {};
    } else if (sellingPhaseTimerValue.total > 0) {
      serverRoom.sellPaintingTimerValue = sellingPhaseTimerValue;
    }
  }

  const startSellingResultsServerTimer = async (hostCode, deadline) => {
    let sellingPhaseTimerValue = getRemainingTime(deadline);
    const serverRoom = rooms[hostCode];
    if (sellingPhaseTimerValue.total <= 0) {
      serverRoom.hasSellingResultsTimerEnded = true;
      serverRoom.sellingResultsTimerValue = {};
    } else if (sellingPhaseTimerValue.total > 0) {
      serverRoom.sellingResultsTimerValue = sellingPhaseTimerValue;
    }
  }


  router.get('/getMap', (req,res) =>{
      collection.find({}).toArray()
      .then(results => {
        if(!results) res.status(404).json({error: 'Cities not found'})
        else res.status(200).json(results)
      })
      .catch(error => {console.error(error)})
  });

  router.get('/getSellingResults', async (req,res) =>{

    var selling_result = new Object();
    //const currentRoom = rooms[req.query.roomId]
    const { roomId } = req.query;
    const results = await collection_room.findOne({"roomCode":roomId});
    const room = rooms[roomId];
    if(!results) {
      res.status(404).json({error: 'Room not found'});
    } else {
      selling_result.amountSpentByTeam = results.totalAmountSpentByTeam;
      selling_result.roundNumber = results.sellingRoundNumber;
      var keys =Object.keys(selling_result.amountSpentByTeam);

      //location phase timer value
      if (room && room.hadLocationPageTimerEnded) {
        selling_result.locationPhaseTimerValue = {};
      }
      if (room && Object.keys(room.locationPhaseTimerValue).length > 0) {
        selling_result.locationPhaseTimerValue = room.locationPhaseTimerValue;
      } else {
        const currentTime = Date.parse(new Date());
        const deadline = new Date(currentTime + 0.3 * 60 * 1000);
        const timerValue = getRemainingTime(deadline);
        setInterval(() => startLocationPhaseServerTimer(roomId, deadline), 1000);
        selling_result.locationPhaseTimerValue = timerValue;
      }

      getVisitData(keys,roomId)
        .then(visitObjects => {
          console.log('visitObjects', visitObjects);
          selling_result.visits = visitObjects;
          res.status(200).json(selling_result);
      });
    }
  });

  router.post('/updateRoundId', async(req, res) => {
    try {
      const room = await collection_room.findOne({"roomCode":req.body.roomId});
      if (room.sellingRoundNumber === req.body.roundId) {
        const sellingRoundNumber = parseInt(room.sellingRoundNumber, 10) + 1;
        let serverRoom = rooms[req.body.roomId];
        await collection_room.findOneAndUpdate({"roomCode":req.body.roomId},{$set:{
          "sellingRoundNumber": sellingRoundNumber,
          "hadLocationPageTimerEnded": false,
          "locationPhaseTimerValue": {},
          "sellPaintingTimerValue": {},
          "hasSellPaintingTimerEnded": false,
          "sellingResultsTimerValue": {},
          "hasSellingResultsTimerEnded": false,
        }});
        res.status(200).json({ message: "updated" });
        serverRoom = {
          ...serverRoom,
          sellingRoundNumber: room.sellingRoundNumber,
          hadLocationPageTimerEnded: false,
          locationPhaseTimerValue: {},
          sellPaintingTimerValue: {},
          hasSellPaintingTimerEnded: false,
          sellingResultsTimerValue: {},
          hasSellingResultsTimerEnded: false,
        }
      } else {
        res.status(200).json({ message: "updated" });
      }
    } catch(e) {
      res.status(500).json(e);
    }
  })

  router.get('/getSellingInfo', (req,res) =>{

    var selling_info = new Object();
    const room = rooms[req.query.roomId];
    collection_room.findOne({"roomCode":req.query.roomId})
    .then(results => {
      if(!results) res.status(404).json({error: 'Room not found'})
      else {
        selling_info.artifacts = results.leaderBoard[req.query.teamName]

        collection.findOne({"cityId":parseInt(req.query.locationId,10)})
        .then(results_city => {
          selling_info.city = results_city;

          //selling phase timer value
          if (room && room.hasSellPaintingTimerEnded) {
            selling_info.sellPaintingTimerValue = {};
          }
          if (room && Object.keys(room.sellPaintingTimerValue).length > 0) {
            selling_info.sellPaintingTimerValue = room.sellPaintingTimerValue;
          } else {
            const currentTime = Date.parse(new Date());
            const deadline = new Date(currentTime + 0.3 * 60 * 1000);
            const timerValue = getRemainingTime(deadline);
            setInterval(() => startSellingServerTimer(req.query.roomId, deadline), 1000);
            selling_info.sellPaintingTimerValue = timerValue;
          }

          collection_visits.find({"roomId":req.query.roomId,locations: {$in: [parseInt(req.query.locationId,10)]}}).toArray()
          .then(results_visits => {
            var otherTeams = [];
            results_visits.forEach(function(visit,index) {
              if (otherTeams.includes(visit.teamName) === false) otherTeams.push(visit.teamName);
            });

            selling_info.otherteams = otherTeams;
            res.status(200).json(selling_info);
          });
        });
      }
    })
    .catch(error => {console.error(error)})
  });

  router.get('/getSellingResultForRound', (req, res) => {
    const { roundId, roomCode } = req.query;
    const room = rooms[roomCode];
    var selling_round_results = new Object();
    collection_room.findOne({"roomCode": roomCode})
    .then(results => {
      if(!results) res.status(404).json({error: 'Room not found'})
      else {
          const leaderboard = results.leaderBoard;
          const paintingsResults = Object.entries(leaderboard).reduce((acc, [key, value]) => {
            const result = value.map(val => val.auctionObj);
            acc[key] = result;
            return acc;
          }, []);
          selling_round_results.allTeamPaintings = paintingsResults;
          selling_round_results.calculatedRevenueForRound = results?.calculatedRoundRevenue[roundId] || {};
          //selling phase timer value
          if (results && results.hasSellingResultsTimerEnded) {
            selling_round_results.sellPaintingTimerValue = {};
          }
          if (results && Object.keys(results.sellingResultsTimerValue).length > 0) {
            selling_round_results.sellingResultsTimerValue = room.sellingResultsTimerValue;
          } else {
            const currentTime = Date.parse(new Date());
            const deadline = new Date(currentTime + 0.3 * 60 * 1000);
            const timerValue = getRemainingTime(deadline);
            setInterval(() => startSellingResultsServerTimer(roomCode, deadline), 1000);
            selling_round_results.sellingResultsTimerValue = timerValue;
          }
          res.status(200).json(selling_round_results);
        }
    })
    .catch(error => {console.error(error)})
  });

function getVisitData(keys,roomCode){
  return new Promise((resolve1, reject1) => {
    var visitObjects = [];

    var bar = new Promise((resolve, reject) => {
      keys.forEach(function(key,index) {
       
        var bar2 = new Promise((resolve2, reject2) => {
          
          collection_visits.find({"roomId":roomCode,"teamName":key}).toArray()
          .then(teamVisits => {
            if(!teamVisits)
              console.log("visits not found")
            else{
              var teamVisit = new Object();
              teamVisit.teamName = key;
              teamVisit.visitCount = 0;
              teamVisit.currentLocation = 2;
              teamVisits.forEach(function(visit,index) {
                const visitCounts = visit?.locations?.length || 0;
                teamVisit.visitCount += visitCounts || 0;
                teamVisit.currentLocation = visit?.locationId || 2;
              });
            }
            resolve2(teamVisit);
          });
        });
        bar2.then(teamVisit => {
          visitObjects.push(teamVisit);
          if(index == keys.length -1)
            resolve();
        }); 
      });
    });
    bar.then(() => {
     resolve1(visitObjects);
    });
  });
}


})
.catch(error => console.error(error))


module.exports = router;