var { MongoClient } = require('mongodb');

var connectionString = "mongodb+srv://admin:admin@cluster0.5av8m.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

exports.createConnection = () => {
    return MongoClient.connect(connectionString, { useUnifiedTopology: true})
}
