function findSecondHighestBid(arr, arrSize) {
  let i;

  if (arrSize < 2) {
    return arr.bidAmount;
  }

  // sort the array
  arr.sort();

  for (i = arrSize - 2; i >= 0; i--) {
      // if the element is not
      // equal to largest element
      if (arr[i] != arr[arrSize - 1]) {
        return arr[i];
      } else {
        return arr[i];
      }
  }

  return null;
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

	//englishAuctions
	if (englishAuctionsObj) {
		for (var englishAuction in englishAuctionsObj) {
			const leaderBoardKeys = Object.keys(leaderboard);
      const auctionItem = englishAuctionsObj[englishAuction];
      const EAwinningTeam = auctionItem.bidTeam;
			if (leaderBoardKeys && leaderBoardKeys.includes(EAwinningTeam)) {
        const isExistingAuction = leaderboard[EAwinningTeam].filter(item => item.auctionObj.id === auctionItem.auctionId)[0];
        if (!isExistingAuction) {
          leaderboard[`${EAwinningTeam}`].push(auctionItem);
        }
      } else {
        leaderboard[`${EAwinningTeam}`] = [auctionItem];
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
        const isExistingFPSBAuction = leaderboard[FPSBwinningteam].filter(item => item.auctionObj.id === FPSBwinner.auctionId)[0];
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
      let SPSBwinner = SPSBItem.length === 1 ? SPSBItem : SPSBItem.filter(item => parseInt(item.bidAmount) >= parseInt(secondHighestBid));
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

const calculatePaintingQuality = (leaderBoard) => {
  if (!leaderBoard) return null;
  let paintingQualityResult = {};
  for(team in leaderBoard) {
    const currentTeamData = leaderBoard[team];
    const currentTeamAvg = teamPaintingAverage(currentTeamData);
    paintingQualityResult = {
      ...paintingQualityResult,
      [team]: currentTeamAvg,
    }
  }
  return paintingQualityResult
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

function teamPaintingAverage(arr) {
  let totalPaintingQuality = 0.0;
  return arr.reduce((acc,v) => {
    totalPaintingQuality += v.auctionObj.paintingQuality;
    acc = totalPaintingQuality / arr.length;
    return Math.round((acc + Number.EPSILON) * 100) / 100
  }, {});
};

function getTopTwoTeams(sortedObj) {
  let index = 0;
  let result = {};
  const topTwo = Object.entries(sortedObj).map(([key, value]) => {         
      if (index <= 1) {
        result[key] = value;
        index++;
      }
      return result;
    });
  return topTwo[0];
}

function getWinnerFromTopTwo(sortedByPaintingsWon, teamEfficiency, leaderBoard) {
  let avgPaintingQualityByTeam = {};
  const result = Object.entries(sortedByPaintingsWon).sort(([ka,a],[kb,b]) => {
    if (parseFloat(teamEfficiency[ka]) === parseFloat(teamEfficiency[kb])) {
      avgPaintingQualityByTeam = calculatePaintingQuality(leaderBoard);
      const kaTeamData = leaderBoard[ka];
      const kaTeamPaintingAvg = teamPaintingAverage(kaTeamData);
      const kbTeamData = leaderBoard[kb];
      const kbTeamPaintingAvg = teamPaintingAverage(kbTeamData);
      return kaTeamPaintingAvg > kbTeamPaintingAvg ? -1 : 1;
    }
    return parseFloat(teamEfficiency[ka]) < parseFloat(teamEfficiency[kb]) ? 1 : -1;
  })
  .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  return { winnerName: Object.keys(result)[0], avgPaintingQualityByTeam }
}

function calculateBuyingPhaseWinner(room) {
  const { leaderBoard, totalAmountSpentByTeam, teamEfficiency, totalPaintingsWonByTeam } = room;
  const sortedObjByPaintingsWon = Object.entries(totalPaintingsWonByTeam)
  .sort(([ka,a],[kb,b]) => {
    if (b-a === 0) {
      if (totalAmountSpentByTeam[ka] < totalAmountSpentByTeam[kb]) {
        return -1;
    } else {
        return 1;
      }
    }
    return b-a;
  })
  .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  const topTwo = getTopTwoTeams(sortedObjByPaintingsWon);
  const { winnerName, avgPaintingQualityByTeam } = getWinnerFromTopTwo(topTwo, teamEfficiency, leaderBoard);
  return { leaderBoard, winner: winnerName, sortedObjByPaintingsWon, teamEfficiency, totalAmountSpentByTeam, avgPaintingQualityByTeam };
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
  const { interestInArt, population, paintingQuality, ticketPrice } = data;
  let demandFunc;
  if (ticketPrice > 50) {
    const utilityFunc =  parseFloat(ticketPrice) + parseFloat(interestInArt) + parseFloat(paintingQuality);
    demandFunc =  (1 + Math.log(utilityFunc))/Math.log(utilityFunc);
  } else if (ticketPrice <= 50) {
    const utilityFunc =  parseFloat(ticketPrice) * (parseFloat(interestInArt) + parseFloat(paintingQuality));
    demandFunc = (1 + Math.log(utilityFunc))/Math.log(utilityFunc);
  }
  const revenue = parseFloat(population) * demandFunc;
  if (isInt(revenue)) {
    return revenue
  } else {
    return revenue.toFixed(1);
  }
}

function createTeamRankForBuyingPhase(totalPaintingsWonByTeams, totalAmountSpentByTeam, teamEfficiency) {
  const sortedObjByPaintingsWon = Object.entries(totalPaintingsWonByTeams)
  .sort(([ka,a],[kb,b]) => {
    if (b-a === 0) {
      if (totalAmountSpentByTeam[ka] < totalAmountSpentByTeam[kb]) {
        return -1;
    } else {
        return 1;
      }
    }
    return b-a;
  })
  .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  const teamRanks = Object.entries(sortedObjByPaintingsWon).sort(([ka,a],[kb,b]) => {
    return parseFloat(teamEfficiency[ka]) < parseFloat(teamEfficiency[kb]) ? 1 : -1;
  })
  .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  return teamRanks;
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
};
