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
        imdb.rating(stripReleaseInfo(movie)).then(function(rating) {            
          if (parseFloat(rating) > 7.0) {
            slack.send('Filmtips - \'' + stripReleaseInfo(movie) + '\' med iMDB betyg ' + rating);
            console.log('Filmtips - \'' + stripReleaseInfo(movie) + '\' med iMDB betyg ' + rating);
            // movie;SFV;oscar@vettig.se;Movie name
            fs.appendFile(properties.requestFile, 'MOVIE;' + movie + '\n');
          }
          
          res();
        });
      });
    });
  });
}

var stripReleaseInfo = function(preName) {
  var myRegexp = /(.\d{4}.)/;
  var match = myRegexp.exec(preName);
  let movieName = preName.substring(0, match['index']).replace(new RegExp('\\.', 'g'), ' ');
  return movieName;
}

exports.run = runMovieNotifier;