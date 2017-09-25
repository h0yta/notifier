var request = require('request');
var cheerio = require('cheerio');
var Promise = require('promise');
var slack = require('./slack.js');
var fs = require('fs');

var runBookNotifier = function() {
  console.log("Startar bok notifieraren...");
  return new Promise(function(res, rej) {
    getPropertiesFile().then((property) => {
      properties = JSON.parse(property);
      getBooks().then(() => {
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

var getBooks = function() {
  return new Promise(function(res, rej) {
    getBooksFile().then((bookList) => {
      books = JSON.parse(bookList);
      books.forEach((book) => {
        getLatestBook(book).then(function(latestBook) {
          if (book.latestBook === null || book.latestBook === undefined || book.latestBook === '') {
            book.latestBook = latestBook;
            console.log(" Saknar bok för " + book.author + " sparar senaste -> " + latestBook);
          } else if (book.latestBook !== latestBook) {
            book.latestBook = latestBook;
            slack.send('Boktips - ny bok av ' + book.author + ' -> ' + latestBook);
            console.log(" Boktips - ny bok av " + book.author + " -> " + latestBook);
          } else {
            console.log(" Inga nyheter för " + book.author);
          }
          
          fs.writeFile(__dirname+'/books.json', JSON.stringify(books));
          res();
        });
      });
    });
  });
}

var getBooksFile = function() {
  return new Promise(function(res, rej) {
    fs.readFile(__dirname + '/books.json', 'utf8', function(err, data) {
      res(data);
    });
  });
}

var getLatestBook = function(book) {
  return new Promise(function(resolve, reject) {
    var url = properties.adlibrisUrl.replace("#####", book.author);
    request(url, function (err, response, body) {
      if (err) {
        console.err(" Something went wrong, couldn't parse parseBookInfo.")
      } else {
        var $ = cheerio.load(body);
        var books = [];
        $('.heading--searchlist-title').each(function(i, elem) {
          var book = $(this).text().trim();
          books[i] = book;
        });
        
        resolve(books[0]);
      }
    });
  });
}

exports.run = runBookNotifier;