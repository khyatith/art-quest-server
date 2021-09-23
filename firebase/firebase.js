var firebaseAdminSdk = require("firebase-admin");
let firebaseAdminApp;

if (process.env.FIREBASE_SERVICE_KEYS) {
	firebaseAdminApp = firebaseAdminSdk.initializeApp({credential: firebaseAdminSdk.credential.cert(
		JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_KEYS, 'base64').toString('ascii')))
	});
} else {
	const serviceAccount = require("../auctions-service-key.json");
	firebaseAdminApp = firebaseAdminSdk.initializeApp({
		credential: firebaseAdminSdk.credential.cert(serviceAccount),
	});
}

const db = firebaseAdminApp.firestore();

module.exports = { db };
