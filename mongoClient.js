var { MongoClient } = require('mongodb');
var connectionString = process.env.MONGO_CLIENT_URL;
var db = null;
exports.createConnection = async () => {
   if(db == null){ 
        const client =  await MongoClient.connect(connectionString, { useUnifiedTopology: true});
        db = client.db('art_quest');
        return db;
   }
   else
        return db;
}
