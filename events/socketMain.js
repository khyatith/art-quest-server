const {
  calculateSellingRevenue,
  findSecondHighestBid,
} = require("../helpers/game");
var englishAuctionObj1 = require("../data/englishAuctionData1.json");
var englishAuctionObj2 = require("../data/englishAuctionData2.json");
var secretAuctionObj1 = require("../data/secretAuctionData1.json");
var englishAuctionObj3 = require("../data/englishAuctionData3.json");
var sellingAuctionObj = require("../data/sellingAuctionData.json");
var dutchAuctionObj = require("../data/dutchAuctionData1.json");
var secondPricedAuctionObj1 = require("../data/secondPricedData1.json");
const { calculate } = require("../helpers/classify-points");
const dbClient = require("../mongoClient");
var cloneDeep = require("lodash.clonedeep");
const { visitedLocationDetails } = require("../helpers/location-visits");
const { Socket } = require("socket.io");

module.exports = async (io, socket, rooms) => {
  const db = await dbClient.createConnection();
  const collection = db.collection("room");
  const collection_visits = db.collection("visits");
  const collection_artMovements = db.collection("artMovements");
  const collection_flyTicketPrice = db.collection("flyTicketPrice");
  const collection_classify = db.collection("classify");

  const createRoom = async (stringifiedPlayer) => {
    player = JSON.parse(stringifiedPlayer);
    socket.join(player.hostCode);
    let room = await collection.findOne({ hostCode: player.hostCode });
    let parsedRoom = room;
    if (!room) {
      const allPaintings = [
        ...englishAuctionObj1.artifacts,
        ...secretAuctionObj1.artifacts,
        ...englishAuctionObj2.artifacts,
        ...englishAuctionObj3.artifacts,
        ...secondPricedAuctionObj1.artifacts,
      ];
      let playerObj = {
        socketId: socket.id,
        playerId: player.playerId,
        playerName: player.playerName,
        teamName: player.teamName,
      };
      parsedRoom = {
        hostCode: player.hostCode,
        roomCode: player.playerId,
        players: [playerObj],
        allPaintings,
        englishAuctions1: cloneDeep(englishAuctionObj1),
        englishAuctions2: cloneDeep(englishAuctionObj2),
        englishAuctions3: cloneDeep(englishAuctionObj3),
        secretAuctions1: cloneDeep(secretAuctionObj1),
        sellingAuctions: cloneDeep(sellingAuctionObj),
        dutchAuctions: cloneDeep(dutchAuctionObj),
        secondPricedSealedBidAuctions1: cloneDeep(secondPricedAuctionObj1),
        dutchAuctionsOrder: [],
        allTeams: [],
        leaderBoard: {},
        numberOfPlayers: 0,
        totalAmountSpentByTeam: {},
        englishAuctionBids: {},
        englishAuctionBids2: {},
        englishAuctionBids3: {},
        maxEnglishAuctionBids: {},
        firstPricedSealedBids: {},
        secondPricedSealedBids: {},
        dutchAuctionBids: {},
        nominatedAuctionBids: {},
        allPayAuctions: {},
        version: 1,
        startingBudget: 100,
        hasLandingPageTimerStarted: false,
        hasDutchAuctionTimerStarted: false,
        landingPageTimerDeadline: 0,
        landingPageTimerValue: {},
        dutchAuctionTimerValue: {},
        hasLandingPageTimerEnded: false,
        hasDutchAuctionTimerEnded: false,
        hasAuctionResultStarted: false,
        auctionResultTimerDeadline: 0,
        auctionResultTimerValue: {},
        hasAuctionResultTimerEnded: false,
        hasEnglishAuctionTimerEnded: false,
        englishAuctionTimer: {},
        hasSecretAuctionTimerEnded: false,
        secretAuctionTimer: {},
        hasSecondPriceAuctionTimerEnded: false,
        secondPriceAuctionTimer: {},
        auctionNumber: "1",
        winner: null,
        sellingRoundNumber: 1,
        hadLocationPageTimerEnded: false,
        locationPhaseTimerValue: {},
        sellPaintingTimerValue: {},
        hasSellPaintingTimerEnded: false,
        sellingResultsTimerValue: {},
        hasNominatedAuctionTimerEnded: false,
        nominatedAuctionTimerValue: {},
        hasSellingResultsTimerEnded: false,
        calculatedRoundRevenue: {},
      };
      rooms[player.hostCode] = parsedRoom;
      await collection.insertOne(parsedRoom);
    }
  };

  const joinRoom = async (player) => {
    const parsedPlayer = JSON.parse(player);
    const room = await collection.findOne({ hostCode: parsedPlayer.hostCode });
    if (room) {
      const parsedRoom = room;
      const { players, allTeams } = parsedRoom;
      const isExistingPlayer = players.filter(
        (item) => item.playerId === parsedPlayer.playerId
      );
      if (isExistingPlayer.length === 0) {
        parsedRoom.players.push(parsedPlayer);
      }
      if (!allTeams.includes(parsedPlayer.teamName)) {
        parsedRoom.allTeams.push(parsedPlayer.teamName);
      }
      if (!rooms || !rooms[parsedPlayer.hostCode]) {
        rooms[parsedPlayer.hostCode] = parsedRoom;
      } else {
        rooms[parsedPlayer.hostCode].players.push(parsedPlayer);
      }
      socket.join(parsedPlayer.hostCode);
      io.sockets.in(room.roomCode).emit("numberOfPlayersJoined", {
        numberOfPlayers: room.numberOfPlayers,
        playersJoined: rooms[parsedPlayer.hostCode].players.length - 1,
      });
      await collection.findOneAndUpdate(
        { hostCode: parsedPlayer.hostCode },
        { $set: parsedRoom }
      );
    }
  };

  // const getPlayersJoinedInfo = async (data) => {
  //   console.log('data inside player joined info', data);
  //   const { roomCode } = data;
  //   const room = await collection.findOne({ hostCode: roomCode });
  //   if (room) {
  //     io.sockets.in(roomCode).emit("numberOfPlayersJoined", {
  //       roomCode: roomCode,
  //       numberOfPlayers: room.numberOfPlayers,
  //       playersJoined: room.players.length,
  //     });
  //   }
  // };

  const startGame = async (player) => {
    const parsedPlayer = JSON.parse(player);
    collection.findOne(
      { hostCode: parsedPlayer.hostCode },
      async (err, room) => {
        if (room) {
          io.to(parsedPlayer.hostCode).emit("gameState", room);
        }
      }
    );
  };

  const landingPageTimerEnded = async (player) => {
    const parsedPlayer = JSON.parse(player);
    collection.findOne(
      { hostCode: parsedPlayer.hostCode },
      async (err, room) => {
        if (room) {
          io.to(parsedPlayer.hostCode).emit("redirectToNextPage", room);
        }
      }
    );
  };

  const hasAuctionTimerEnded = async ({ player, auctionId }) => {
    const hostCode = player.hostCode;
    io.to(hostCode).emit("redirectToResults", auctionId);
  };

  const hasAuctionResultTimerEnded = async ({ player, auctionId }) => {
    const hostCode = player.hostCode;
    io.to(hostCode).emit("goToNextAuction", auctionId);
  };

  const hasLocationPhaseTimerEnded = ({ player }) => {
    const hostCode = player.hostCode;
    io.to(hostCode).emit("goToExpo");
  };

  const locationPhaseStartTimer = ({ player }) => {
    const hostCode = player.hostCode;
    io.to(hostCode).emit("timerStarted");
  };

  const hasSellingResultsTimerEnded = ({ player }) => {
    const hostCode = player.hostCode;
    io.to(hostCode).emit("startNextRound");
  };

  const hasExpoBeginningTimerEnded = ({ hostCode }) => {
    io.to(hostCode).emit("goToSellingResults");
  };

  const setTotalNumberOfPlayers = async ({
    roomCode,
    numberOfPlayers,
    version,
  }) => {
    const room = await collection.findOne({ hostCode: roomCode });
    const parsedRoom = room;
    if (!room) return;
    parsedRoom.numberOfPlayers = parseInt(
      numberOfPlayers ? numberOfPlayers : "1"
    );
    parsedRoom.version = parseInt(version);
    numberOfPlayersInRoom = parseInt(numberOfPlayers);
    versionRoom = parseInt(version);
    await collection.findOneAndUpdate(
      { hostCode: roomCode },
      { $set: { numberOfPlayers: numberOfPlayersInRoom, version: versionRoom } }
    );
  };

  const updateFlyTicketPricesForLocation = async (
    roomId,
    locationId,
    flyTicketPrice
  ) => {
    let result;
    let ticketPriceForLocation = {};
    const existingRecord = await collection_flyTicketPrice.findOne({
      roomId: roomId,
    });
    if (existingRecord) {
      ticketPriceForLocation = existingRecord.ticketPriceByLocation;
      ticketPriceForLocation = {
        ...ticketPriceForLocation,
        [locationId]: flyTicketPrice,
      };
      result = await collection_flyTicketPrice.findOneAndUpdate(
        { roomId: roomId },
        { $set: { ticketPriceByLocation: ticketPriceForLocation } }
      );
    } else {
      ticketPriceForLocation[locationId] = flyTicketPrice;
      result = await collection_flyTicketPrice.insertOne({
        roomId: roomId,
        ticketPriceByLocation: ticketPriceForLocation,
      });
    }
    return result;
  };

  const putCurrentLocation = async (data) => {
    const { roomId, locationId, teamName, roundId, flyTicketPrice } = data;
    const result = await updateFlyTicketPricesForLocation(
      roomId,
      locationId,
      flyTicketPrice
    );
    if (result) {
      const fetchedRoom = await collection_visits.find({ roomId }).toArray();
      const existingRecordArray =
        fetchedRoom &&
        fetchedRoom.length > 0 &&
        fetchedRoom.filter((fr) => fr.teamName === teamName);
      const existingRecord = existingRecordArray && existingRecordArray[0];
      if (existingRecord) {
        if (
          parseInt(existingRecord.roundNumber, 10) === parseInt(roundId, 10)
        ) {
          io.sockets.in(roomId).emit("locationUpdatedForTeam", {
            roomId,
            teamName,
            locationId: existingRecord.locationId,
            roundId,
            flyTicketPrice,
          });
          return;
        }
        const totalVisitPrice = existingRecord.totalVisitPrice
          ? parseInt(existingRecord.totalVisitPrice, 10) +
            parseInt(flyTicketPrice, 10)
          : parseInt(flyTicketPrice, 0);
        await collection_visits.findOneAndUpdate(
          { roomId: roomId, teamName: teamName },
          {
            $set: {
              roomId: roomId,
              locationId: locationId,
              teamName: teamName,
              roundNumber: roundId,
              totalVisitPrice: totalVisitPrice,
            },
            $push: { locations: locationId },
          },
          { upsert: true }
        );
        const fetchAllTeamsVisits = await collection_visits
          .find({ roomId })
          .toArray();
        const allTeamsVisitedLocations =
          visitedLocationDetails(fetchAllTeamsVisits);
        io.sockets.in(roomId).emit("locationUpdatedForTeam", {
          roomId,
          teamName,
          locationId,
          roundId,
          flyTicketPrice,
          disabledLocations: allTeamsVisitedLocations,
        });
      } else {
        const result = await collection_visits.insertOne({
          roomId: roomId,
          roundNumber: roundId,
          teamName: teamName,
          locationId: locationId,
          locations: [locationId],
          allVisitLocations: [],
          totalVisitPrice: parseInt(flyTicketPrice, 10),
        });
        const fetchAllTeamsVisits = await collection_visits
          .find({ roomId })
          .toArray();
        const allTeamsVisitedLocations =
          visitedLocationDetails(fetchAllTeamsVisits);
        if (result)
          io.sockets.in(roomId).emit("locationUpdatedForTeam", {
            roomId,
            teamName,
            locationId,
            roundId,
            flyTicketPrice,
            disabledLocations: allTeamsVisitedLocations,
          });
      }
    }
  };

  const calculateRevenue = async (data) => {
    const { teamName, roomCode, roundId, transportCost } = data;
    const calculatedRevenue = calculateSellingRevenue(data);
    const results = await collection.findOne({ hostCode: roomCode });
    let totalAmountByCurrentTeam = results?.totalAmountSpentByTeam[teamName];
    if (totalAmountByCurrentTeam) {
      totalAmountByCurrentTeam =
        parseFloat(totalAmountByCurrentTeam) + parseFloat(calculatedRevenue);
    } else {
      totalAmountByCurrentTeam = parseFloat(calculatedRevenue);
    }
    results.totalAmountSpentByTeam[teamName] = parseFloat(
      totalAmountByCurrentTeam
    ).toFixed(1);
    const caculatedRevenueAfterRound =
      results.calculatedRoundRevenue[roundId] || {};
    const formattedTransportCost = parseInt(transportCost, 10) / 1000000;
    const realCalculatedRevenue =
      parseFloat(calculatedRevenue) - parseFloat(formattedTransportCost);
    if (Object.keys(caculatedRevenueAfterRound).length > 0) {
      results.calculatedRoundRevenue[roundId][teamName] = parseFloat(
        realCalculatedRevenue
      );
    } else {
      results.calculatedRoundRevenue = {
        [roundId]: { [teamName]: parseFloat(realCalculatedRevenue) },
      };
    }
    await collection.findOneAndUpdate(
      { hostCode: roomCode },
      {
        $set: {
          totalAmountSpentByTeam: results.totalAmountSpentByTeam,
          calculatedRoundRevenue: results.calculatedRoundRevenue,
        },
      }
    );
    return calculatedRevenue;
  };

  const emitNominatedPaintingId = async (data) => {
    const { paintingId, roomCode, teamName } = data;
    const calculatedRevenue = await calculateRevenue(data);
    // io.sockets.in(roomCode).emit("emitNominatedPainting", {
    //   paintingId,
    //   teamName,
    //   ticketPrice: data.ticketPrice,
    //   calculatedRevenue,
    // });
  };

  const addToFavorites = async (data) => {
    const { favoritedItems, roomCode } = data;
    io.sockets.in(roomCode).emit("updatedFavorites", favoritedItems);
  };

  const addEnglishAuctionBid = async (data) => {
    const { player, auctionId, englishAuctionsNumber } = data;
    if (englishAuctionsNumber === 1) {
      rooms[player.hostCode].englishAuctionBids[`${auctionId}`] = data;
      io.sockets.in(player.hostCode).emit("setPreviousEnglishAuctionBid", data);
      await collection.findOneAndUpdate(
        { hostCode: player.hostCode },
        {
          $set: {
            englishAuctionBids: rooms[player.hostCode].englishAuctionBids,
          },
        }
      );
    } else if (englishAuctionsNumber === 2) {
      rooms[player.hostCode].englishAuctionBids2[`${auctionId}`] = data;
      io.sockets.in(player.hostCode).emit("setPreviousEnglishAuctionBid", data);
      await collection.findOneAndUpdate(
        { hostCode: player.hostCode },
        {
          $set: {
            englishAuctionBids2: rooms[player.hostCode].englishAuctionBids2,
          },
        }
      );
    } else if (englishAuctionsNumber === 3) {
      rooms[player.hostCode].englishAuctionBids3[`${auctionId}`] = data;
      io.sockets.in(player.hostCode).emit("setPreviousEnglishAuctionBid", data);
      await collection.findOneAndUpdate(
        { hostCode: player.hostCode },
        {
          $set: {
            englishAuctionBids3: rooms[player.hostCode].englishAuctionBids3,
          },
        }
      );
    }
  };

  const renderEnglishAuctionResults = async (params) => {
    const { roomId, englishAuctionsNumber } = params;
    const room = await collection.findOne({ hostCode: roomId });
    const classifyPoints = {};

    try {
      let englishAuctionBids =
        englishAuctionsNumber === 1
          ? room.englishAuctionBids
          : englishAuctionsNumber === 2
          ? room.englishAuctionBids2
          : room.englishAuctionBids3;
      classifyPoints.roomCode = roomId;
      classifyPoints.classify = calculate(
        englishAuctionBids,
        "ENGLISH",
        room.leaderBoard
      );
      const findRoom = await collection_classify.findOne({ roomCode: roomId });
      if (!findRoom) await collection_classify.insertOne(classifyPoints);
      else {
        await collection_classify.findOneAndUpdate(
          { roomCode: roomId },
          {
            $set: {
              classify: classifyPoints.classify,
            },
          }
        );
      }
    } catch (err) {
      console.log(err);
    }
    // console.log(classifyPoints);
    // const results = await getNewLeaderboard(rooms, roomId, room.auctions.artifacts.length);
    io.sockets.in(roomId).emit("renderEnglishAuctionsResults", {
      englishAutionBids:
        englishAuctionsNumber === 1
          ? room.englishAuctionBids
          : englishAuctionsNumber === 2
          ? room.englishAuctionBids2
          : room.englishAuctionBids3,
      classifyPoints,
    });
    // await collection.findOneAndUpdate({ "hostCode": roomId }, { $set: {"leaderBoard": results.leaderboard, "totalAmountSpentByTeam": results.totalAmountByTeam, "teamEfficiency": results.totalPaintingsWonByTeams, "totalArtScoreForTeams": results.totalArtScoreForTeams, "totalPaintingsWonByTeam":  results.totalPaintingsWonByTeams, "allTeams": room.allTeams } });
  };

  const renderDutchAuctionResults = async (roomId) => {
    const room = await collection.findOne({ hostCode: roomId });
    const classifyPoints = {};

    try {
      const englishAuctionResult = await collection_classify.findOne({
        roomCode: roomId,
      });
      classifyPoints.roomCode = roomId;
      const dutchAuctionResult = calculate(room, "DUTCH");
      const { classify } = englishAuctionResult;
      const resultingObj = {};
      resultingObj.classify = classify;
      Object.keys(classify).map((teamName) => {
        if (dutchAuctionResult[teamName])
          resultingObj.classify[teamName] += parseInt(
            dutchAuctionResult[teamName]
          );
      });

      resultingObj.roomCode = roomId;

      await collection_classify.findOneAndUpdate(
        { roomCode: roomId },
        {
          $set: {
            classify: resultingObj.classify,
          },
        }
      );

      io.sockets.in(roomId).emit("renderDutchAuctionsResults", {
        dutchAutionBids: room.dutchAuctionBids,
        classifyPoints: resultingObj.classify,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const addToFirstPricedSealedBidAuction = async (data) => {
    const { player, auctionId, bidAmount } = data;
    const allFirstPricedSealedBids =
      rooms[player.hostCode].firstPricedSealedBids;
    const fpsbObj = Object.keys(allFirstPricedSealedBids);
    if (fpsbObj.includes(`${auctionId}`)) {
      rooms[player.hostCode].firstPricedSealedBids[`${auctionId}`].push(data);
    } else {
      rooms[player.hostCode].firstPricedSealedBids[`${auctionId}`] = [data];
    }
    io.sockets.in(player.hostCode).emit("setLiveStyles", {
      teamName: player.teamName,
      auctionId,
      bidAmount,
    });
    await collection.findOneAndUpdate(
      { hostCode: player.hostCode },
      {
        $set: {
          firstPricedSealedBids: rooms[player.hostCode].firstPricedSealedBids,
        },
      }
    );
  };

  const addToSecondPricedSealedBidAuction = async (data) => {
    const { player, auctionId, bidAmount } = data;
    const allSecondPricedSealedBids =
      rooms[player.hostCode].secondPricedSealedBids;
    const spsbObj = Object.keys(allSecondPricedSealedBids);
    if (spsbObj.includes(`${auctionId}`)) {
      rooms[player.hostCode].secondPricedSealedBids[`${auctionId}`].push(data);
    } else {
      rooms[player.hostCode].secondPricedSealedBids[`${auctionId}`] = [data];
    }
    io.sockets.in(player.hostCode).emit("setSecondPricedLiveStyles", {
      teamName: player.teamName,
      auctionId,
      bidAmount,
    });
    await collection.findOneAndUpdate(
      { hostCode: player.hostCode },
      {
        $set: {
          secondPricedSealedBids: rooms[player.hostCode].secondPricedSealedBids,
        },
      }
    );
  };

  const renderSecondPriceAuctionsResult = async (roomId) => {
    console.log("inside render second price auction result");
    let result = {};
    const room = await collection.findOne({ hostCode: roomId });
    const secondPricedSealedBidAuctionsObj = room.secondPricedSealedBids;

    if (secondPricedSealedBidAuctionsObj) {
      try {
        for (var secondPricedSealedAuction in secondPricedSealedBidAuctionsObj) {
          const SPSBItem =
            secondPricedSealedBidAuctionsObj[secondPricedSealedAuction];
          //Find the second highest bid amount
          const allBidsArr = SPSBItem.map((obj) => parseInt(obj.bidAmount));
          const secondHighestBid =
            allBidsArr.length === 1
              ? allBidsArr[0]
              : findSecondHighestBid(allBidsArr, allBidsArr.length);
          let SPSBwinner =
            SPSBItem.length === 1
              ? SPSBItem
              : SPSBItem.filter(
                  (item) =>
                    parseInt(item.bidAmount) > parseInt(secondHighestBid)
                );
          if (SPSBwinner.length > 1) {
            SPSBwinner = SPSBwinner.reduce((acc, winner) => {
              return winner.bidAt < acc.bidAt ? winner : acc;
            });
          } else {
            SPSBwinner = SPSBwinner[0];
          }
          result[secondPricedSealedAuction] = SPSBwinner;
          if (result[secondPricedSealedAuction])
            result[secondPricedSealedAuction].bidAmount = secondHighestBid;
        }
      } catch (error) {
        console.log(error);
      }

      try {
        const secondPriceAuctionResult = calculate(
          result,
          "SECOND_PRICED",
          room.leaderBoard
        );
        const resultingObj = {};
        resultingObj.classify = secondPriceAuctionResult;

        resultingObj.roomCode = roomId;

        io.sockets.in(roomId).emit("renderSecondPriceAuctionsResult", {
          result,
          classifyPoints: resultingObj.classify,
        });
        await collection_classify.findOneAndUpdate(
          { roomCode: roomId },
          {
            $set: {
              classify: resultingObj.classify,
            },
          }
        );
      } catch (err) {
        console.log(err);
      }
    }
  };

  const renderSecretAuctionResults = async (roomId) => {
    let result = {};
    const room = await collection.findOne({ hostCode: roomId });
    const firstPricedSealedBidAuctionsObj = room.firstPricedSealedBids;
    for (var fristPricedSealedAuction in firstPricedSealedBidAuctionsObj) {
      const FPSBItem =
        firstPricedSealedBidAuctionsObj[fristPricedSealedAuction];
      const FPSBwinner = FPSBItem.reduce((acc, obj) => {
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
      result[fristPricedSealedAuction] = FPSBwinner;
    }

    try {
      const secretAuctionResult = calculate(result, "SECRET", room.leaderBoard);
      const resultingObj = {};
      resultingObj.classify = secretAuctionResult;

      resultingObj.roomCode = roomId;

      await collection_classify.findOneAndUpdate(
        { roomCode: roomId },
        {
          $set: {
            classify: resultingObj.classify,
          },
        }
      );

      io.sockets.in(roomId).emit("renderSecretAuctionsResult", {
        result,
        classifyPoints: resultingObj.classify,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const biddingStarted = async (roomId) => {
    io.sockets.in(roomId).emit("startBidding", true);
  };

  const expoBeginningTimerStart = ({ hostCode }) => {
    io.to(hostCode).emit("ExpoBeginTimerStarted", true);
  };

  const startNominatedAuctionTimer = ({ hostCode }) => {
    io.to(hostCode).emit("nominatedAuctionStarted");
  };

  const expoBeginningEnded = ({ hostCode }) => {
    console.log("expo ended", hostCode);
    io.sockets.in(hostCode).emit("ExpoBeginTimerEnded");
  };

  const nominatedAuctionBids = async (data) => {
    try {
      const { player, auctionId, roundId } = data;
      const { nominatedAuctionBids } = await collection.findOne({
        hostCode: player.hostCode,
      });
      nominatedAuctionBids[`${auctionId}`] = data;
      if (rooms[player.hostCode].roundId === roundId) {
        io.sockets.in(player.hostCode).emit("setNominatedAuction", data);
        await collection.findOneAndUpdate(
          { hostCode: player.hostCode },
          {
            $set: {
              nominatedAuctionBids: nominatedAuctionBids,
            },
          }
        );
      }
    } catch (e) {
      console.log(e);
    }
  };

  const renderNominatedAuctionResult = async (params) => {
    try {
      const { roomId, nominatedAuctionNumber } = params;
      const room = await collection.findOne({ hostCode: roomId });
      io.sockets.in(roomId).emit("renderNominatedAuctionResult", {
        nominatedAuctionBids: room.nominatedAuctionBids,
      });
    } catch (e) {
      console.log(e);
    }
  };

  socket.on("createRoom", createRoom);
  socket.on("joinRoom", joinRoom);
  // socket.on("getPlayersJoinedInfo", getPlayersJoinedInfo);
  socket.on("startGame", startGame);
  socket.on("landingPageTimerEnded", landingPageTimerEnded);
  socket.on("auctionTimerEnded", hasAuctionTimerEnded);
  socket.on("auctionResultTimerEnded", hasAuctionResultTimerEnded);
  socket.on("setTeams", setTotalNumberOfPlayers);
  socket.on("putCurrentLocation", putCurrentLocation);
  socket.on("calculateTeamRevenue", calculateRevenue);
  socket.on("paintingNominated", emitNominatedPaintingId);
  socket.on("locationPhaseTimerEnded", hasLocationPhaseTimerEnded);
  socket.on("startTimer", locationPhaseStartTimer);
  socket.on("expoBeginningTimerEnded", hasExpoBeginningTimerEnded);
  socket.on("sellingResultsTimerEnded", hasSellingResultsTimerEnded);
  socket.on("startExpoBeginTimer", expoBeginningTimerStart);
  socket.on("expoBeginEnded", expoBeginningEnded);

  //new design additions
  socket.on("addtofavorites", addToFavorites);
  socket.on("addEnglishAuctionBid", addEnglishAuctionBid);
  socket.on("addSecondPriceAuctionBid", addToSecondPricedSealedBidAuction);
  socket.on("englishAuctionTimerEnded", renderEnglishAuctionResults);
  socket.on("addSecretAuctionBid", addToFirstPricedSealedBidAuction);
  socket.on("secretAuctionTimerEnded", renderSecretAuctionResults);
  socket.on("secondPriceAuctionTimerEnded", renderSecondPriceAuctionsResult);
  socket.on("biddingStarted", biddingStarted);
  socket.on("dutchAuctionTimerEnded", renderDutchAuctionResults);
  socket.on("startNominatedAuctionTimer", startNominatedAuctionTimer);
  socket.on("nominatedAuctionBids", nominatedAuctionBids);
  socket.on("nominatedAuctionTimerEnded", renderNominatedAuctionResult);
};
