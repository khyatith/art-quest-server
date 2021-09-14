const AUCTION_STATES = [
	0, // todo
	1, // in-progress
	2, // done
];

const FIRST_PRICED_SEALED_BID_AUCTIONS = [];
const ENGLISH_AUCTIONS = [];

module.exports = {
	rooms: [],
	AUCTION_STATES,
	FIRST_PRICED_SEALED_BID_AUCTIONS,
	ENGLISH_AUCTIONS,
	boardArray: [
		{ team: "Blue", artifacts: [] },
		{ team: "Red", artifacts: [] },
		{ team: "Green", artifacts: [] },
		{ team: "Yellow", artifacts: [] },
		{ team: "Purple", artifacts: [] },
	],
};
