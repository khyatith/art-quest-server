const { getLeaderboard, calculateTotalAmountSpent, calculateTeamEfficiency,  createTeamRankForBuyingPhase } = require("../helpers/game");

async function getNewLeaderboard(rooms, hostCode, totalArtifacts) {
  // update leaderboard
  const leaderboard = await getLeaderboard(rooms, hostCode);
  console.log('leaderboard', leaderboard);

  //total amt by teams
  const totalAmountByTeam = await calculateTotalAmountSpent(leaderboard, hostCode, rooms);

  const teamStats = await calculateTeamEfficiency(totalAmountByTeam, leaderboard);

  const teamRanks = createTeamRankForBuyingPhase(teamStats.totalPaintingsWonByTeams, teamStats.efficiencyByTeam, totalArtifacts);

  return { leaderboard, totalAmountByTeam, totalPaintingsWonByTeams: teamStats.totalPaintingsWonByTeams, teamRanks };
};

module.exports = {
	getNewLeaderboard,
};
