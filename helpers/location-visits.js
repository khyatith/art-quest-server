const intersection = require("lodash.intersection");

const visitedLocationDetails = (data) => {
  if (data.length <= 1) return [];

  const teams = [];
  data.map((doc) => {
    teams.push(doc.locations);
  });

  let resultant = intersection(...teams);
  return resultant;
};

module.exports = { visitedLocationDetails };
