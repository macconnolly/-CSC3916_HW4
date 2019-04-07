var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');
var jwt = require('jsonwebtoken');

var app = express();
module.exports = app; // for testing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());
let router = express.Router();
const mongoose = require('mongoose')
let client = { MongoClient } = require('mongodb');

let db = MongoClient.connect(process.env.DB, { useNewUrlParser: true });



// User Routes
router.route('/users/:userID')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.userID;
        console.log(id);
        User.findById(id, function(err, user) {
            if (err) res.send(err);

            var userJson = JSON.stringify(user);
            // return that user
            res.json(user);
        });
    });



router.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res) {
        User.find(function (err, users) {
            if (err) res.send(err);
            // return the users

            res.json(users);
        });
    });

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, message: 'Please pass username and password.'});
    }
    else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        // save the user
        user.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists. '});
                else
                    return res.send(err);
            }

            res.json({ success: true, message: 'User created!' });
        });
    }
});

router.post('/signin', function(req, res) {
    var userNew = new User();
    userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) res.send(err);

        user.comparePassword(userNew.password, function(isMatch){
            if (isMatch) {
                var userToken = {id: user._id, username: user.username};
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, message: 'Authentication failed.'});
            }
        });


    });
});



// Movie Routes
router.route('/movies/:id')
    .delete(authJwtController.isAuthenticated, function(req, res) {
        Movie.findById(req.params.id, function(err, movie) {
            movie.remove(function(err) {
                if (err) {
                    return res.status(500).jsonp({status : 500, message: err.message });
                }
                res.status(200).jsonp({status : 200, message : 'Movie deleted.' });
            });
        });
    });


router.route('/movies')
    .post(authJwtController.isAuthenticated, function(req, res) {
    var movieNew = new Movie();

        movieNew.title = req.body.title;
        movieNew.releaseDate = req.body.releaseDate;
        movieNew.genre = req.body.genre;
        movieNew.actors = req.body.actors;
        // console.log(req.body)
        // console.log(movieNew.actors);

        if (movieNew.actors.length < 3){
            return res.status(500).jsonp({status : 500, message : "Must include at least three actors" });
        }


    movieNew.save(function(err, movie) {
        if (err) {
            return res.status(500).jsonp({status : 500, message : err.message });
        }
        res.status(200).jsonp(movie);
    });
});



router.route('/movies/:movieID')
    .get(authJwtController.isAuthenticated, function (req, res) {
        let id = req.params.movieID;

        console.log(req.query)
        console.log(req.query.reviews);
        console.log(req.query.reviews == 'true')

        if (req.query.reviews == 'true') {
            Movie.aggregate([
                { $match:
                        { _id: mongoose.Types.ObjectId(req.params.movieID) }
                },
                {
                    $lookup: {
                        from: 'reviews',
                        localField: 'title',
                        foreignField: 'movieName',
                        as: 'reviews'
                    }
                }

            ], (err, result) => {
                if (err) {

                    res.json({ message: 'Error. Cannot list roles', errror: err });
                }
                res.status(200).jsonp(result);

            });

        }
        else {
            Movie.findById(id, function(err, movie) {
                if (err) res.send(err);

                let movieJson = JSON.stringify(movie);
                // return that movie
                res.json(movie);
            });
        }

    });


router.route('/movie/:movieTitle')
    .get(authJwtController.isAuthenticated, function (req, res) {
        let title = req.params.movieTitle;

        console.log(req.query)
        console.log(req.query.reviews);
        console.log(req.query.reviews == 'true')

        if (req.query.reviews == 'true') {
            Movie.aggregate([
                { $match:
                        { title: title }
                },
                {
                    $lookup: {
                        from: 'reviews',
                        localField: 'title',
                        foreignField: 'movieName',
                        as: 'reviews'
                    }
                }

            ], (err, result) => {
                if (err) {

                    res.json({ message: 'Error. Cannot list roles', errror: err });
                }
                res.status(200).jsonp(result);

            });

        }
        else {
            Movie.find({'title' : title}, function(err, movie) {
                if (err) res.send(err);

                let movieJson = JSON.stringify(movie);
                // return that movie
                res.json(movie);
            });
        }

    });


router.route('/movie')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var movieTitle = req.query.title;
        console.log('Movie Title: ' + movieTitle);
        Movie.findOne({title : movieTitle}).exec(function (err, movie) {
                if (err) res.send(err);
                console.log(movie);

                res.json(movie);
            }

        );

    });


router.route('/movies')
    .get(authJwtController.isAuthenticated, function (req, res) {


        Movie.find(function (err, movies) {
            if (err) res.send(err);
            // return the movies

            res.json(movies);
        });
    });


router.route('/movie/:id')
    .put(authJwtController.isAuthenticated, function (req, res) {
    Movie.findById(req.params.id, function(err, movie) {


        movie.title = req.body.title;
        movie.releaseDate = req.body.releaseDate;
        movie.genre = req.body.genre;
        movie.actors = req.body.actors;

        if (movie.actors.length < 3){
            return res.status(500).jsonp({status : 500, message : "Must include at least three actors" });
        }

        movie.save(function(err) {
            if (err) {
                return res.status(500).jsonp({status : 500, message : err.message });
            }
            res.status(200).jsonp(movie);
        });
    });
});

// Reviews

// Create new review
router.route('/reviews')
    .post(authJwtController.isAuthenticated, function(req, res) {

        const usertoken = req.headers.authorization;
        const token = usertoken.split(' ');
        const decodedToken = jwt.verify(token[1], process.env.SECRET_KEY).username;

        var newReview = new Review();

        newReview.movieName = req.body.movieTitle;
        newReview.reviewerName = decodedToken;
        newReview.reviewBody = req.body.reviewBody;
        newReview.reviewScore = req.body.reviewScore;



        newReview.save(function(err, review) {
            if (err) {
                return res.status(500).jsonp({status : 500, message : err.message });
            }
            res.status(200).jsonp(review);
        });
    });


// Get all reviews
router.route('/reviews')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var movieTitle = req.query.title;

        Review.find({}).exec(function (err, reviews) {
            if (err) {
                return res.status(500).jsonp({status : 500, message : err.message });
            }

                res.status(200).jsonp(reviews);
            }

        );

    });

// Get specific review by ID
router.route('/reviews/:reviewID')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.reviewID;
        Review.findById(id, function(err, review) {
            if (err) {
                return res.status(500).jsonp({status : 500, message : err.message });
            }

            //var userJson = JSON.stringify(user);
            // return that user
            res.json(review);
        });
    });

// Delete specific review by ID
router.route('/reviews/:reviewID')
    .delete(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.reviewID;
        Review.findById(id, function(err, review) {
            review.remove(function(err) {
                if (err) {
                    return res.status(500).jsonp({status : 500, message: err.message });
                }
                res.status(200).jsonp({status : 200, message : 'Review deleted.' });
            });
        });
    });

app.use('/', router);
app.listen(process.env.PORT || 8080);
