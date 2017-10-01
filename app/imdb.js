var request = require('request');
var cheerio = require('cheerio');
var Promise = require('promise');
var fs = require('fs');

var IMDB_SEARCH_URL = 'http://www.imdb.com/find?ref_=nv_sr_fn&q=####&s=all';

var getMovieInfo = function(movieName) {
  return new Promise(function(resolve, reject) {
    getIMDBUrl(movieName).then(function(url) {
      if (url !== undefined) {
        getMovieFromUrl(url).then(function(movie) {
          resolve(movie);
        });
      }
    });
  });
}

var getMovieFromUrl = function(imdbUrl) {
  return new Promise(function(resolve, reject) {
    var options = {
      url : imdbUrl,
      headers:  {
          'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
      }
    };
    
    request(options, function(error, response, html){
      if (error) {
        console.log(" Something went wrong, couldn't parse iMDB.", error);
      } else {
        let movie = {};
        var $ = cheerio.load(html);
        movie.url = imdbUrl;
        movie.name = $('h1[itemprop=\'name\']').text();
        movie.year = $('span#titleYear a').text();
        movie.name = movie.name.replace('('+movie.year+')', '').trim();
        movie.rating = $('div.ratingValue span[itemprop=\'ratingValue\']').text();
        resolve(movie);
      }
    });
  });
}

var getIMDBUrl = function(movieName) {
  return new Promise(function(resolve, reject) {
    var options = {
      url : IMDB_SEARCH_URL.replace("####", movieName),
      headers:  {
          'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
      }
    };

    request(options, function(error, response, html){
      if (error) {
        console.log(" Something went wrong, couldn't parse iMDB.", error);
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

exports.movieInfo = getMovieInfo;