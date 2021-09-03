let { ENGLISH_AUCTIONS } = require('../constants');

class EnglishAuction {

  constructor(currentAuctionObject, bidTeam, bidAmount, timestamp) {
    this.currentAuctionObject = currentAuctionObject;
    this.bidTeam = bidTeam;
    this.bidAmount = bidAmount;
    this.timestamp = timestamp;
  }

  updateBidObject() {
    ENGLISH_AUCTIONS = {
      auctionObj: this.currentAuctionObject,
      bidTeam: this.bidTeam,
      bidAmount: this.bidAmount,
      timestamp: this.timestamp
    };
    return ENGLISH_AUCTIONS;
  }

  calculateWinner() {
    return ENGLISH_AUCTIONS;
  }
}

module.exports.EnglishAuction = EnglishAuction;
