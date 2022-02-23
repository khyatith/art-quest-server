function findSecondHighestBid(arr, arrSize) {
  var highest = Number.MIN_VALUE;
	var secondHighest = Number.MIN_VALUE;

  // Loop over the array
  for (var i = 0; i < arrSize; i++) {

    // If we've found a new highest number...
    if (arr[i] > highest) {
      // ...shift the current highest number to second highest
      secondHighest = highest;

      // ...and set the new highest.
      highest = arr[i];
    } else if (arr[i] > secondHighest)
    // Just replace the second highest
    secondHighest = arr[i];
  }
  return secondHighest;
}

function updateTotalAmountsForAllPayAuctions(allPayBids) {
  if (allPayBids) {
    let finalResult;
    for (var allPayBidObj in allPayBids) {
      const allBidsArr = allPayBids[allPayBidObj];
      finalResult = allBidsArr.reduce((acc, currentObj) => {
        const currentTeam = currentObj.bidTeam;
        const bidAmountToAdd = parseInt(currentObj.bidAmount);
        if (finalResult && finalResult[currentTeam]) {
          let existingValue = finalResult[currentTeam];
          existingValue += bidAmountToAdd;
          acc = {
            ...acc,
            [currentTeam]: existingValue
          }
        } else {
          acc = {
            ...acc,
            [currentTeam]: bidAmountToAdd
          }
        }
        return acc;
      }, {});
    }
    return finalResult;
  }
}

function getLeaderboard(rooms, roomCode) {
  const leaderboard = rooms[roomCode].leaderBoard;
	const currentRoom = rooms[roomCode];
  const englishAuctionsObj = currentRoom.englishAuctionBids;
  const firstPricedSealedBidAuctionsObj = currentRoom.firstPricedSealedBids;
  const secondPricedSealedBidAuctionObj = currentRoom.secondPricedSealedBids;
  const allPayAuctionBidObj = currentRoom.allPayAuctions;
  const maxEnglishAuctionBids = currentRoom.maxEnglishAuctionBids;

	//englishAuctions
	if (englishAuctionsObj) {
		for (var englishAuction in englishAuctionsObj) {
			const leaderBoardKeys = Object.keys(leaderboard);
      const EAWinner = englishAuctionsObj[englishAuction];
      // const EAWinner = getWinningEnglishAuctionBid(currentRoom.maxEnglishAuctionBids, HighestAuctionItem, HighestAuctionItem.auctionId);
      const EAwinningTeam = EAWinner.bidTeam;
			if (leaderBoardKeys && leaderBoardKeys.includes(EAwinningTeam)) {
        const isExistingAuction = leaderboard[EAwinningTeam].filter(item => parseInt(item.auctionId, 10) === parseInt(EAWinner.auctionId, 10))[0];
        if (!isExistingAuction) {
          leaderboard[`${EAwinningTeam}`].push(EAWinner);
        }
      } else {
        leaderboard[`${EAwinningTeam}`] = [EAWinner];
      }
		}
  }

  if (maxEnglishAuctionBids) {
    for (let maxBids in maxEnglishAuctionBids) {
      const leaderBoardKeys = Object.keys(leaderboard);
      if (!leaderBoardKeys || !leaderBoardKeys.includes(maxBids)) {
        const maxBidArr = maxEnglishAuctionBids[maxBids];
        const allBidsArr = maxBidArr.map((obj) => parseInt(obj.bidAmount));
        const highestBidInMaxAuctionBidsArray = allBidsArr.length === 1 ? allBidsArr[0]: findHighestBid(allBidsArr);
        let englishMaxBidsWinner = maxBidArr.filter((obj) => parseInt(obj.bidAmount) === parseInt(highestBidInMaxAuctionBidsArray));
        const maxBidsWinningTeam = englishMaxBidsWinner[0].bidTeam;
        if (leaderBoardKeys && leaderBoardKeys.includes(maxBidsWinningTeam)) {
          const isExistingMaxBidAuction = leaderboard[maxBidsWinningTeam].filter(item => item.auctionObj.id === englishMaxBidsWinner[0].auctionId)[0];
          if (!isExistingMaxBidAuction) {
            leaderboard[`${maxBidsWinningTeam}`].push(englishMaxBidsWinner[0]);
          }
        } else {
          leaderboard[`${maxBidsWinningTeam}`] = [englishMaxBidsWinner[0]];
        }
      }
    }
  }
  
  //firstPricedSealedBidAuctions
  if (firstPricedSealedBidAuctionsObj) {
    for (var fristPricedSealedAuction in firstPricedSealedBidAuctionsObj) {
      const leaderBoardFSBKeys = Object.keys(leaderboard);
      const FPSBItem = firstPricedSealedBidAuctionsObj[fristPricedSealedAuction];
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
        return (accBid > objBid) ? acc : obj;
      }, {});
      const FPSBwinningteam = FPSBwinner.bidTeam;
      if (leaderBoardFSBKeys && leaderBoardFSBKeys.includes(FPSBwinningteam)) {
        const isExistingFPSBAuction = leaderboard[FPSBwinningteam].filter(item => item.auctionId === FPSBwinner.auctionId)[0];
        if (!isExistingFPSBAuction) {
          leaderboard[`${FPSBwinningteam}`].push(FPSBwinner);
        }
      } else {
        leaderboard[`${FPSBwinningteam}`] = [FPSBwinner];
      }
    }
  }

  //secondPricedSealedBidAuctions
  if (secondPricedSealedBidAuctionObj) {
    for (var secondPricedSealedAuction in secondPricedSealedBidAuctionObj) {
      const leaderBoardSPSBKeys = Object.keys(leaderboard);
      const SPSBItem = secondPricedSealedBidAuctionObj[secondPricedSealedAuction];
      //Find the second highest bid amount
      const allBidsArr = SPSBItem.map((obj) => parseInt(obj.bidAmount));
      const secondHighestBid = allBidsArr.length === 1 ? allBidsArr[0]: findSecondHighestBid(allBidsArr, allBidsArr.length);
      let SPSBwinner = SPSBItem.length === 1 ? SPSBItem : SPSBItem.filter(item => parseInt(item.bidAmount) > parseInt(secondHighestBid));
      if (SPSBwinner.length > 1) {
        SPSBwinner = SPSBwinner.reduce((acc, winner) => {
          return winner.bidAt < acc.bidAt ? winner : acc;
        });
      } else {
        SPSBwinner = SPSBwinner[0];
      }
      const SBSPWinnerFinal = Object.assign({}, SPSBwinner);
      SBSPWinnerFinal.bidAmount = secondHighestBid;
      const SPSBwinningteam = SBSPWinnerFinal.bidTeam;
      if (leaderBoardSPSBKeys && leaderBoardSPSBKeys.includes(SPSBwinningteam)) {
        const isExistingSPSBAuction = leaderboard[SPSBwinningteam].filter(item => item.auctionObj.id === SBSPWinnerFinal.auctionId)[0];
        if (!isExistingSPSBAuction) {
          leaderboard[`${SPSBwinningteam}`].push(SBSPWinnerFinal);
        }
      } else {
        leaderboard[`${SPSBwinningteam}`] = [SBSPWinnerFinal];
      }
    }
  }

  //allPayAuctions
  if (allPayAuctionBidObj) {
    for (var allPayAuctionBids in allPayAuctionBidObj) {
      const leaderBoardAllAuctionKeys = Object.keys(leaderboard);
      const allAuctionItem = allPayAuctionBidObj[allPayAuctionBids];
      const allAuctionwinner = allAuctionItem.reduce((acc, obj) => {
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
      const allAuctionwinningteam = allAuctionwinner.bidTeam;
      if (leaderBoardAllAuctionKeys && leaderBoardAllAuctionKeys.includes(allAuctionwinningteam)) {
        const isExistingAllAuction = leaderboard[allAuctionwinningteam].filter(item => item.auctionObj.id === allAuctionwinner.auctionId)[0];
        if (!isExistingAllAuction) {
          leaderboard[`${allAuctionwinningteam}`].push(allAuctionwinner);
        }
      } else {
        leaderboard[`${allAuctionwinningteam}`] = [allAuctionwinner];
      }
    }
  }

  return leaderboard;
}

function calculateTotalAmountSpent(leaderboard, roomCode, rooms) {
  if (!leaderboard || !roomCode) return null;
  const currentRoom = rooms[roomCode];
  const allPayAuctionBidObj = currentRoom.allPayAuctions;
  let result;
  let totalAmt = Object.values(leaderboard).map(items => {
    let total = 0;
    let newObj;
    return items.reduce((acc, item) => {
      const currentTeam = item.bidTeam;
      const bidAmount = parseInt(item.bidAmount);
      if (item.auctionType !== '4') {
        total += bidAmount;
        newObj = {
          key: currentTeam,
          value: total
        };
      } else {
        newObj = {
          key: currentTeam,
          value: bidAmount || 0
        }
      }
      acc = {
        ...acc,
        ...newObj
      }
      return acc;
    }, {});
  });
  if (totalAmt.length !== 0 && Object.keys(totalAmt[0]).length !== 0) {
  result = totalAmt && totalAmt.reduce(
    (obj, item) => Object.assign(obj, { [item.key]: -item.value }), {});
  }

  if (Object.keys(allPayAuctionBidObj).length > 0){
    const allPayAuctionAmt = updateTotalAmountsForAllPayAuctions(allPayAuctionBidObj);
    if (result) {
      result = Object.entries(result).reduce((acc, [key, value]) => {
        let total = 0;
        if (value) {
          total = allPayAuctionAmt[key] ? parseInt(value) + allPayAuctionAmt[key] : parseInt(value);
        } else {
          total = allPayAuctionAmt[key];
        }
        //const total = parseInt(value) + allPayAuctionAmt[key];
        acc = {
          ...acc,
          [key]: total
        }
        return acc;
      }, {})
    } else {
      result = allPayAuctionAmt;
    }
  }
  currentRoom.totalAmountSpentByTeam = result;
  return currentRoom.totalAmountSpentByTeam;
}

function updateDutchAuctionLeaderboard(room) {
  const { leaderBoard, dutchAuctionBids } = room;
  //ducthAuctions
	if (Object.keys(dutchAuctionBids).length > 0) {
		for (var dutchAuction in dutchAuctionBids) {
			const leaderBoardKeys = Object.keys(leaderBoard);
      const auctionItem = dutchAuctionBids[dutchAuction];
      const DAwinningTeam = auctionItem.bidTeam;
			if (leaderBoardKeys && leaderBoardKeys.includes(DAwinningTeam)) {
        const isExistingDAAuction = leaderBoard[DAwinningTeam].filter(item => item.auctionId === auctionItem.auctionId)[0];
        if (!isExistingDAAuction) {
          leaderBoard[`${DAwinningTeam}`].push(auctionItem);
        }
      } else {
        leaderBoard[`${DAwinningTeam}`] = [auctionItem];
      }
		}
  }
  return leaderBoard;
}

const calculateTotalArtScore = (leaderBoard) => {
  if (!leaderBoard) return null;
  let artScore = {};
  for(team in leaderBoard) {
    const currentTeamData = leaderBoard[team];
    const currentTeamTotalScore = teamArtScore(currentTeamData);
    artScore = {
      ...artScore,
      [team]: currentTeamTotalScore,
    }
  }
  return artScore
}

function gameLoop(state) {
	if (!state) {
		return;
	}
}

function getNextObjectForLiveAuction(parsedRoom, prevAuctionId) {
  let newAuction;
	//const { currentAuctionObj } = prevAuction;
	if (!parseInt(prevAuctionId)) {
    newAuction = parsedRoom.auctions.artifacts[0];
    parsedRoom.auctions.artifacts[0].auctionState = 1;
	} else {
		const id = parseInt(prevAuctionId);
		const nextId = id + 1;
    newAuction = parsedRoom.auctions.artifacts.filter(item => item.id === nextId)[0];
    //update parsed rooms
		parsedRoom.auctions.artifacts.forEach(item => {
			if (item.id === id) {
				item.auctionState = 2;
      }
      if (newAuction && item.id === newAuction.id) {
        item.auctionState = 1;
      }
		});
  }
	if (!newAuction) return { newAuction: null, parsedRoom };
	newAuction.auctionState = 1;
	return { newAuction, parsedRoom };
}

function getRemainingTime(deadline) {
	const total = Date.parse(deadline) - Date.parse(new Date());
	const seconds = Math.floor((total / 1000) % 60);
	const minutes = Math.floor((total / 1000 / 60) % 60);
	return {
		total,
		minutes,
		seconds,
	};
}

function teamArtScore(arr) {
  let totalPaintingQuality = 0.0;
  return arr.reduce((acc,v) => {
    totalPaintingQuality += v.paintingQuality;
    acc = totalPaintingQuality;
    return Math.round((acc + Number.EPSILON) * 100) / 100
  }, {});
};

function calculateBuyingPhaseWinner(room) {
  const { leaderBoard, totalAmountSpentByTeam, teamEfficiency, totalPaintingsWonByTeam, totalArtScoreForTeams, auctions } = room;
  const teamRanks = createTeamRankForBuyingPhase(totalPaintingsWonByTeam,teamEfficiency, auctions.artifacts.length);
  const winnerArr = Object.keys(teamRanks);
  return { leaderBoard, winner: winnerArr[0], totalPaintingsWonByTeam: totalPaintingsWonByTeam, teamsByRank: winnerArr, teamEfficiency, totalAmountSpentByTeam, totalArtScoreForTeams };
}

function calculateTeamEfficiency(totalAmountByTeam, leaderboard) {
  let efficiencyByTeam = {};
  let totalPaintingsWonByTeams = {};
  for(team in leaderboard) {
    const currentTeamData = leaderboard[team];
    const teamEfficiency = currentTeamData.length > 0 ? parseFloat(parseInt(totalAmountByTeam[team]/parseFloat(currentTeamData.length))) : 0;
    efficiencyByTeam = {
      ...efficiencyByTeam,
      [team]: parseFloat(teamEfficiency).toFixed(2)
    }
    totalPaintingsWonByTeams = {
      ...totalPaintingsWonByTeams,
      [team]: parseInt(currentTeamData.length)
    }
  }
  return { efficiencyByTeam, totalPaintingsWonByTeams };
}

function isInt(n) {
  return n % 1 === 0;
}

function calculateSellingRevenue(data) {
  const { interestInArt, population, paintingQuality, ticketPrice, allTeamsInCity } = data;
  let revenue = (parseFloat(interestInArt) * parseFloat(paintingQuality)) / (parseFloat(population) + parseFloat(ticketPrice) + parseInt(allTeamsInCity));
  if (isInt(revenue)) {
    return revenue
  } else {
    return revenue.toFixed(1);
  }
}

function sortByEfficiency(teamEfficiency) {
  return Object.entries(teamEfficiency)
  .sort(([ka,a],[kb,b]) => {
    return b-a;
  })
  .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
}

function sortByTotalScore(scoresByTeam) {
  return Object.entries(scoresByTeam)
  .sort(([ka,a],[kb,b]) => {
    return b-a;
  })
  .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
}

function createTeamRankForBuyingPhase(totalPaintingsWonByTeam, teamEfficiency, totalNumberOfPaintings) {
  const sortedByEfficiency = sortByEfficiency(teamEfficiency);
  let index = 10;
  const totalEfficiencyByTeam = Object.keys(sortedByEfficiency).reduce((acc, team) => {
    acc = {
      ...acc,
      [team]: index
    };
    index = index - 2;
    return acc;
  }, {});

  const teamScores = Object.entries(totalPaintingsWonByTeam).reduce((acc, [key, value]) => {
    const currentTeam = key;
    const teamScore = ((value * 50 + totalEfficiencyByTeam[currentTeam] * 50)/ (totalNumberOfPaintings + 10)/2);
    acc = {
      ...acc,
      [currentTeam]: teamScore
    }
    return acc;
  }, {});
  teamRanks = sortByTotalScore(teamScores);
  return teamRanks;
}

function getSecondPricedSealedBidWinner(SPSBItem) {
  const allBidsArr = SPSBItem.map((obj) => parseInt(obj.bidAmount));
  const secondHighestBid = allBidsArr.length === 1 ? allBidsArr[0]: findSecondHighestBid(allBidsArr, allBidsArr.length);
  let SPSBwinner = SPSBItem.length === 1 ? SPSBItem : SPSBItem.filter(item => parseInt(item.bidAmount) > parseInt(secondHighestBid));
  if (SPSBwinner.length > 1) {
    SPSBwinner = SPSBwinner.reduce((acc, winner) => {
      return winner.bidAt < acc.bidAt ? winner : acc;
    });
  } else {
    SPSBwinner = SPSBwinner[0];
  }
  const SBSPWinnerFinal = Object.assign({}, SPSBwinner);
  const SPSBwinningteam = SBSPWinnerFinal.bidTeam;
  return { team: SPSBwinningteam, bid: secondHighestBid };
}

function findHighestBid(allBids) {
  return allBids.reduce(function (p, v) {
    return ( p > v ? p : v );
  });
}

function getWinningEnglishAuctionBid(maxEnglishAuctionBids, highestBidObj, auctionId) {
  let EAWinner = {};
  if (!maxEnglishAuctionBids[`${auctionId}`] && (!highestBidObj || Object.keys(highestBidObj).length === 0)) return {};
  if (!maxEnglishAuctionBids[`${auctionId}`]) {
    return { EAWinningTeam: highestBidObj.bidTeam, EAWinnerBid: highestBidObj.bidAmount, highestBidObj };
  }
  const allBidsArr = maxEnglishAuctionBids[`${auctionId}`].map((obj) => parseInt(obj.bidAmount));
  const highestBidInMaxAuctionBidsArray = allBidsArr.length === 1 ? allBidsArr[0]: findHighestBid(allBidsArr);
  let winner = maxEnglishAuctionBids[`${auctionId}`].filter((obj) => parseInt(obj.bidAmount) === parseInt(highestBidInMaxAuctionBidsArray));
  if (highestBidObj && Object.keys(highestBidObj).length > 0) {
    if (highestBidInMaxAuctionBidsArray >= highestBidObj.bidAmount) {
      let winnerObj = {
        ...winner[0],
        bidAmount: highestBidObj.bidAmount,
      }
      EAWinner = { EAWinningTeam: winner[0].bidTeam, EAWinnerBid: highestBidObj.bidAmount, highestBidObj: winnerObj };
    } else {
      EAWinner = { EAWinningTeam: highestBidObj.bidTeam, EAWinnerBid: highestBidObj.bidAmount, highestBidObj };
    }
  } else {
    EAWinner = { EAWinningTeam: winner[0].bidTeam, EAWinnerBid: winner[0].bidAmount, highestBidObj: winner[0] };
  }
  return EAWinner;
}

module.exports = {
	gameLoop,
	getNextObjectForLiveAuction,
	getRemainingTime,
  getLeaderboard,
  calculateTotalAmountSpent,
  calculateBuyingPhaseWinner,
  calculateTeamEfficiency,
  calculateSellingRevenue,
  createTeamRankForBuyingPhase,
  updateDutchAuctionLeaderboard,
  getSecondPricedSealedBidWinner,
  getWinningEnglishAuctionBid,
  calculateTotalArtScore,
};
