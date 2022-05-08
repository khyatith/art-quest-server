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

const calculate = (auctionBidsDetails, AUCTION_TYPE) => {
  if (AUCTION_TYPE === "ENGLISH") {
    try {
      const { englishAuctionBids } = auctionBidsDetails;
      const teamArray = [];
      const teamsScorecard = {};
      const classifyPoints = {};
      Object.keys(englishAuctionBids).map((cd) => {
        const frequency = teamArray.filter(
          (item) => item === englishAuctionBids[cd].bidTeam
        );
        if (frequency.length === 0)
          teamArray.push(englishAuctionBids[cd].bidTeam);
      });
      for (const teamName of teamArray) {
        teamsScorecard[teamName] = [];
        classifyPoints[teamName] = 0;
      }

      Object.keys(englishAuctionBids).map((bidIndex) => {
        teamsScorecard[englishAuctionBids[bidIndex].bidTeam].push({
          artMovement: englishAuctionBids[bidIndex].artMovement,
        });
      });
      return calculateClassify(teamsScorecard, classifyPoints);
    } catch (err) {
      console.log(err);
    }
  }

  if (AUCTION_TYPE === "SECRET") {
    try {
      const teamArray = [];
      const teamsScorecard = {};
      const classifyPoints = {};
      Object.keys(auctionBidsDetails).map((cd) => {
        const frequency = teamArray.filter(
          (item) => item === auctionBidsDetails[cd].bidTeam
        );
        if (frequency.length === 0)
          teamArray.push(auctionBidsDetails[cd].bidTeam);
      });
      for (const teamName of teamArray) {
        teamsScorecard[teamName] = [];
        classifyPoints[teamName] = 0;
      }

      Object.keys(auctionBidsDetails).map((bidIndex) => {
        teamsScorecard[auctionBidsDetails[bidIndex].bidTeam].push({
          artMovement: auctionBidsDetails[bidIndex].artMovement,
        });
      });
      return calculateClassify(teamsScorecard, classifyPoints);
    } catch (err) {
      console.log(err);
    }
  }
};

module.exports = { calculate };
