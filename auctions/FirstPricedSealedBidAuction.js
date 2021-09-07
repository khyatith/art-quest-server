let { FIRST_PRICED_SEALED_BID_AUCTIONS } = require('../constants');

class FirstPricedSealedBidAuction {

  constructor(currentAuctionObject, bidTeam, bidAmount, timestamp) {
    this.currentAuctionObject = currentAuctionObject;
    this.bidTeam = bidTeam;
    this.bidAmount = bidAmount;
    this.timestamp = timestamp;
  }

  updateBidObject() {
    FIRST_PRICED_SEALED_BID_AUCTIONS.push({
      auctionObj: this.currentAuctionObject,
      bidTeam: this.bidTeam,
      bidAmount: this.bidAmount,
      timestamp: this.timestamp
    });
    return FIRST_PRICED_SEALED_BID_AUCTIONS;
  }

  calculateWinner() {
    const winner = FIRST_PRICED_SEALED_BID_AUCTIONS.reduce((acc, obj) => {
      if (acc.bidAmount === obj.bidAmount) {
        if (acc.bidAt < obj.bidAt) {
          return acc;
        } else {
          return obj;
        }
      }
      return (acc.bidAmount > obj.bidAmount) ? acc : obj;
    }, {});
    if (Object.keys(winner).length > 0) {
      winner.auctionObj.isWinnerCalculated = true;
      winner.auctionObj.auctionState = 2;
    }
    return winner;
  }
}

module.exports.FirstPricedSealedBidAuction = FirstPricedSealedBidAuction;
