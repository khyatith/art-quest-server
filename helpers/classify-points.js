const calculateClassify = (teams, classifyPoints) => {
  function sub(teamArray, artMovementName) {
    var count = -1;
    teamArray.map((ta) => {
      if (ta.artMovement === artMovementName) {
        count++;
      }
    });
    if (count === -1) return 0;
    return count * 5;
  }

  const artMovements = [
    "ukiyo-e",
    "abstract",
    "modernism",
    "realism",
    "pop-art",
    "modern-art",
  ];

  Object.keys(teams).map((i) => {
    for (let k = 0; k < 6; k++) {
      classifyPoints[i] += sub(teams[i], artMovements[k]);
    }
  });
  return classifyPoints;
};

const isPresentAuctionsInLeaderboard = (auctionBidsIds, leaderboardIds) => {
  console.log('auctionBidsIds', auctionBidsIds);
  console.log('leaderboardIds', leaderboardIds);
  const isPresentInLeaderboard = auctionBidsIds.every(v => leaderboardIds.includes(parseInt(v)));
  return isPresentInLeaderboard;
}

const calculate = (auctionBidsDetails, AUCTION_TYPE, pastLeaderBoard = {}) => {
  const auctionIdsInLeaderboard = pastLeaderBoard && Object.values(pastLeaderBoard)
  .reduce((acc, value) => {
    const auctionidsinvalue = value.map((v) => v.auctionId);
    return [
      ...acc,
      ...auctionidsinvalue,
    ];
  }, []);

  if (AUCTION_TYPE === "ENGLISH") {
    try {
      let teamsScorecard = {};
      let classifyPoints = {};
      const isPresentInLeaderboard = isPresentAuctionsInLeaderboard(Object.keys(auctionBidsDetails), auctionIdsInLeaderboard);
      console.log('isPresentInLeaderboard', isPresentInLeaderboard);

      if (!isPresentInLeaderboard) {
        Object.entries(auctionBidsDetails).forEach(([key, obj]) => {
          if (!teamsScorecard[obj.bidTeam]) {
            teamsScorecard = {
              ...teamsScorecard,
              [obj.bidTeam]: [{
                artMovement: obj.artMovement
              }],
            }
          } else {
            teamsScorecard[obj.bidTeam].push({
              artMovement: obj.artMovement,
            });
          }
          classifyPoints = {
            [obj.bidTeam] : 0
          };
        });
      }

      pastLeaderBoard && Object.values(pastLeaderBoard).forEach((details) => {
        for (obj in details) {
          const currentBidTeam = details[obj].bidTeam;
          const currentArtMovement = details[obj].artMovement;
          if (!teamsScorecard[currentBidTeam]) {
            teamsScorecard = {
              ...teamsScorecard,
              [currentBidTeam]: [{
                artMovement: currentArtMovement,
              }]
            };
          } else {
            teamsScorecard[currentBidTeam].push({
              artMovement: currentArtMovement,
            });
          }

          // classify points
          if (!classifyPoints[currentBidTeam]) {
            classifyPoints = {
              ...classifyPoints,
              [currentBidTeam]: 0
            };
          }
        }
      });

      return calculateClassify(teamsScorecard, classifyPoints);
    } catch (err) {
      console.log(err);
    }
  }
  
  if (AUCTION_TYPE === "DUTCH") {
    try {
      const { dutchAuctionBids } = auctionBidsDetails;
      const teamArray = [];
      const teamsScorecard = {};
      const classifyPoints = {};
      Object.keys(dutchAuctionBids).map((cd) => {
        const frequency = teamArray.filter(
          (item) => item === dutchAuctionBids[cd].bidTeam
        );
        if (frequency.length === 0)
          teamArray.push(dutchAuctionBids[cd].bidTeam);
      });
      for (const teamName of teamArray) {
        teamsScorecard[teamName] = [];
        classifyPoints[teamName] = 0;
      }

      Object.keys(dutchAuctionBids).map((bidIndex) => {
        teamsScorecard[dutchAuctionBids[bidIndex].bidTeam].push({
          artMovement: dutchAuctionBids[bidIndex].artMovement,
        });
      });
      
      return calculateClassify(teamsScorecard, classifyPoints);
    } catch (err) {
      console.log(err);
    }
  }

  if (AUCTION_TYPE === "SECRET" || AUCTION_TYPE === "SECOND_PRICED") {
    try {
      let teamsScorecard = {};
      let classifyPoints = {};
      const isPresentInLeaderboard = isPresentAuctionsInLeaderboard(Object.keys(auctionBidsDetails), auctionIdsInLeaderboard);
      if (!isPresentInLeaderboard) {
        Object.entries(auctionBidsDetails).forEach(([key, obj]) => {
          if (!teamsScorecard[obj.bidTeam]) {
            teamsScorecard = {
              ...teamsScorecard,
              [obj.bidTeam]: [{
                artMovement: obj.artMovement
              }],
            }
          } else {
            teamsScorecard[obj.bidTeam].push({
              artMovement: obj.artMovement,
            });
          }
          classifyPoints = {
            [obj.bidTeam] : 0
          };
        });
      }
      Object.values(pastLeaderBoard).forEach((details) => {
        for (obj in details) {
          const currentBidTeam = details[obj].bidTeam;
          const currentArtMovement = details[obj].artMovement;
          if (!teamsScorecard[currentBidTeam]) {
            teamsScorecard = {
              ...teamsScorecard,
              [currentBidTeam]: [{
                artMovement: currentArtMovement,
              }]
            };
          } else {
            teamsScorecard[currentBidTeam].push({
              artMovement: currentArtMovement,
            });
          }

          // classify points
          if (!classifyPoints[currentBidTeam]) {
            classifyPoints = {
              ...classifyPoints,
              [currentBidTeam]: 0
            };
          }
        }
      });
      return calculateClassify(teamsScorecard, classifyPoints);
    } catch (err) {
      console.log(err);
    }
  }
  if(AUCTION_TYPE === "NOMINATED_AUCTION"){
    try {
      let teamsScorecard = {};
      let classifyPoints = {};
      Object.values(pastLeaderBoard).forEach((details) => {
        for (obj in details) {
          const currentBidTeam = details[obj].bidTeam;
          const currentArtMovement = details[obj].artMovement;
          if (!teamsScorecard[currentBidTeam]) {
            teamsScorecard = {
              ...teamsScorecard,
              [currentBidTeam]: [{
                artMovement: currentArtMovement,
              }]
            };
          } else {
            teamsScorecard[currentBidTeam].push({
              artMovement: currentArtMovement,
            });
          }

          // classify points
          if (!classifyPoints[currentBidTeam]) {
            classifyPoints = {
              ...classifyPoints,
              [currentBidTeam]: 0
            };
          }
        }
      });
      return calculateClassify(teamsScorecard, classifyPoints);
      
    } catch (e) {
      console.log(e);
    }
  }
  
  
};

module.exports = { calculate };
