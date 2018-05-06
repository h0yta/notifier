var request = require('request');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var Promise = require('promise');
var slack = require('./slack.js');
var fs = require('fs');

let properties = require('./properties.json');

var run = async function () {
  iconv.skipDecodeWarning = true;

  try {
    let bookList = await getBooksFile();
    let newBookList = await Promise.all(bookList.map(async (book) => {

      let latestAdlibrisBook = await getLatestBookAdlibris(book);
      addPoints(book, latestAdlibrisBook);
      //console.log(latestAdlibrisBook);

      let latestBokusBook = await getLatestBookBokus(book);
      addPoints(book, latestBokusBook);
      //console.log(latestBokusBook);

      let bestMatch = findBestMatch(latestAdlibrisBook, latestBokusBook);
      return processBook(book, bestMatch);
    }));

    fs.writeFileSync(__dirname + '/books.json', JSON.stringify(newBookList, null, 2));
  } catch (error) {
    console.log(error);
  }
}

var getBooksFile = async function () {
  let data = fs.readFileSync(__dirname + '/books.json', 'utf8');
  return JSON.parse(data);
}

var getLatestBookBokus = async function (book) {
  return new Promise(function (resolve, reject) {
    var url = properties.bokusUrl.replace("#####", book.author);
    request({
      'url': url,
      'encoding': null
    }, function (err, response, body) {
      if (err) {
        console.err(" Something went wrong, couldn't parse parseBookInfo.")
      } else {
        let decodedBody = iconv.decode(body, 'windows-1252');

        var $ = cheerio.load(decodedBody);
        let first = $('.ProductList__item')
          .children()
          .first();

        let title = first.find($('.Item__title--large'))
          .text()
          .trim();
        let status = first.find($('.ProductList__status'))
          .text()
          .trim();
        let book = {
          'title': title,
          'status': translateStatus(status),
          'store': 'Bokus'
        }

        resolve(book);
      }
    });
  });
}

var getLatestBookAdlibris = function (book) {
  return new Promise(function (resolve, reject) {
    var url = properties.adlibrisUrl.replace("#####", book.author);
    request(url, function (err, response, body) {
      if (err) {
        console.err(" Something went wrong, couldn't parse parseBookInfo.")
      } else {
        var $ = cheerio.load(body);
        var books = [];
        let first = $('.purchase-and-processing')
          .children()
          .first();

        let title = first.find($('.heading--searchlist-title')).text().trim();
        let status = first.find($('span.processing-time'))
          .clone()
          .children()
          .remove()
          .end()
          .text()
          .trim();

        let book = {
          'title': title,
          'status': translateStatus(status),
          'store': 'Adlibris'
        }

        resolve(book);
      }
    });
  });
}

const translateStatus = (status) => {
  if (status === 'Ännu ej utkommen') {
    return 'Kommande';
  } else if (status.indexOf('Förväntas skickas under') === 0) {
    return 'Förhandsboka';
  } else if (status === 'Tillfälligt slut') {
    return 'Tillfälligt slut';
  } else {
    return 'I lager';
  }
}

const processBook = (storedBook, latestBook) => {
  if (storedBook.latestBookTitle === null || storedBook.latestBookTitle === undefined || storedBook.latestBookTitle === '') {
    storedBook.latestBookTitle = latestBook.title;
    storedBook.latestBookStatus = latestBook.status;
    console.log(" Saknar bok för " + storedBook.author + " sparar senaste -> " + latestBook.title);
  } else if (storedBook.latestBookTitle !== latestBook.title) {
    storedBook.latestBookTitle = latestBook.title;
    storedBook.latestBookStatus = latestBook.status;
    slack.send("Boktips - ny bok '" + latestBook.title + "' av " + storedBook.author
      + " (" + latestBook.status + " - " + latestBook.store + ")");
    console.log(" Boktips - ny bok '" + latestBook.title + "' av " + storedBook.author
      + " (" + latestBook.status + " - " + latestBook.store + ")");
  } else if (storedBook.latestBookStatus !== latestBook.status) {
    storedBook.latestBookTitle = latestBook.title;
    storedBook.latestBookStatus = latestBook.status;
    slack.send("Boktips - ny status för boken '" + latestBook.title + "' av " + storedBook.author
      + " (" + latestBook.status + " - " + latestBook.store + ")");
    console.log(" Boktips - ny status för boken '" + latestBook.title + "' av " + storedBook.author
      + " (" + latestBook.status + " - " + latestBook.store + ")");
  } else {
    console.log(" Inga nyheter för " + storedBook.author);
  }

  return storedBook;
}

const addPoints = (stored, bookstore) => {
  bookstore.points = 0;
  if (bookstore.title !== stored.latestBookTitle) {
    bookstore.points += 5;
  }

  if (stored.latestBookStatus === 'I lager') {
    bookstore.points -= 3;
  } else if (stored.latestBookStatus === 'Förhandsboka') {
    bookstore.points -= 2;
  } else if (stored.latestBookStatus === 'Kommande') {
    bookstore.points -= 1;
  }

  if (bookstore.status === 'I lager') {
    bookstore.points += 3;
  } else if (bookstore.status === 'Förhandsboka') {
    bookstore.points += 2;
  } else if (bookstore.status === 'Kommande') {
    bookstore.points += 1;
  }
}

const findBestMatch = (adlibris, bokus) => {
  if (adlibris.points > bokus.points) {
    return adlibris;
  } else {
    return bokus;
  }
}

exports.run = run;