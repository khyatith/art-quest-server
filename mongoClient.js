var { MongoClient } = require('mongodb');
var connectionString = "mongodb+srv://admin:admin@cluster0.5av8m.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
var db = null;
exports.createConnection = () => {
   if(db == null){ 
        const client =  MongoClient.connect(connectionString, { useUnifiedTopology: true});
        db = client.db('art_quest');
        return db;
   }
   else
        return db;
}
