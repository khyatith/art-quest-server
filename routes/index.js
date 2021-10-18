const express = require("express");
const router = express.Router();
const dbClient = require('../mongoClient');
const { getRemainingTime, getLeaderboard, calculateTotalAmountSpent, calculateBuyingPhaseWinner } = require("../helpers/game");
var mod = require("../constants");
let rooms = mod.rooms;

router.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

router.get('/timer/:hostCode', function (req, res) {
  const { params } = req;
  const hostCode = params.hostCode;
  let room = rooms[hostCode];
  if (room.hasLandingPageTimerEnded) {
    res.send({ landingPageTimerValue: {} });
    return;
  }
  if (Object.keys(room.landingPageTimerValue).length > 0) {
    res.send({ landingPageTimerValue: room.landingPageTimerValue });
  } else {
    const currentTime = Date.parse(new Date());
    const deadline = new Date(currentTime + 0.3 * 60 * 1000);
    const timerValue = getRemainingTime(deadline);
    setInterval(() => startServerTimer(room, deadline), 1000);
    res.send({ landingPageTimerValue: timerValue });
  }
})

router.get('/getResults/:hostCode', async (req, res) => {
  const db = await dbClient.createConnection();
  const collection = db.collection('room');
  const { params } = req;
  const hostCode = params.hostCode;
  const leaderboard = await getLeaderboard(rooms, hostCode);
  rooms[hostCode].leaderBoard = leaderboard;
  const totalAmountByTeam = await calculateTotalAmountSpent(leaderboard, hostCode, rooms);
  rooms[hostCode].totalAmountSpentByTeam = totalAmountByTeam;
  const result = JSON.stringify({ leaderboard, totalAmountByTeam });
  await collection.findOneAndUpdate({"hostCode":hostCode},{$set:rooms[hostCode]});
  res.send(result);
})

const startServerTimer = (room, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (timerValue.total <= 0) {
    room.hasLandingPageTimerEnded = true;
    room.landingPageTimerValue = {};
  } else if (timerValue.total > 0) {
    room.landingPageTimerValue = timerValue;
  }
}

module.exports = router;