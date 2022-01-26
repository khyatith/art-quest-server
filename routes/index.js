const express = require("express");
const router = express.Router();
const dbClient = require('../mongoClient');
const {
  getRemainingTime,
  getLeaderboard,
  calculateTotalAmountSpent,
  calculateBuyingPhaseWinner,
  getNextObjectForLiveAuction,
  createTeamRankForBuyingPhase,
  updateDutchAuctionLeaderboard,
  getSecondPricedSealedBidWinner,
  getWinningEnglishAuctionBid,
  calculateTeamEfficiency,
  calculateTotalArtScore,
} = require("../helpers/game");
router.use(express.json());
var mod = require("../constants");
let rooms = mod.rooms;
const { nanoid } = require('nanoid');

let db;

const startAuctionServerTimer = (room, currentAuctionObj, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    currentAuctionObj.hasAuctionTimerEnded = true;
    currentAuctionObj.auctionTimerValue = {};
  } else if (room && timerValue.total > 0) {
    currentAuctionObj.auctionTimerValue = timerValue;
  }
}

const startDutchAuctionTimer = (room, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    room.hasDutchAuctionTimerEnded = true;
    room.dutchAuctionTimerValue = {};
  } else if (room && timerValue.total > 0) {
    room.dutchAuctionTimerValue = timerValue;
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


const startLocationPhaseServerTimer = async (hostCode, deadline) => {
  let timerValue = getRemainingTime(deadline);
  const serverRoom = rooms[hostCode];
  if (timerValue.total <= 0) {
    serverRoom.hadLocationPageTimerEnded = true;
    serverRoom.locationPhaseTimerValue = {};
  } else if (timerValue.total > 0) {
    serverRoom.locationPhaseTimerValue = timerValue;
  }
}

const startSellingServerTimer = async (serverRoom, deadline) => {
  let sellingPhaseTimerValue = getRemainingTime(deadline);
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

const startAuctionResultTimer = (room, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    room.hasAuctionResultTimerEnded = true;
    room.auctionResultTimerValue = {};
  } else if (room && timerValue.total > 0) {
    room.auctionResultTimerValue = timerValue;
  }
}

router.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

router.get('/getUID', (req, res) => {
  res.send(nanoid(5));
});

router.get('/getVersionID/:hostCode', (req, res) => {
  const { params } = req;
  const hostCode = params.hostCode;
  let room = rooms[hostCode];
  res.send({ version: room.version });
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

  const totalArtScoreForTeams = await calculateTotalArtScore(leaderboard);
  room.totalArtScoreForTeams = totalArtScoreForTeams;

  room.totalPaintingsWonByTeam = teamStats.totalPaintingsWonByTeams;

  const teamRanks = createTeamRankForBuyingPhase(teamStats.totalPaintingsWonByTeams, teamStats.efficiencyByTeam, room.auctions.artifacts.length);

  const result = JSON.stringify({ leaderboard, totalAmountByTeam, totalPaintingsWonByTeams: teamStats.totalPaintingsWonByTeams, teamRanks, totalArtScoreForTeams });
  await collection.findOneAndUpdate({ "hostCode": hostCode }, { $set: rooms[hostCode] });
  res.send(result);
});

router.put('/updateDutchAuctionResults/:hostCode', async(req, res) => {
  db = await dbClient.createConnection();
  const collection = db.collection('room');
  const { params } = req;
  const hostCode = params.hostCode;
  const room = rooms[hostCode];

  //update leaderboard with dutch auctions
  const dutchAuctionLeaderboard = await updateDutchAuctionLeaderboard(room);
  room.leaderBoard = dutchAuctionLeaderboard;

  //update total amount by team with dutch auctions
  const totalAmountByTeam = await calculateTotalAmountSpent(dutchAuctionLeaderboard, hostCode, rooms);
  room.totalAmountSpentByTeam = totalAmountByTeam;
  await collection.findOneAndUpdate({ "hostCode": hostCode }, { $set: { "leaderBoard": room.leaderBoard, "totalAmountSpentByTeam": room.totalAmountSpentByTeam } });
  res.send({ message: "updated" });
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
  if (parsedRoom && parsedRoom.winner) return parsedRoom.winner;
  const winnerData = calculateBuyingPhaseWinner(parsedRoom);
  res.send(winnerData);
});

router.get('/getNextAuction/:hostCode/:prevAuctionId', async (req, res) => {
  let db = await dbClient.createConnection();
  const collection = db.collection('room');
  const { hostCode, prevAuctionId } = req.params;
  const room = await collection.findOne({ 'hostCode': hostCode });
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
  await collection.findOneAndUpdate({ "hostCode": hostCode }, { $set: udpatedParsedRoom });
  res.send(returnObj.newAuction)
});

router.get('/getAuctionResults/:hostCode/:auctionId/:auctionType', async (req, res) => {
  let db = await dbClient.createConnection();
  const collection = db.collection('room');
  const { hostCode, auctionId, auctionType } = req.params;
  const room = await collection.findOne({ 'hostCode': hostCode });
  let auction_result = {};
  let data = [];
  let auctionWinner = {};
  if (room) {
    switch (auctionType) {
      case '1':
        data = room.firstPricedSealedBids[`${auctionId}`];
        if (data) {
          const fpsbWinner = data.reduce((acc, obj) => {
            const accBid = parseInt(acc.bidAmount);
            const objBid = parseInt(obj.bidAmount);
            if (accBid === objBid) {
              if (acc.bidAt < obj.bidAt) {
                return acc;
              } else {
                return obj;
              }
            }
            return (accBid > objBid) ? acc : obj;
          }, {});
          auctionWinner = {
            team: fpsbWinner?.bidTeam,
            bid: fpsbWinner?.bidAmount,
            paintingName: data[0]?.auctionObj?.name,
          };
        } else {
          data = [];
        }
        break;
      case '2':
        data = room.englishAuctionBids[`${auctionId}`];
        const maxBidsObj = room.maxEnglishAuctionBids;
        if ((!data || Object.keys(data).length === 0) && !maxBidsObj[`${auctionId}`]) {
          auctionWinner = {};
          data = [];
          break;
        }
        const EAWinner = getWinningEnglishAuctionBid(maxBidsObj, data, auctionId);
        auctionWinner = {
          team: EAWinner.EAWinningTeam,
          bid: EAWinner.EAWinnerBid,
          paintingName: data?.auctionObj?.name,
        }
        if (Object.keys(maxBidsObj).length > 0 && maxBidsObj[`${auctionId}`]) {
          maxBidsObj[`${auctionId}`].push(data);
          data = maxBidsObj[`${auctionId}`];
        } else {
          data = [data];
        }
        break;
      case '3':
        data = room.secondPricedSealedBids[`${auctionId}`];
        if (!data) {
          auctionWinner = {};
          data = [];
        } else {
          auctionWinner = {
            ...getSecondPricedSealedBidWinner(data),
            paintingName: data[0]?.auctionObj?.name,
          }
        }
        break;
      default:
        data = [];
        break;
    }
    // auction result timer
    if (room && room.hasAuctionResultTimerEnded) {
      auction_result.auctionResultTimerValue = {};
    }
    if (room && Object.keys(room.auctionResultTimerValue).length > 0) {
      auction_result.auctionResultTimerValue = room.auctionResultTimerValue;
    } else {
      const currentTime = Date.parse(new Date());
      const deadline = new Date(currentTime + 0.3 * 60 * 1000);
      const timerValue = getRemainingTime(deadline);
      setInterval(() => startAuctionResultTimer(room, deadline), 1000);
      auction_result.auctionResultTimerValue = timerValue;
    }
    auction_result.result = data;
    auction_result.winner = auctionWinner;
    res.status(200).json(auction_result);
  }
});

router.get('/getDutchAuctionData/:hostCode', async (req, res) => {
  let db = await dbClient.createConnection();
  const collection = db.collection('room');
  const { hostCode } = req.params;
  const room = await collection.findOne({ 'hostCode': hostCode });
  const order = [];
  if (room.dutchAuctionsOrder.length === 0) {
    for (var i = 0; i < 5; ++i) {
      let array = [0, 1, 2, 3];
      let currentIndex = array.length, randomIndex;
      while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
      }
      order.push.apply(order, array);
    }
  }
  else {
    order.push.apply(order, room.dutchAuctionsOrder);
  }
  const updateRoom = rooms[hostCode];
  updateRoom.dutchAuctionsOrder = order;
  await collection.findOneAndUpdate({ "hostCode": hostCode }, { $set: updateRoom });
  let val = {};
  if (updateRoom && updateRoom.hasDutchAuctionTimerEnded) {
    val = {};
  }
  else if (updateRoom && Object.keys(updateRoom.dutchAuctionTimerValue).length > 0) {
    val = updateRoom.dutchAuctionTimerValue;
  } else {
    const currentTime = Date.parse(new Date());
    const deadline = new Date(currentTime + 0.2 * 60 * 1000);
    const timerValue = getRemainingTime(deadline);
    setInterval(() => startDutchAuctionTimer(updateRoom, deadline), 1000);
    val = timerValue;
  }
  res.send({ dutchAuctions: room.dutchAuctions, dutchAuctionsOrder: order, dutchAuctionTimerValue: val });
});

router.get('/auctionTimer/:hostCode/:auctionId', function (req, res) {
  const { params } = req;
  const hostCode = params.hostCode;
  let room = rooms[hostCode];
  let auctionObj = room.auctions.artifacts.filter((item) => parseInt(item.id) === parseInt(params.auctionId));
  if (!auctionObj) return;
  const currentAuctionObj = auctionObj[0];
  const timerValueForAuction = currentAuctionObj.auctionType === '2' ? 1 : 0.7;
  if (currentAuctionObj && currentAuctionObj.hasAuctionTimerEnded) {
    res.send({ currentAuctionObjTimer: {} });
    return;
  }
  if (currentAuctionObj && Object.keys(currentAuctionObj.auctionTimerValue).length > 0) {
    res.send({ currentAuctionObjTimer: currentAuctionObj.auctionTimerValue });
  } else {
    const currentTime = Date.parse(new Date());
    const deadline = new Date(currentTime + timerValueForAuction * 60 * 1000);
    const timerValue = getRemainingTime(deadline);
    setInterval(() => startAuctionServerTimer(room, currentAuctionObj, deadline), 1000);
    res.send({ currentAuctionObjTimer: timerValue });
  }
});

var mongoClient = dbClient.createConnection();

mongoClient.then(db => {

  const collection = db.collection('city');
  const collection_visits = db.collection('visits');
  const collection_room = db.collection('room');

  router.get('/validatePlayerId/:hostCode', async (req, res) => {
    const { params } = req;
    const { hostCode } = params;
    const room = await collection_room.findOne({ 'hostCode': hostCode });
    if (room) {
      const parsedRoom = room;
      const { hasLandingPageTimerEnded } = parsedRoom;
      // This means the game has already started and player cant join
      if (hasLandingPageTimerEnded) {
        res.send({ type: "error", message: "This game is already in progress. Please ask the admin to give you a new code." });
        return;
      }
      res.send({ type: "success" });
    } else {
      // This means the client has entered a wrong room code
      res.send({ type: "error", message: "Invalid code. Enter the code again!" })
    }
  });

  router.get('/getMap', (req, res) => {
    collection.find({}).toArray()
      .then(results => {
        if (!results) res.status(404).json({ error: 'Cities not found' })
        else res.status(200).json(results)
      })
      .catch(error => { console.error(error) })
  });

  router.get('/getSellingResults', async (req, res) => {
    var selling_result = new Object();
    const { roomId } = req.query;
    const results = await collection_room.findOne({ "roomCode": roomId });
    const room = rooms[roomId];
    if (!results) {
      res.status(404).json({ error: 'Room not found' });
    } else {
      selling_result.amountSpentByTeam = results.totalAmountSpentByTeam;
      selling_result.totalArtScoreForTeams = results.totalArtScoreForTeams;
      selling_result.roundNumber = results.sellingRoundNumber;
      selling_result.players = results.players;
      var keys = results.allTeams;

      //location phase timer value
      if (room && room.hadLocationPageTimerEnded) {
        selling_result.locationPhaseTimerValue = {};
      }
      if (room && Object.keys(room.locationPhaseTimerValue).length > 0) {
        selling_result.locationPhaseTimerValue = room.locationPhaseTimerValue;
      } else {
        const currentTime = Date.parse(new Date());
        const deadline = new Date(currentTime + 0.2 * 60 * 1000);
        const timerValue = getRemainingTime(deadline);
        setInterval(() => startLocationPhaseServerTimer(roomId, deadline), 1000);
        selling_result.locationPhaseTimerValue = timerValue;
      }
      const visitObjects = await getVisitData(keys, roomId);
      selling_result.visits = visitObjects;
      console.log('selling_Results', selling_result);
      res.status(200).json(selling_result);
    }
  });

  router.post('/updateRoundId', async (req, res) => {
    try {
      const room = await collection_room.findOne({ "roomCode": req.body.roomId });
      if (room.sellingRoundNumber === req.body.roundId) {
        const { sellingArtifacts } = room.sellingAuctions;
        sellingArtifacts.forEach((obj) => {
          if (obj.auctionState === 1) {
            obj.auctionState = 2;
          }
        });
        const sellingRoundNumber = parseInt(room.sellingRoundNumber, 10) + 1;
        let serverRoom = rooms[req.body.roomId];
        await collection_room.findOneAndUpdate({ "roomCode": req.body.roomId }, {
          $set: {
            "sellingRoundNumber": sellingRoundNumber,
            "hadLocationPageTimerEnded": false,
            "locationPhaseTimerValue": {},
            "sellPaintingTimerValue": {},
            "hasSellPaintingTimerEnded": false,
            "sellingResultsTimerValue": {},
            "hasSellingResultsTimerEnded": false,
            "sellingAuctions": { "sellingArtifacts": sellingArtifacts }
          }
        });
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
    } catch (e) {
      res.status(500).json(e);
    }
  })

  router.get('/getSellingInfo', (req, res) => {

    var selling_info = new Object();
    const room = rooms[req.query.roomId];
    const roomId = req.query.roomId;
    const locationId = req.query.locationId;
    const teamName = req.query.teamName;
    const roundId = req.query.roundId;
    collection_visits.findOne({"roomId":roomId, "teamName": teamName}).then(existingRecord => {
    if (existingRecord) {
      if (existingRecord.roundNumber === roundId) {
        return;
      }
      collection_visits.findOneAndUpdate({"roomId":roomId, "teamName": teamName},{$set:{"roomId": roomId, "locationId": locationId, "teamName": teamName,"roundNumber": roundId}, $push:{allVisitLocations:locationId}}, {upsert:true});
    } else {
      collection_visits.insertOne({"roomId":roomId, "teamName": teamName, "locationId": locationId, "locations":[], "allVisitLocations": [locationId],"roundNumber": roundId});
    }});
    collection_room.findOne({ "roomCode": req.query.roomId })
      .then(results => {
        if (!results) res.status(404).json({ error: 'Room not found' })
        else {
          selling_info.artifacts = results.leaderBoard[req.query.teamName]

          collection.findOne({ "cityId": parseInt(req.query.locationId, 10) })
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
                const deadline = new Date(currentTime + 0.2 * 60 * 1000);
                const timerValue = getRemainingTime(deadline);
                setInterval(() => startSellingServerTimer(room, deadline), 1000);
                selling_info.sellPaintingTimerValue = timerValue;
              }

              collection_visits.find({ "roomId": req.query.roomId, locationId: parseInt(req.query.locationId, 10) }).toArray()
                .then(results_visits => {
                  var otherTeams = [];
                  results_visits.forEach(function (visit, index) {
                    if (otherTeams.includes(visit.teamName) === false) otherTeams.push(visit.teamName);
                  });
                  selling_info.otherteams = otherTeams;
                  res.status(200).json(selling_info);
                });
            });
        }
      })
      .catch(error => { console.error(error) })
  });

  router.get('/getEnglishAuctionForSelling', (req, res) => {
    const { roomCode } = req.query;
    var sellingAuctionObj = new Object();
    collection_room.findOne({ "roomCode": roomCode })
      .then(async (results) => {
        const { sellingArtifacts } = results.sellingAuctions;
        const currentAuction = sellingArtifacts.filter((obj) => obj.auctionState === 1);
        if (currentAuction.length > 0) {
          sellingAuctionObj = currentAuction[0];
          res.status(200).json({ auctionObj: sellingAuctionObj });
          return;
        } else {
          const sellingAuctionObj = sellingArtifacts.find((obj) => obj.auctionState === 0);
          if (sellingAuctionObj) {
            sellingAuctionObj.auctionState = 1;
            sellingArtifacts.forEach((obj) => {
              if (obj.id === sellingAuctionObj.id) {
                obj.auctionState = 1;
              }
            });
            res.status(200).json({ auctionObj: sellingAuctionObj });
            await collection_room.findOneAndUpdate({ "hostCode": roomCode }, {
              $set: {
                "sellingAuctions": { "sellingArtifacts": sellingArtifacts }
              }
            });
          }
          return;
        }
      })
  })

  router.get('/getSellingResultForRound', (req, res) => {
    const { roundId, roomCode } = req.query;
    const room = rooms[roomCode];
    var selling_round_results = new Object();
    collection_room.findOne({ "roomCode": roomCode })
      .then(results => {
        if (!results) res.status(404).json({ error: 'Room not found' })
        else {
          const leaderboard = results.leaderBoard;
          const paintingsResults = Object.entries(leaderboard).reduce((acc, [key, value]) => {
            const result = value.map(val => {
              return {
                auctionId: val.auctionId,
                paintingURL: val.auctionObj.imageURL,
              }
            });
            acc = {
              ...acc,
              [key]: result
            }
            return acc;
          }, {});
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
            const deadline = new Date(currentTime + 0.2 * 60 * 1000);
            const timerValue = getRemainingTime(deadline);
            setInterval(() => startSellingResultsServerTimer(roomCode, deadline), 1000);
            selling_round_results.sellingResultsTimerValue = timerValue;
          }
          res.status(200).json(selling_round_results);
        }
      })
      .catch(error => { console.error(error) })
  });

  router.post('/updateEnglishAuctionResults', async (req, res) => {
    const { roomId, auctionId } = req.body;
    const currentRoom = rooms[roomId];
    const auctionItem = currentRoom.englishAuctionBids[auctionId];
    if (auctionItem) {
      const roomInServer = await collection_room.findOne({ "roomCode": roomId });
      const leaderboard = roomInServer.leaderBoard;
      let totalAmountSpentByTeam = roomInServer.totalAmountSpentByTeam;
      let totalArtScoreForTeam = roomInServer.totalArtScoreForTeams;
      const leaderBoardKeys = Object.keys(leaderboard);
      const EAwinningTeam = auctionItem.bidTeam;

      //update total amount spent by team
      if (totalAmountSpentByTeam[EAwinningTeam]) {
        totalAmountSpentByTeam[EAwinningTeam] = totalAmountSpentByTeam[EAwinningTeam] - auctionItem.bidAmount;
      } else {
        totalAmountSpentByTeam[EAwinningTeam] = 0 - auctionItem.bidAmount;
      }
      roomInServer.totalAmountSpentByTeam = totalAmountSpentByTeam;

      //update art score for team
      if (totalArtScoreForTeam[EAwinningTeam]) {
        totalArtScoreForTeam[EAwinningTeam] = parseFloat(totalArtScoreForTeam[EAwinningTeam]) + parseFloat(auctionItem.paintingQuality);
      } else {
        totalArtScoreForTeam[EAwinningTeam] = parseFloat(auctionItem.paintingQuality);
      }
      roomInServer.totalArtScoreForTeams = totalArtScoreForTeam;
      //update team leaderboard
      if (leaderBoardKeys && leaderBoardKeys.includes(EAwinningTeam)) {
        const isExistingAuctionForTeam = leaderboard[EAwinningTeam].filter(item => item.auctionObj.id === auctionId);
        if (isExistingAuctionForTeam.length === 0) {
          leaderboard[`${EAwinningTeam}`].push(auctionItem);
        } else {
          res.status(200).json({ message: "already updated" });
          return;
        }
      } else {
        leaderboard[`${EAwinningTeam}`] = [auctionItem];
      }
      await collection_room.findOneAndUpdate({ "hostCode": roomId }, { $set: roomInServer });
    }
    res.status(200).json({ message: "updated" });
  });

  const getVisitData = async (keys, roomCode) => {
    let teamVisit = [];
    const getDataByTeamName = async (key) => {
      const result = await collection_visits.find({ "roomId": roomCode, "teamName": key }).toArray();
      return result;
    }

    const unresolvedPromises = keys.map(key => getDataByTeamName(key));
    const allVisitsByTeams = await Promise.all(unresolvedPromises);
    if (allVisitsByTeams.length === 0) {
      teamVisit = keys.reduce((acc, key) => {
        acc.push({
          teamName: key,
          visitCount: 0,
          currentLocation: 2,
          allVisitLocations: [],
        });
        return acc;
      }, []);
    } else {
      teamVisit = allVisitsByTeams.reduce((acc, visit) => {
        const v = visit[0];
        if (v) {
          acc.push({
            teamName: v.teamName,
            visitCount: v.locations.length || 0,
            currentLocation: v.locationId || 2,
            allVisitLocations: v.allVisitLocations || [],
          });
        }
        return acc;
      }, []);
    }

    return teamVisit;
  }
})
  .catch(error => console.error(error))


module.exports = router;