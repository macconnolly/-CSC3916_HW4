const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt');
const User = require('./Users');
const Movie = require('./Movies');
const Review = require('./Reviews');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const rp = require('request-promise');
const cors = require('cors');


const app = express();
const router = express.Router();
const mongoose = require('mongoose');


const client = { MongoClient } = require('mongodb');
const dbName = 'movies-assignment-3';

const GA_TRACKING_ID = process.env.GA_KEY;

module.exports = app; // for testing

app.all('*', function(req, res, next) {
     let origin = req.get('origin');
     res.header('Access-Control-Allow-Origin', origin);
     res.header("Access-Control-Allow-Headers", "X-Requested-With");
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     next();
});


app.use(passport.initialize(), cors(), bodyParser.json());

function trackDimension(category, action, label, value, dimension, metric) {

    var options = { method: 'GET',
        url: 'https://www.google-analytics.com/collect',
        qs:
            {   // API Version.
                v: '1',
                // Tracking ID / Property ID.
                tid: GA_TRACKING_ID,
                // Random Client Identifier. Ideally, this should be a UUID that
                // is associated with particular user, device, or browser instance.
                cid: crypto.randomBytes(16).toString("hex"),
                // Event hit type.
                t: 'event',
                // Event category.
                ec: category,
                // Event action.
                ea: action,
                // Event label.
                el: label,
                // Event value.
                ev: value,
                // Custom Dimension
                cd1: dimension,
                // Custom Metric
                cm1: metric,
                cd3: dimension,
                cm3: metric

            },
        headers:
            {  'Cache-Control': 'no-cache' } };

    return rp(options);
};

router.route('/ATriggerVerify.txt')
    .get(function (req, res) {
        // Event value must be numeric.
        console.log(express.static(__dirname + '/ATriggerverify.txt'))
        res.sendfile('./ATriggerVerify.txt');
       // res.sendfile('./ATriggerVerify.txt', {root: express.static(__dirname + '/ATriggerverify.txt')});
    });
router.route('/test')
    .get(function (req, res) {
        // Event value must be numeric.
        trackDimension('Feedback', 'Rating', 'Feedback for Movie', '3', 'MOVIE NAME', '1')
            .then(function (response) {
                console.log(JSON.stringify(response.body));
                res.status(200).send('Event tracked.').end();
            })
    });

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
    console.log('Request Body: ');
    console.log(req.body);
    //console.log(req);

    if (!req.body.email || !req.body.password) {
        res.json({success: false, message: 'Please pass username and password.'});
    }
    else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.name;
        user.email = req.body.email;
        user.password = req.body.password;
        // save the user
        console.log(user);

        user.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists. '});
                else
                    return res.send(err);
            }

            res.json({success: true, message: 'Successfully created new user.'});
        });
    }
});

router.post('/signin', function(req, res) {
    var userNew = new User();
    userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {

        console.log('User login: ' + JSON.stringify(user));
        console.log('New User: ' + JSON.stringify(userNew));

        user.comparePassword(userNew.password, function(isMatch){
            if (isMatch) {

                var userToken = {id: user._id, username: user.username};

                var token = jwt.sign(userToken, process.env.SECRET_KEY, );
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                res.json({success: true, token: 'JWT ' + token});
            }
            else {
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
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
        movieNew.imageUrl = req.body.imageUrl;

        if (movieNew.actors.length < 3){
            return res.status(500).jsonp({status : 500, message : "Must include at least three actors" });
        }


    movieNew.save(function(err, movie) {
        if (err) {
            return res.status(500).jsonp({status : 500, message : err.message });
        }
        return res.status(200).jsonp({status : 200, message : 'Successfully created new movie', success: true });
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


router.route('/movies')
    .get(authJwtController.isAuthenticated, function (req, res) {


        if (req.query.reviews === 'true') {
        const dbName = 'movies-assignment-3';
        client.connect(process.env.DB, function (err, client) {
            if (err) {
                throw err;
            }
            let collection = client.db(dbName).collection('movies');
            collection.aggregate([

                {
                    $lookup: {
                        from: 'reviews',
                        localField: 'title',
                        foreignField: 'movieName',
                        as: 'reviews'
                    }
                },
                {
                    "$addFields": {
                        "avgRating": {
                            "$divide": [
                                { // expression returns total
                                    "$reduce": {
                                        "input": "$reviews",
                                        "initialValue": 0,
                                        "in": { "$add": ["$$value", "$$this.reviewScore"] }
                                    }
                                },
                                { // expression returns ratings count
                                    "$cond": [
                                        { "$ne": [ { "$size": "$reviews" }, 0 ] },
                                        { "$size": "$reviews" },
                                        1
                                    ]
                                }
                            ]
                        }
                    }
                },
                { "$sort": { "avgRating": -1 } }
            ]).toArray(function (err, documents) {
                if (err) {
                    res.json({message: 'Error. Cannot list roles', error: err});
                }
                res.status(200).jsonp(documents);
                client.close()
            })
        })}
        else{
            Movie.find({}, function(err, movie) {
                if (err) res.send(err);
                console.log('finding movies not in match')
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

                console.log('Movie ' + movie);
                if (movie == null) {
                    res.status(400);
                    res.send('No movie found');
                }
                else{
                    res.status(200).jsonp(movie);
                }

            }

        );

    });


// router.route('/movies')
//     .get(function (req, res) {
//         console.log('finding movies');
//         Movie.find(function (err, movies) {
//             if (err) res.send(err);
//             // return the movies
//             console.log(JSON.stringify(movies));
//             res.json(movies);
//         });
//     });
//
//
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
    .post(function (req, res) {
        // Event value must be numeric.
        const usertoken = req.headers.authorization;
        const token = usertoken.split(' ');
        const decodedToken = jwt.verify(token[1], process.env.SECRET_KEY).username;


        var newReview = new Review();

        newReview.movieName = req.body.movieTitle;
        newReview.reviewerName = decodedToken;
        newReview.reviewBody = req.body.reviewBody;
        newReview.reviewScore = req.body.reviewScore;


        console.log(JSON.stringify(newReview.movieName));

        Movie.findOne({"title": newReview.movieName}, function (err, movie) {



            if(movie == null){
                console.log(movie)
                console.log('null movie')
                res.status(400);
                res.send('Movie for this review does not exist').end();
            }
            else{

                trackDimension(movie.genre, '/reviews', 'APIRequestforMovieReview', newReview.reviewScore.toString(), newReview.movieName, '1')
                    .then(function (response) {
                        newReview.save(function (err, review) {
                            if (err) {
                                return res.status(500).jsonp({status: 500, message: err.message});
                            }
                            res.status(200).jsonp(review).end();


                        });


                    });
               }

            })
    });

router.route('/reviews')
    .put(function (req, res) {

        let newMovieTitle = '';
        Movie.aggregate([
            { $match:
                    { _id: mongoose.Types.ObjectId(req.body.movieID) }
            }

        ], (err, result) => {
            if (err) {

                res.json({ message: 'Error. Cannot list roles', errror: err });
            }

            newMovieTitle = result[0].title;
            console.log('found movie: '+ newMovieTitle);
            console.log('result: ' + JSON.stringify(result));
            //res.status(200).jsonp(result);




            const usertoken = req.headers.authorization;
            console.log('header auth: ')
            console.log(req.headers.authorization);
            const token = usertoken.split(' ');
            console.log('token ' + token[1]);
            const decodedToken = jwt.verify(token[1], process.env.SECRET_KEY).username;


            var newReview = new Review();
            newReview.movieName = newMovieTitle;
            newReview.reviewerName = decodedToken;
            newReview.reviewBody = req.body.reviewBody;
            newReview.reviewScore = req.body.reviewScore;


            console.log(JSON.stringify(newReview.movieName));

            Movie.findOne({"title": newMovieTitle}, function (err, movie) {



                if(movie == null){
                    console.log(movie)
                    console.log('null movie')
                    res.status(400);
                    res.send('Movie for this review does not exist').end();
                }
                else{

                    trackDimension(movie.genre, '/reviews', 'APIRequestforMovieReview', newReview.reviewScore.toString(), newReview.movieName, '1')
                        .then(function (response) {
                            newReview.save(function (err, review) {
                                if (err) {
                                    return res.status(500).jsonp({status: 500, message: err.message});
                                }
                                res.status(200).jsonp(review).end();


                            });


                        });
                }

            })

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
