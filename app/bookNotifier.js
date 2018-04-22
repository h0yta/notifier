var request = require('request');
var cheerio = require('cheerio');
var Promise = require('promise');
var slack = require('./slack.js');
var fs = require('fs');

let properties = require('./properties.json');

var run = function () {
  getBooksFile().then((bookList) => {
    bookList.forEach((book) => {
      getLatestBook(book).then(function (latestBook) {
        if (book.latestBookTitle === null || book.latestBookTitle === undefined || book.latestBookTitle === '') {
          book.latestBookTitle = latestBook.title;
          book.latestBookStatus = latestBook.status;
          console.log(" Saknar bok för " + book.author + " sparar senaste -> " + latestBook.title);
        } else if (book.latestBookTitle !== latestBook.title) {
          book.latestBookTitle = latestBook.title;
          book.latestBookStatus = latestBook.status;
          slack.send("Boktips - ny bok '" + latestBook.title + "' av " + book.author + " (" + latestBook.status + ")");
          console.log(" Boktips - ny bok '" + latestBook.title + "' av " + book.author + " (" + latestBook.status + ")");
        } else if (book.latestBookStatus !== latestBook.status) {
          book.latestBookTitle = latestBook.title;
          book.latestBookStatus = latestBook.status;
          slack.send("Boktips - ny status för boken '" + latestBook.title + "' av " + book.author + " (" + latestBook.status + ")");
          console.log(" Boktips - ny status för boken '" + latestBook.title + "' av " + book.author + " (" + latestBook.status + ")");
        } else {
          console.log(" Inga nyheter för " + book.author);
        }

        fs.writeFileSync(__dirname + '/books.json', JSON.stringify(bookList, null, 2));
      }).catch((error) => {
        slack.send("Help me I crashed trying to find the latest book.");
        console.error(error);
      });
    });
  }).catch((error) => {
    slack.send("Help me I crashed trying to read the book file.");
    console.error(error);
  });
}

var getBooksFile = function () {
  return new Promise(function (res, rej) {
    fs.readFile(__dirname + '/books.json', 'utf8', function (err, data) {
      try {
        res(JSON.parse(data));
      } catch (error) {
        rej(error);
      }
    });
  });
}

var getLatestBook = function (book) {
  return new Promise(function (resolve, reject) {
    var url = properties.adlibrisUrl.replace("#####", book.author);
    request(url, function (err, response, body) {
      if (err) {
        console.err(" Something went wrong, couldn't parse parseBookInfo.");
        rej(err);
      } else {
        var $ = cheerio.load(body);
        var books = [];
        let first = $('.purchase-and-processing').children().first();

        let title = first.find($('.heading--searchlist-title')).text().trim();
        let status = first.find($('.processing-time')).children().first().text().trim();

        let book = {
          'title': title,
          'status': translateStatus(status)
        }

        resolve(book);
      }
    });
  });
}

const translateStatus = (status) => {
  if (status === 'Ännu ej utkommen') {
    return 'Kommande';
  } else {
    return 'I lager';
  }
}

exports.run = run;