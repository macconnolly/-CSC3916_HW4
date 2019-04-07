var mongoose = require('mongoose');
var Schema = mongoose.Schema;


mongoose.connect(process.env.DB, { useNewUrlParser: true } );


var reviewSchema = new Schema({
    movieName: {
        type: String,
        required: true
    },
    reviewerName: {
        type: String,
        required: true,
    },
    reviewBody: {
        type: String,
        required: true
    },
    reviewScore: {
        type: Number,
        required: true

    }

});


// return the model
module.exports = mongoose.model('Review', reviewSchema);