const express = require("express");
const router = express.Router();
const dbClient = require("../mongoClient");
const {
  getRemainingTime,
  getLeaderboard,
  calculateTotalAmountSpent,
  calculateBuyingPhaseWinner,
  getNextObjectForLiveAuction,
  updateDutchAuctionLeaderboard,
  getSecondPricedSealedBidWinner,
  getWinningEnglishAuctionBid,
  calculateTeamEfficiency,
  updateLeaderBoardAfterNominationAuction,
} = require("../helpers/game");
router.use(express.json());
var mod = require("../constants");
let rooms = mod.rooms;
const { nanoid } = require("nanoid");
const { visitedLocationDetails } = require("../helpers/location-visits");
const { calculate } = require("../helpers/classify-points");

let db;

const startAuctionServerTimer = (room, currentAuctionObj, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    currentAuctionObj.hasAuctionTimerEnded = true;
    currentAuctionObj.auctionTimerValue = {};
  } else if (room && timerValue.total > 0) {
    currentAuctionObj.auctionTimerValue = timerValue;
  }
};

const startDutchAuctionTimer = (room, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    room.hasDutchAuctionTimerEnded = true;
    room.dutchAuctionTimerValue = {};
  } else if (room && timerValue.total > 0) {
    room.dutchAuctionTimerValue = timerValue;
  }
};

const startServerTimer = (room, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    room.hasLandingPageTimerEnded = true;
    room.landingPageTimerValue = {};
  } else if (room && timerValue.total > 0) {
    room.landingPageTimerValue = timerValue;
  }
};

const startEnglishAuctionTimer = (room, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    room.hasEnglishAuctionTimerEnded = true;
    room.englishAuctionTimer = {};
  } else if (room && timerValue.total > 0) {
    room.englishAuctionTimer = timerValue;
  }
};

const startSecretAuctionTimer = (room, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    room.hasSecretAuctionTimerEnded = true;
    room.secretAuctionTimer = {};
  } else if (room && timerValue.total > 0) {
    room.secretAuctionTimer = timerValue;
  }
};

const startSecondPriceAuctionTimer = (room, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    room.hasSecondPriceAuctionTimerEnded = true;
    room.secondPriceAuctionTimer = {};
  } else if (room && timerValue.total > 0) {
    room.secondPriceAuctionTimer = timerValue;
  }
};

const startLocationPhaseServerTimer = async (hostCode, deadline) => {
  let timerValue = getRemainingTime(deadline);
  const serverRoom = rooms[hostCode];
  if (timerValue.total <= 0) {
    serverRoom.hadLocationPageTimerEnded = true;
    serverRoom.locationPhaseTimerValue = {};
  } else if (timerValue.total > 0) {
    serverRoom.locationPhaseTimerValue = timerValue;
  }
};

const startSellingServerTimer = async (serverRoom, deadline) => {
  let sellingPhaseTimerValue = getRemainingTime(deadline);
  if (sellingPhaseTimerValue.total <= 0) {
    serverRoom.hasSellPaintingTimerEnded = true;
    serverRoom.sellPaintingTimerValue = {};
  } else if (sellingPhaseTimerValue.total > 0) {
    serverRoom.sellPaintingTimerValue = sellingPhaseTimerValue;
  }
};
const startNominatedAuctionServerTimer = async (serverRoom, deadline) => {
  let nominatedAuctionTimerValue = getRemainingTime(deadline);
  if (nominatedAuctionTimerValue?.total <= 0) {
    serverRoom.hasNominatedAuctionTimerEnded = true;
    serverRoom.nominatedAuctionTimerValue = {};
  } else if (nominatedAuctionTimerValue?.total > 0) {
    serverRoom.nominatedAuctionTimerValue = nominatedAuctionTimerValue;
  }
};

const startSellingResultsServerTimer = async (hostCode, deadline) => {
  let sellingPhaseTimerValue = getRemainingTime(deadline);
  const serverRoom = rooms[hostCode];
  if (sellingPhaseTimerValue.total <= 0) {
    serverRoom.hasSellingResultsTimerEnded = true;
    serverRoom.sellingResultsTimerValue = {};
  } else if (sellingPhaseTimerValue.total > 0) {
    serverRoom.sellingResultsTimerValue = sellingPhaseTimerValue;
  }
};

const startAuctionResultTimer = (room, deadline) => {
  let timerValue = getRemainingTime(deadline);
  if (room && timerValue.total <= 0) {
    room.hasAuctionResultTimerEnded = true;
    room.auctionResultTimerValue = {};
  } else if (room && timerValue.total > 0) {
    room.auctionResultTimerValue = timerValue;
  }
};

router.get("/collection_visits", async (req, res) => {
  db = await dbClient.createConnection();
  const collection_visits = db.collection("visits");
  const visits_room = await collection_visits.find({ roomId: "5ZB7L" });
});

router.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

router.get("/getUID", (req, res) => {
  res.send(nanoid(5));
});

router.get("/getVersionID/:hostCode", (req, res) => {
  const { params } = req;
  const hostCode = params.hostCode;
  let room = rooms[hostCode];
  res.send({ version: room.version });
});

router.get("/timer/:hostCode", function (req, res) {
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
    const deadline = new Date(currentTime + 0.1 * 60 * 1000); //0.2
    const timerValue = getRemainingTime(deadline);
    setInterval(() => startServerTimer(room, deadline), 1000);
    res.send({ landingPageTimerValue: timerValue });
  }
});

router.get(
  "/englishauctionTimer/:hostCode/:englishAuctionsNumber",
  (req, res) => {
    const { params } = req;
    const hostCode = params.hostCode;
    let room = rooms[hostCode];
    if (params.englishAuctionsNumber !== room.auctionNumber) {
      room.hasEnglishAuctionTimerEnded = false;
      room.englishAuctionTimer = {};
    }
    if (room && room.hasEnglishAuctionTimerEnded) {
      res.send({ englishAuctionTimer: {} });
      return;
    }
    if (room && Object.keys(room.englishAuctionTimer).length > 0) {
      res.send({ englishAuctionTimer: room.englishAuctionTimer });
    } else {
      const currentTime = Date.parse(new Date());
      const deadline = new Date(currentTime + 0.1 * 60 * 1000); // 0.5
      const timerValue = getRemainingTime(deadline);
      setInterval(() => startEnglishAuctionTimer(room, deadline), 1000);
      res.send({ englishAuctionTimer: timerValue });
    }
  }
);

router.get(
  "/secretauctionTimer/:hostCode/:secretAuctionsNumber",
  (req, res) => {
    const { params } = req;
    const hostCode = params.hostCode;
    let room = rooms[hostCode];
    if (params.secretAuctionsNumber !== room.auctionNumber) {
      room.hasSecretAuctionTimerEnded = false;
      room.secretAuctionTimer = {};
    }
    if (room && room.hasSecretAuctionTimerEnded) {
      res.send({ secretAuctionTimer: {} });
      return;
    }
    if (room && Object.keys(room.secretAuctionTimer).length > 0) {
      res.send({ secretAuctionTimer: room.secretAuctionTimer });
    } else {
      const currentTime = Date.parse(new Date());
      const deadline = new Date(currentTime + 0.1 * 60 * 1000); // 0.3
      const timerValue = getRemainingTime(deadline);
      setInterval(() => startSecretAuctionTimer(room, deadline), 1000);
      res.send({ secretAuctionTimer: timerValue });
    }
  }
);

router.get('/secondPricedTimer/:hostCode/:secondPricedSealedBidAuctions', (req, res) => {
    const { params } = req;
    const hostCode = params.hostCode;
    let room = rooms[hostCode];
    if (params.secondPricedSealedBidAuctions !== room.auctionNumber) {
      room.hasSecondPriceAuctionTimerEnded = false;
      room.secondPriceAuctionTimer = {};
    }
    if (room && room.hasSecondPriceAuctionTimerEnded) {
      res.send({ secondPriceAuctionTimer: {} });
      return;
    }
    if (room && Object.keys(room.secondPriceAuctionTimer).length > 0) {
      res.send({ secondPriceAuctionTimer: room.secondPriceAuctionTimer });
    } else {
      const currentTime = Date.parse(new Date());
      const deadline = new Date(currentTime + 0.1 * 60 * 1000);// 0.3
      const timerValue = getRemainingTime(deadline);
      setInterval(() => startSecondPriceAuctionTimer(room, deadline), 1000);
      res.send({ secondPriceAuctionTimer: timerValue });
    }
  }
);

router.get("/getResults/:hostCode", async (req, res) => {
  db = await dbClient.createConnection();
  const collection = db.collection("room");
  const collection_classify = db.collection("classify");
  const { params } = req;
  const hostCode = params.hostCode;
  const room = rooms[hostCode];
  //leaderboard
  const leaderboard = await getLeaderboard(rooms, hostCode);
  room.leaderBoard = leaderboard;
  //total amt by teams
  const totalAmountByTeam = await calculateTotalAmountSpent(
    leaderboard,
    hostCode,
    rooms
  );
  room.totalAmountSpentByTeam = totalAmountByTeam;

  const teamStats = await calculateTeamEfficiency(
    totalAmountByTeam,
    leaderboard
  );
  room.teamEfficiency = teamStats.efficiencyByTeam;

  room.totalPaintingsWonByTeam = teamStats.totalPaintingsWonByTeams;

  const classifyObj = await collection_classify.findOne({ roomCode: hostCode });

  // const teamRanks = createTeamRankForBuyingPhase(teamStats.totalPaintingsWonByTeams, teamStats.efficiencyByTeam, room.auctions.artifacts.length);

  const result = JSON.stringify({
    leaderboard,
    totalAmountByTeam,
    totalPaintingsWonByTeams: teamStats.totalPaintingsWonByTeams,
    classifyPoints: classifyObj,
  });
  await collection.findOneAndUpdate(
    { hostCode: hostCode },
    {
      $set: {
        leaderBoard: leaderboard,
        totalAmountSpentByTeam: totalAmountByTeam,
        teamEfficiency: teamStats.efficiencyByTeam,
        totalPaintingsWonByTeam: teamStats.totalPaintingsWonByTeams,
      },
    }
  );
  res.send(result);
});

router.put("/updateDutchAuctionResults/:hostCode", async (req, res) => {
  db = await dbClient.createConnection();
  const collection = db.collection("room");
  const { params } = req;
  const hostCode = params.hostCode;
  const room = rooms[hostCode];
  //update leaderboard with dutch auctions
  const dutchAuctionLeaderboard = await updateDutchAuctionLeaderboard(room);
  room.leaderBoard = dutchAuctionLeaderboard;

  //update total amount by team with dutch auctions
  const totalAmountByTeam = await calculateTotalAmountSpent(
    dutchAuctionLeaderboard,
    hostCode,
    rooms
  );
  room.totalAmountSpentByTeam = totalAmountByTeam;
  await collection.findOneAndUpdate(
    { hostCode: hostCode },
    {
      $set: {
        leaderBoard: room.leaderBoard,
        totalAmountSpentByTeam: room.totalAmountSpentByTeam,
      },
    }
  );
  res.send({ message: "updated" });
});

router.get("/getWinner/:hostCode", async (req, res) => {
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

router.get("/getNextAuction/:hostCode/:prevAuctionId", async (req, res) => {
  let db = await dbClient.createConnection();
  const collection = db.collection("room");
  const { hostCode, prevAuctionId } = req.params;
  const room = await collection.findOne({ hostCode: hostCode });
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
  await collection.findOneAndUpdate(
    { hostCode: hostCode },
    {
      $set: {
        leaderBoard: globalRoom.leaderBoard,
        totalAmountSpentByTeam: globalRoom.totalAmountSpentByTeam,
      },
    }
  );
  res.send(returnObj.newAuction);
});

router.get(
  "/getAuctionResults/:hostCode/:auctionId/:auctionType",
  async (req, res) => {
    let db = await dbClient.createConnection();
    const collection = db.collection("room");
    const { hostCode, auctionId, auctionType } = req.params;
    const room = await collection.findOne({ hostCode: hostCode });
    let auction_result = {};
    let data = [];
    let auctionWinner = {};
    let maxBids = {};
    if (room) {
      switch (auctionType) {
        case "1":
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
              return accBid > objBid ? acc : obj;
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
        case "2":
          data = room.englishAuctionBids[`${auctionId}`];
          const maxBidsObj = room.maxEnglishAuctionBids;
          if (
            (!data || Object.keys(data).length === 0) &&
            !maxBidsObj[`${auctionId}`]
          ) {
            auctionWinner = {};
            data = [];
            break;
          }
          const EAWinner = getWinningEnglishAuctionBid(
            maxBidsObj,
            data,
            auctionId
          );
          auctionWinner = {
            team: EAWinner.EAWinningTeam,
            bid: EAWinner.EAWinnerBid,
            paintingName: data?.auctionObj?.name,
          };
          if (
            Object.keys(maxBidsObj).length > 0 &&
            maxBidsObj[`${auctionId}`]
          ) {
            maxBids = maxBidsObj[`${auctionId}`];
          }
          data = [data];
          break;
        case "3":
          data = room.secondPricedSealedBids[`${auctionId}`];
          if (!data) {
            auctionWinner = {};
            data = [];
          } else {
            auctionWinner = {
              ...getSecondPricedSealedBidWinner(data),
              paintingName: data[0]?.auctionObj?.name,
            };
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
        const deadline = new Date(currentTime + 0.2 * 60 * 1000);
        const timerValue = getRemainingTime(deadline);
        setInterval(() => startAuctionResultTimer(room, deadline), 1000);
        auction_result.auctionResultTimerValue = timerValue;
      }
      auction_result.result = data;
      auction_result.winner = auctionWinner;
      auction_result.maxBids = maxBids;
      res.status(200).json(auction_result);
    }
  }
);

router.get("/getDutchAuctionData/:hostCode", async (req, res) => {
  let db = await dbClient.createConnection();
  const collection = db.collection("room");
  const { hostCode } = req.params;
  const room = await collection.findOne({ hostCode: hostCode });
  const order = [];
  if (room.dutchAuctionsOrder.length === 0) {
    for (var i = 0; i < 5; ++i) {
      let array = [0, 1, 2, 3];
      let currentIndex = array.length,
        randomIndex;
      while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
          array[randomIndex],
          array[currentIndex],
        ];
      }
      order.push.apply(order, array);
    }
  } else {
    order.push.apply(order, room.dutchAuctionsOrder);
  }
  const updateRoom = rooms[hostCode];
  updateRoom.dutchAuctionsOrder = order;
  await collection.findOneAndUpdate(
    { hostCode: hostCode },
    { $set: { dutchAuctionsOrder: order } }
  );
  let val = {};
  if (updateRoom && updateRoom.hasDutchAuctionTimerEnded) {
    val = {};
  } else if (
    updateRoom &&
    Object.keys(updateRoom.dutchAuctionTimerValue).length > 0
  ) {
    val = updateRoom.dutchAuctionTimerValue;
  } else {
    const currentTime = Date.parse(new Date());
    const deadline = new Date(currentTime + 1 * 60 * 1000); // 1
    const timerValue = getRemainingTime(deadline);
    setInterval(() => startDutchAuctionTimer(updateRoom, deadline), 1000);
    val = timerValue;
  }
  res.send({
    dutchAuctions: room.dutchAuctions,
    dutchAuctionsOrder: order,
    dutchAuctionTimerValue: val,
  });
});

router.get("/auctionTimer/:hostCode/:auctionId", function (req, res) {
  const { params } = req;
  const hostCode = params.hostCode;
  let room = rooms[hostCode];
  let auctionObj = room.auctions.artifacts.filter(
    (item) => parseInt(item.id) === parseInt(params.auctionId)
  );
  if (!auctionObj) return;
  const currentAuctionObj = auctionObj[0];
  const timerValueForAuction =
    currentAuctionObj.auctionType === "2" ? 0.5 : 0.3;
  if (currentAuctionObj && currentAuctionObj.hasAuctionTimerEnded) {
    res.send({ currentAuctionObjTimer: {} });
    return;
  }
  if (
    currentAuctionObj &&
    Object.keys(currentAuctionObj.auctionTimerValue).length > 0
  ) {
    res.send({ currentAuctionObjTimer: currentAuctionObj.auctionTimerValue });
  } else {
    const currentTime = Date.parse(new Date());
    const deadline = new Date(currentTime + timerValueForAuction * 60 * 1000);
    const timerValue = getRemainingTime(deadline);
    setInterval(
      () => startAuctionServerTimer(room, currentAuctionObj, deadline),
      1000
    );
    res.send({ currentAuctionObjTimer: timerValue });
  }
});

var mongoClient = dbClient.createConnection();

mongoClient
  .then((db) => {
    const collection = db.collection("city2");
    const collection_visits = db.collection("visits");
    const collection_room = db.collection("room");
    const collection_flyTicketPrice = db.collection("flyTicketPrice");
    const collection_classify = db.collection("classify");
    const collection_nominatedForAuction = db.collection("nominatedForAuction");

    router.get("/validatePlayerId/:hostCode", async (req, res) => {
      const { params } = req;
      const { hostCode } = params;
      const room = await collection_room.findOne({ hostCode: hostCode });
      if (room) {
        const parsedRoom = room;
        const { hasLandingPageTimerEnded } = parsedRoom;
        // This means the game has already started and player cant join
        if (hasLandingPageTimerEnded) {
          res.send({
            type: "error",
            message:
              "This game is already in progress. Please ask the admin to give you a new code.",
          });
          return;
        }
        res.send({ type: "success" });
      } else {
        // This means the client has entered a wrong room code
        res.send({
          type: "error",
          message: "Invalid code. Enter the code again!",
        });
      }
    });

    router.get("/getMap", (req, res) => {
      collection
        .find({})
        .toArray()
        .then((results) => {
          if (!results) res.status(404).json({ error: "Cities not found" });
          else res.status(200).json(results);
        })
        .catch((error) => {
          console.error(error);
        });
    });

    router.get("/getSellingResults", async (req, res) => {
      var selling_result = new Object();
      const { roomId } = req.query;
      const results = await collection_room.findOne({ roomCode: roomId });
      const classifyObj = await collection_classify.findOne({
        roomCode: roomId,
      });
      const room = rooms[roomId];
      if (!results) {
        res.status(404).json({ error: "Room not found" });
      } else {
        const fetchedRoomVisits = await collection_visits
          .find({ roomId })
          .toArray();
        const allTeamsVisitedLocations =
          visitedLocationDetails(fetchedRoomVisits);
        selling_result.amountSpentByTeam = results.totalAmountSpentByTeam;
        selling_result.totalArtScoreForTeams = results.totalArtScoreForTeams;
        selling_result.roundNumber = results.sellingRoundNumber;
        selling_result.players = results.players;
        selling_result.disabledLocations = allTeamsVisitedLocations;
        var keys = results.allTeams;

        // //location phase timer value -> moved to new api //startAirportTimer
        const visitObjects = await getVisitData(keys, roomId);
        selling_result.visits = visitObjects;
        selling_result.allTeams = keys;
        const flyTicketsPriceData = await getFlyTicketPrice(roomId);
        selling_result.flyTicketsPrice = flyTicketsPriceData;
        selling_result.classifyPoints = classifyObj ? classifyObj.classify : {};
        res.status(200).json(selling_result);
      }
    });

    router.get("/startAirportTimer", async (req, res) => {
      try {
        var selling_result = new Object();
        const { roomId } = req.query;
        const results = await collection_room.findOne({ roomCode: roomId });
        const room = rooms[roomId];
        if (!results) {
          res.status(404).json({ error: "Room not found" });
        } else {
          //location phase timer value
          if (room && room.hadLocationPageTimerEnded) {
            selling_result.locationPhaseTimerValue = {};
          }
          if (room && Object.keys(room.locationPhaseTimerValue).length > 0) {
            selling_result.locationPhaseTimerValue =
              room.locationPhaseTimerValue;
          } else {
            const currentTime = Date.parse(new Date());
            const deadline = new Date(currentTime + 0.5 * 60 * 1000); //0.5 original
            const timerValue = getRemainingTime(deadline);
            setInterval(
              () => startLocationPhaseServerTimer(roomId, deadline),
              1000
            );
            selling_result.locationPhaseTimerValue = timerValue;
          }
          res.status(200).json(selling_result);
        }
      } catch (e) {
        console.log(e);
      }
    });

    router.get("/getFlyTicketPriceForLocation", async (req, res) => {
      const { roomId } = req.query;
      const result = await getFlyTicketPrice(roomId);
      res.status(200).json(result);
    });

    router.post("/updateRoundId", async (req, res) => {
      try {
        const room = await collection_room.findOne({
          roomCode: req.body.roomId,
        });
        if (room.sellingRoundNumber === req.body.roundId) {
          const { sellingArtifacts } = room.sellingAuctions;
          sellingArtifacts.forEach((obj) => {
            if (obj.auctionState === 1) {
              obj.auctionState = 2;
            }
          });
          const sellingRoundNumber = parseInt(room.sellingRoundNumber, 10) + 1;
          let serverRoom = rooms[req.body.roomId];
          await collection_room.findOneAndUpdate(
            { roomCode: req.body.roomId },
            {
              $set: {
                sellingRoundNumber: sellingRoundNumber,
                hadLocationPageTimerEnded: false,
                locationPhaseTimerValue: {},
                sellPaintingTimerValue: {},
                hasSellPaintingTimerEnded: false,
                sellingResultsTimerValue: {},
                hasSellingResultsTimerEnded: false,
                sellingAuctions: { sellingArtifacts: sellingArtifacts },
                nominatedAuctionBids: {},
              },
            }
          );
          await collection_flyTicketPrice.findOneAndUpdate(
            { roomId: req.body.roomId },
            { $set: { ticketPriceByLocation: {} } }
          );
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
          };
        } else {
          res.status(200).json({ message: "updated" });
        }
      } catch (e) {
        res.status(500).json(e);
      }
    });

    router.get("/getSellingInfo", async (req, res) => {
      try {
        var selling_info = new Object();

        const room = rooms[req.query.roomId];
        const roomId = req.query.roomId;
        const locationId = req.query.locationId;
        const teamName = req.query.teamName;
        const roundId = req.query.roundId;
        // collection_visits
        //   .findOne({ roomId: roomId, teamName: teamName })
        //   .then((existingRecord) => {
        //     if (existingRecord) {
        //       if (existingRecord.roundNumber === roundId) {
        //         return;
        //       }
        //       collection_visits.findOneAndUpdate(
        //         { roomId: roomId, teamName: teamName },
        //         {
        //           $set: {
        //             roomId: roomId,
        //             locationId: locationId,
        //             teamName: teamName,
        //             roundNumber: roundId,
        //           },
        //           $push: { allVisitLocations: locationId },
        //         },
        //         { upsert: true }
        //       );
        //     } else {
        //       collection_visits.insertOne({
        //         roomId: roomId,
        //         teamName: teamName,
        //         locationId: locationId,
        //         locations: [],
        //         allVisitLocations: [locationId],
        //         roundNumber: roundId,
        //       });
        //     }
        //   });
        const results = await collection_room.findOne({
          roomCode: req.query.roomId,
        });
        if (!results) res.status(404).json({ error: "Room not found" });
        else {
          selling_info.artifacts = results.leaderBoard[req.query.teamName];

          const results_city = await collection.findOne({
            cityId: parseInt(req.query.locationId, 10),
          });
          selling_info.city = results_city;

          const results_visits = await collection_visits
            .find({
              roomId: req.query.roomId,
              locationId: +req.query.locationId,
            })
            .toArray();
          var otherTeams = [];

          results_visits.forEach(function (visit, index) {
            if (!otherTeams.includes(visit.teamName))
              otherTeams.push(visit.teamName);
          });
          selling_info.otherteams = otherTeams;
          res.status(200).json(selling_info);
        }
      } catch (e) {
        console.log(e);
      }
    });
    router.get("/startExpoBeginTimer", async (req, res) => {
      try {
        let selling_info = new Object();
        const { roomId } = req.query;
        const results = await collection_room.findOne({ roomCode: roomId });
        const room = rooms[roomId];
        if (!results) {
          res.status(404).json({ error: "Room not found" });
        } else {
          // selling phase timer value
          if (room && room.hasSellPaintingTimerEnded) {
            selling_info.sellPaintingTimerValue = {};
          }
          if (room && Object.keys(room.sellPaintingTimerValue).length > 0) {
            selling_info.sellPaintingTimerValue = room.sellPaintingTimerValue;
          } else {
            const currentTime = Date.parse(new Date());
            const deadline = new Date(currentTime + 0.1 * 60 * 1000); //0.5 original value
            const timerValue = getRemainingTime(deadline);
            setInterval(() => startSellingServerTimer(room, deadline), 1000);
            selling_info.sellPaintingTimerValue = timerValue;
          }
          res.status(200).json(selling_info);
        }
      } catch (e) {
        console.log(e);
      }
    });
    router.get("/startNominatedAuction", async (req, res) => {
      try {
        let selling_info = new Object();
        const { roomId } = req.query;
        const results = await collection_room.findOne({ roomCode: roomId });
        const room = rooms[roomId];
        if (!results) {
          res.status(404).json({ error: "Room not found" });
        } else {
          // selling phase timer value
          if (room && room.hasNominatedAuctionTimerEnded) {
            selling_info.nominatedAuctionTimerValue = {};
          }
          if (room && Object.keys(room.nominatedAuctionTimerValue).length > 0) {
            selling_info.nominatedAuctionTimerValue = room.nominatedAuctionTimerValue;
          } else {
            const currentTime = Date.parse(new Date());
            const deadline = new Date(currentTime + 5 * 60 * 1000); //0.5 original value
            const timerValue = getRemainingTime(deadline);
            setInterval(() => startNominatedAuctionServerTimer(room, deadline), 1000);
            selling_info.nominatedAuctionTimerValue = timerValue;
          }
          res.status(200).json(selling_info);
        }
      } catch (e) {
        console.log(e);
      }
    });

    router.get("/getEnglishAuctionForSelling", (req, res) => {
      const { roomCode } = req.query;
      var sellingAuctionObj = new Object();
      collection_room.findOne({ roomCode: roomCode }).then(async (results) => {
        const { sellingArtifacts } = results.sellingAuctions;
        const currentAuction = sellingArtifacts.filter(
          (obj) => obj.auctionState === 1
        );
        if (currentAuction.length > 0) {
          sellingAuctionObj = currentAuction[0];
          res.status(200).json({ auctionObj: sellingAuctionObj });
          return;
        } else {
          const sellingAuctionObj = sellingArtifacts.find(
            (obj) => obj.auctionState === 0
          );
          if (sellingAuctionObj) {
            sellingAuctionObj.auctionState = 1;
            sellingArtifacts.forEach((obj) => {
              if (obj.id === sellingAuctionObj.id) {
                obj.auctionState = 1;
              }
            });
            res.status(200).json({ auctionObj: sellingAuctionObj });
            await collection_room.findOneAndUpdate(
              { hostCode: roomCode },
              {
                $set: {
                  sellingAuctions: { sellingArtifacts: sellingArtifacts },
                },
              }
            );
          }
          return;
        }
      });
    });

    router.get("/getSellingResultForRound", (req, res) => {
      const { roundId, roomCode } = req.query;
      const room = rooms[roomCode];
      var selling_round_results = new Object();
      collection_room
        .findOne({ roomCode: roomCode })
        .then((results) => {
          if (!results) res.status(404).json({ error: "Room not found" });
          else {
            const leaderboard = results.leaderBoard;
            const paintingsResults = Object.entries(leaderboard).reduce(
              (acc, [key, value]) => {
                const result = value.map((val) => {
                  return {
                    auctionId: val.auctionId,
                    paintingURL: val.imageURL,
                  };
                });
                acc = {
                  ...acc,
                  [key]: result,
                };
                return acc;
              },
              {}
            );
            selling_round_results.allTeamPaintings = paintingsResults;
            selling_round_results.calculatedRevenueForRound =
              results?.calculatedRoundRevenue[roundId] || {};
            //selling phase timer value
            if (results && results.hasSellingResultsTimerEnded) {
              selling_round_results.sellPaintingTimerValue = {};
            }
            if (
              results &&
              Object.keys(results.sellingResultsTimerValue).length > 0
            ) {
              selling_round_results.sellingResultsTimerValue =
                room.sellingResultsTimerValue;
            } else {
              const currentTime = Date.parse(new Date());
              const deadline = new Date(currentTime + 0.2 * 60 * 1000);
              const timerValue = getRemainingTime(deadline);
              setInterval(
                () => startSellingResultsServerTimer(roomCode, deadline),
                1000
              );
              selling_round_results.sellingResultsTimerValue = timerValue;
            }
            res.status(200).json(selling_round_results);
          }
        })
        .catch((error) => {
          console.error(error);
        });
    });
    router.get("/getSellToMarketResult", (req, res) => {
      const { roundId, roomCode } = req.query;
      collection_room
        .findOne({ roomCode: roomCode })
        .then((results) => {
          if (!results) res.status(404).json({ error: "Room not found" });
          else {
            calculatedRevenueForRound =
              results?.calculatedRoundRevenue[roundId] || {};
         
            res.status(200).json(calculatedRevenueForRound);
          }
        })
        .catch((error) => {
          console.error(error);
        });
    });


    router.post("/updateEnglishAuctionResults", async (req, res) => {
      const { roomId, auctionId, englishAuctionsNumber } = req.body;
      const currentRoom = rooms[roomId];
      const auctionItem = englishAuctionsNumber === 1 ? currentRoom.englishAuctionBids[auctionId] : (englishAuctionsNumber === 2 ? currentRoom.englishAuctionBids2[auctionId] : currentRoom.englishAuctionBids3[auctionId]);
      if (auctionItem) {
        const roomInServer = await collection_room.findOne({
          roomCode: roomId,
        });
        const leaderboard = roomInServer.leaderBoard;
        let totalAmountSpentByTeam = roomInServer.totalAmountSpentByTeam;
        const leaderBoardKeys = Object.keys(leaderboard);
        const EAwinningTeam = auctionItem.bidTeam;

        //update total amount spent by team
        if (totalAmountSpentByTeam[EAwinningTeam]) {
          totalAmountSpentByTeam[EAwinningTeam] =
            totalAmountSpentByTeam[EAwinningTeam] - auctionItem.bidAmount;
        } else {
          totalAmountSpentByTeam[EAwinningTeam] = 0 - auctionItem.bidAmount;
        }
        roomInServer.totalAmountSpentByTeam = totalAmountSpentByTeam;

        //update team leaderboard
        if (leaderBoardKeys && leaderBoardKeys.includes(EAwinningTeam)) {
          const isExistingAuctionForTeam = leaderboard[EAwinningTeam].filter(
            (item) => item.auctionObj.id === auctionId
          );
          if (isExistingAuctionForTeam.length === 0) {
            leaderboard[`${EAwinningTeam}`].push(auctionItem);
          } else {
            res.status(200).json({ message: "already updated" });
            return;
          }
        } else {
          leaderboard[`${EAwinningTeam}`] = [auctionItem];
        }
        await collection_room.findOneAndUpdate(
          { hostCode: roomId },
          { $set: { totalAmountSpentByTeam: totalAmountSpentByTeam } }
        );
      }
      res.status(200).json({ message: "updated" });
    });

    router.get("/getNominatedForAuctionItems", async (req, res) => {
      try {
        const { roomId, roundId, locationId } = req.query;
        console.log(roomId, roundId, locationId);
        const data = await collection_nominatedForAuction.findOne({
          roomId: roomId,
          locationId: +locationId,
          roundId: +roundId,
        });
        console.log("->", data);
        res.status(200).send(data);
      } catch (e) {
        console.log(e);
      }
    });
      
    router.post("/nominateForAuction", async (req, res) => {
      try {
        const { roomId, auction, roundId, locationId, teamColor } = req.body;
        const data = await collection_nominatedForAuction.findOne({
          roomId: roomId,
          locationId: +locationId,
        });
        // if we auction more than one painting from one team then need to add function here, so that auctionData updates as per requirement.
        const auctionData = {};
        auctionData[`${teamColor}`] = [auction];
        
        if (!data) {
          await collection_nominatedForAuction.insertOne({
            roundId: +roundId,
            locationId: +locationId,
            auctions: auctionData,
            roomId: roomId,
          });
         return res.status(200).json({ message: "updated new data1" });
        } else {
          if (+data.roundId === +roundId) {
            const auctions = { ...data.auctions, ...auctionData };
            await collection_nominatedForAuction.findOneAndUpdate(
              {
                roomId: roomId,
                locationId: +locationId,
              },
              {
                $set: {
                  auctions: auctions,
                },
              }
              );
            } else {
            const auctions = { ...auctionData };
            await collection_nominatedForAuction.findOneAndUpdate(
              {
                roomId: roomId,
                locationId: +locationId,
              },
              {
                $set: {
                  roundId: +roundId,
                  auctions: auctions,
                },
              }
              );
          }
         return res.status(200).json({ message: "updated data2" });
        }
      } catch (e) {
        console.log(e);
      }
    });
    router.get("/updateLeaderBoardAfterNominationAuction", async (req, res) => {
      console.log('**updatingLeaderBoard**');
      try {
        const { roomId } = req.query;
      const room = await collection_room.findOne({
        roomCode: roomId,
      });
      if(!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      let nominatedAuctionBids = room?.nominatedAuctionBids;
      if (!nominatedAuctionBids) {
          return res.status(200).json({ mssg: "Nothing to update" });
        } else {
         const updatedLeaderBoard = updateLeaderBoardAfterNominationAuction(room);
         const totalAmountByTeam = await calculateTotalAmountSpent(
          leaderboard=updatedLeaderBoard,
          hostCode=roomId,
          rooms,
          room
        );
        const teamStats = await calculateTeamEfficiency(
          totalAmountByTeam,
          leaderboard=updatedLeaderBoard,
        );
         const classify = calculate({},AUCTION_TYPE="NOMINATED_AUCTION",pastLeaderBoard=updatedLeaderBoard);
          await collection_room.findOneAndUpdate(
            { roomCode: roomId },
            {
              $set: {
                leaderBoard: updatedLeaderBoard,
                totalAmountSpentByTeam: totalAmountByTeam,
                teamEfficiency: teamStats.efficiencyByTeam,
                totalPaintingsWonByTeam: teamStats.totalPaintingsWonByTeams,
              },
            }
          );
          await collection_classify.findOneAndUpdate(
            { roomCode: roomId },
            {
              $set: {
                classify: classify,
              },
            }
          );
          return res.status(200).json({mssg: 'updated leaderBoard'});
        }
        
      } catch (e) {
        console.log(e);
      }
      

    });
    
    const getFlyTicketPrice = async (roomId) => {
      const result = await collection_flyTicketPrice.findOne({
        roomId: roomId,
      });
      return result;
    };

    const getVisitData = async (keys, roomCode) => {
      let teamVisit = [];
      const getDataByTeamName = async (key) => {
        const result = await collection_visits
          .find({ roomId: roomCode, teamName: key })
          .toArray();
        return result;
      };

      const unresolvedPromises = keys.map((key) => getDataByTeamName(key));
      const allVisitsByTeams = await Promise.all(unresolvedPromises);
      if (allVisitsByTeams.length === 0) {
        teamVisit = keys.reduce((acc, key) => {
          acc.push({
            teamName: key,
            visitCount: 0,
            currentLocation: 10,
            allVisitLocations: [],
            totalVisitPrice: 0,
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
              currentLocation: v.locationId || 10,
              allVisitLocations: v.allVisitLocations || [],
              totalVisitPrice: v.totalVisitPrice,
            });
          }
          return acc;
        }, []);
      }

      return teamVisit;
    };
  })
  .catch((error) => console.error(error));

module.exports = router;
