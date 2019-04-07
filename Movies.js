var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Review = require('./Reviews');
var client = { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const dbName = 'movie-assignment-3';

MongoClient.connect(process.env.DB, { useNewUrlParser: true }, function(err, client) {

    const db = client.db(dbName);
    const movies = db.collection('movies');

    movies.aggregate([
        {
            $lookup: {
                from: 'reviews',
                localField: 'title',
                foreignField: 'movieName',
                as: 'reviews'
            }
        },
        {
            $unwind: "reviews"
        }
    ]);

});


var movieSchema = new Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    releaseDate: {
        type: Number,
        min: [1900, 'Must be greater than 1899'],
        max: [2100, 'Must be less than 2100'],
        required: true
    },
    genre: {
        type: String, enum: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Thriller', 'Western', 'Science Fiction'],


    },

});



let Movies = mongoose.model("Movies", movieSchema );
Movies.aggregate([
    {
        $lookup: {
            from: 'reviews',
            localField: 'title',
            foreignField: 'movieName',
            as: 'reviews'
        }
    },
    {
        $unwind: "reviews"
    }
]);




// return the model
module.exports = mongoose.model('Movie', movieSchema);