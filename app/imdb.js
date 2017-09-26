var request = require('request');
var cheerio = require('cheerio');
var Promise = require('promise');
var fs = require('fs');

var properties;

var imdbRating = function(movieName) {
  return new Promise(function(resolve, reject) {
    getPropertiesFile().then((property) => {
      properties = JSON.parse(property);
      getIMDBUrl(movieName).then(function(imdbUrl) {
        getRating(imdbUrl).then(function(rating) {
          resolve(rating);
        });
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

var getRating = function(imdbUrl) {
  return new Promise(function(resolve, reject) {
    var options = {
      url : imdbUrl,
      headers:  {
          'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
      }
    };
    
    request(options, function(error, response, html){
      if (error) {
        console.err(" Something went wrong, couldn't parse iMDB.", response);
      } else {
        var $ = cheerio.load(html);
        resolve($('div.ratingValue').text().trim().split('/')[0]);
      }
    });
  });
}

var getIMDBUrl = function(movieName) {
  return new Promise(function(resolve, reject) {
    var options = {
      url : properties.imdbSearchUrl.replace("####", movieName),
      headers:  {
          'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
      }
    };
    
    request(options, function(error, response, html){
      if (error) {
        console.err(" Something went wrong, couldn't parse iMDB.", response);
      } else {
        var $ = cheerio.load(html);
        let results = [];
        $('td.result_text').each(function(i, elem) {
          var result = $(this).find('a').attr('href').trim();
          results.push('http://imdb.com' + result);
        });

        resolve(results[0]);
      }
    });
  });
}

exports.rating = imdbRating;