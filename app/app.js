var request = require('request');
var cheerio = require('cheerio');
var Promise = require('promise');
var Slack = require('slack-node');
var fs = require('fs');

var books;
var properties;

var init = function() {
  getPropertiesFile().then((property) => {
    properties = JSON.parse(property);;

    getBooks();
  });
}

var getPropertiesFile = function() {
  return new Promise(function(res, rej) {
    fs.readFile('./app/properties.json', 'utf8', function(err, data) {
      res(data);
    });
  });
}

var getBooks = function() {
  getBooksFile().then((bookList) => {
    books = JSON.parse(bookList);

    books.forEach((book) => {
      getLatestBook(book).then(function(latestBook) {
        if (book.latestBook === undefined) {
          book.latestBook = latestBook;

          console.log("Saknar bok för " + book.author + " sparar senaste -> " + latestBook);
        } else if (book.latestBook !== latestBook) {
          book.latestBook = latestBook;

          sendSlackNotification(book.author, latestBook);

          console.log("Woohoo!! Ny bok av " + book.author + " -> " + latestBook);
        } else {
          console.log("Inga nyhter för " + book.author);
        }
        
        fs.writeFile('./app/books.json', JSON.stringify(books));
      });
    });
  });
}

var getBooksFile = function() {
  return new Promise(function(res, rej) {
    fs.readFile('./app/books.json', 'utf8', function(err, data) {
      res(data);
    });
  });
}

var getLatestBook = function(book) {
  return new Promise(function(resolve, reject) {
    var url = properties.adlibrisUrl.replace("#####", book.author);
    request(url, function (err, response, body) {
      if (err) {
        console.err("Something went wrong, couldn't parse parseBookInfo.")
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

var sendSlackNotification = function(author, book) {
  var Slack = require('slack-node');
  apiToken = "xoxb-222652636083-SojOYDDSf5GrsD1ykzGAWNoH";            
  slack = new Slack(apiToken);
  slack.api('chat.postMessage', {
    text:'Woohoo!! Ny bok av ' + author + ' -> ' + book,
    channel:'#notifications'
  }, function(err, response){
    // IGNORE
  });
}

init();