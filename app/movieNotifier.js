var request = require('request');
var cheerio = require('cheerio');
var Promise = require('promise');
var fs = require('fs');

var imdb = require('./imdb.js');
var slack = require('./slack.js');
var predb = require('./preDB.js');

var properties;
var lastYear = new Date().getFullYear() - 1;

var runMovieNotifier = function() {
  console.log("Startar film notifieraren... ");
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
        imdb.movieInfo(stripReleaseInfo(movie)).then(function(imdbMovie) {
          if (parseFloat(imdbMovie.rating) > 7.0 && parseInt(imdbMovie.year) >= lastYear) {
            slack.send('Filmtips: *' + imdbMovie.name + '* med iMDB betyg: *' + imdbMovie.rating + '*\n' + imdbMovie.url);
            console.log(' Filmtips: ' + imdbMovie.name + ' med iMDB betyg ' + imdbMovie.rating);
            // MOVIE;SFV;oscar@vettig.se;Movie name
            fs.appendFile(properties.requestFile, 'MOVIE;' + movie + '\n');
          }
          res();
        }, function(err) {
          console.log('iMDB rating error', err);
        });
      });
    }, function(err) {
      console.log('PreDB movie error', err);
    });
  });
}

var stripReleaseInfo = function(preName) {
  var myRegexp = /(.\d{4}.)/;
  var match = myRegexp.exec(preName);
  let movieName = preName.substring(0, match['index'] + 5).replace(new RegExp('\\.', 'g'), ' ');
  return movieName;
}

exports.run = runMovieNotifier;