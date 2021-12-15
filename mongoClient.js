var { MongoClient } = require('mongodb');
var connectionString = 'mongodb+srv://admin:admin@cluster0.ojmn8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
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
