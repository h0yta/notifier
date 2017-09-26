var request = require('request');
var cheerio = require('cheerio');
var Promise = require('promise');
var dateFormat = require('dateformat');
var fs = require('fs');

var properties;

var preDbMovies = function() {
  return new Promise(function(resolve, reject) {
    getPropertiesFile().then((property) => {
      properties = JSON.parse(property);
      getMoviesFromPreDB().then(function(movieList) {
        resolve(movieList);
      })
    });
  });
}

var getMoviesFromPreDB = function() {  
  return new Promise(function(resolve, reject) {
    var options = {
      url : properties.predbUrl,
      headers:  {
          'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
      }
    };
    var url = properties.predbUrl;
    request(options, function (err, response, body) {
      if (err) {
        console.err(" Something went wrong, couldn't parse preDB.", response);
      } else {
        var $ = cheerio.load(body);
        var movies = [];
        
        let date = new Date();
        date.setDate(date.getDate() - 1);
        let yesterday = dateFormat(date, 'isoDate');

        $('div.post').filter(function(i, elem) {
          return $(this).find('a.p-title').text().indexOf('BluRay') > -1
            && $(this).find('a.p-title').text().indexOf('720p') > -1
            && $(this).find('a.p-title').text().indexOf('DIRFIX') < 0
            && $(this).find('a.p-title').text().indexOf('SUBBED') < 0
            && $(this).find('a.p-title').text().indexOf('DOCU') < 0
            && $(this).find('span.p-time').attr('title').indexOf(yesterday) > -1;
        }).each(function(i, elem) {          
          var movie = $(this).find('a.p-title').text().trim();
          movies.push(movie);
        });

        resolve(movies);
      }
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

exports.movies = preDbMovies;