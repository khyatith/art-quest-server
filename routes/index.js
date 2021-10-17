const express = require("express");
const router = express.Router();
const dbClient = require('../mongoClient');
const { getRemainingTime, getLeaderboard, calculateTotalAmountSpent, calculateBuyingPhaseWinner, calculatePaintingQualityAndTotalPoints, getNextObjectForLiveAuction } = require("../helpers/game");
var mod = require("../constants");
let rooms = mod.rooms;
const dbClient = require('../mongoClient');




let db;

router.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
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

  //painting quality avg & total points
  const averagebyTeam = await calculatePaintingQualityAndTotalPoints(room);
  room.paintingQualityAvg = averagebyTeam.paintingQualityResult;
  room.totalPointsAvg = averagebyTeam.totalPointsResult;
  const result = JSON.stringify({ leaderboard, totalAmountByTeam, paintingQualityAvg: averagebyTeam.paintingQualityResult, totalPointsAvg: averagebyTeam.totalPointsResult });
  await collection.findOneAndUpdate({"hostCode":hostCode},{$set:rooms[hostCode]});
  res.send(result);
});

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
  if (parsedRoom.winner) return parsedRoom.winner;
  const winner = calculateBuyingPhaseWinner(parsedRoom);
  res.send({ winner, leaderboard: parsedRoom.leaderBoard });
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
  console.log('----------inside auction timer code------');
  const { params } = req;
  const hostCode = params.hostCode;
  let room = rooms[hostCode];
  let auctionObj = room.auctions.artifacts.filter((item) => parseInt(item.id) === parseInt(params.auctionId));
  if (!auctionObj) return;
  const currentAuctionObj = auctionObj[0];
  console.log('----------currentAuctionObj------', currentAuctionObj);
  if (currentAuctionObj && currentAuctionObj.hasAuctionTimerEnded) {
    console.log('inside has Auction timer ended condition');
    res.send({ currentAuctionObjTimer: {} });
    return;
  }
  if (currentAuctionObj && Object.keys(currentAuctionObj.auctionTimerValue).length > 0) {
    console.log('-----timer value already generated, returning value to client-----', currentAuctionObj.auctionTimerValue);
    res.send({ currentAuctionObjTimer: currentAuctionObj.auctionTimerValue });
  } else {
    const currentTime = Date.parse(new Date());
    const deadline = new Date(currentTime + 0.5 * 60 * 1000);
    const timerValue = getRemainingTime(deadline);
    setInterval(() => startAuctionServerTimer(room, currentAuctionObj, deadline), 1000);
    console.log('-----timer value generated-----', timerValue);
    res.send({ currentAuctionObjTimer: timerValue });
  }
});

const startAuctionServerTimer = (room, currentAuctionObj, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    console.log('-----inside timer value <= 0----', timerValue )
    currentAuctionObj.hasAuctionTimerEnded = true;
    currentAuctionObj.auctionTimerValue = {};
  } else if (room && timerValue.total > 0) {
    console.log('----inside timer value > 0-----', timerValue);
    currentAuctionObj.auctionTimerValue = timerValue;
  }
  // room.auctions.artifacts.forEach(item => {
  //   if (item.id === currentAuctionObj.id) {
  //     item = currentAuctionObj
  //   }
  // });
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

  router.get('/getMap', (req,res) =>{
      collection.find({}).toArray()
      .then(results => {
        if(!results) res.status(404).json({error: 'Cities not found'})
        else res.status(200).json(results)
      })
      .catch(error => {console.error(error)})
  });
})
.catch(error => console.error(error))


module.exports = router;