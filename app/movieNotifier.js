var request = require('request');
var cheerio = require('cheerio');
var Promise = require('promise');
var fs = require('fs');

var imdb = require('./imdb.js');
var slack = require('./slack.js');
var predb = require('./preDB.js');

var properties;

var runMovieNotifier = function() {
  console.log("Startar film notifieraren...");
  return new Promise(function(res, rej) {
    getPropertiesFile().then((property) => {
      properties = JSON.parse(property);
        getMovies().then(() => {
        res();
      });
    });
  });
}

var getPropertiesFile = function() {
  return new Promise(function(res, rej) {
    fs.readFile(__dirname+'/properties.json', 'utf8', function(err, data) {
      res(data);
    });
  });
}

var getMovies = function() {
  return new Promise(function(res, rej) {
    predb.movies().then((movieList) => {
      movieList.forEach((movie) => {
        imdb.rating(movie).then(function(rating) {            
          if (parseFloat(rating) > 7.0) {
            slack.send('Filmtips - \'' + movie + '\' med iMDB betyg ' + rating);
            console.log('Filmtips - \'' + movie + '\' med iMDB betyg ' + rating);
            // movie;SFV;oscar@vettig.se;Movie name
            fs.appendFile(properties.requestFile, 'movie;SFV;oscar@vettig.se;' + movie + '\n');
          } else {
            //console.log('Skipping movie: ' + movie + ' with rating ' + rating)
          }
          
          res();
        });
      });
    });
  });
}

exports.run = runMovieNotifier;