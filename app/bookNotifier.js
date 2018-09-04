const request = require('request');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');
const Promise = require('promise');
const dateFormat = require('dateformat');
const stringSimilarity = require('string-similarity');
const slack = require('./slack.js');
const fs = require('fs');

let properties = require('./properties.json');

const run = async function () {
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
      let libraryBook = await getLibraryBook(bestMatch);
      addPoints(book, libraryBook);

      return processBook(book, libraryBook);
    }));

    fs.writeFileSync(__dirname + '/books.json', JSON.stringify(newBookList, null, 2));
  } catch (error) {
    console.log(error);
  }
}

const getBooksFile = async function () {
  let data = fs.readFileSync(__dirname + '/books.json', 'utf8');
  return JSON.parse(data);
}

const getLatestBookBokus = async function (book) {
  return new Promise(function (resolve, reject) {
    let url = properties.bokusUrl.replace("#####", book.author);
    request({
      'url': url,
      'encoding': null
    }, function (err, response, body) {
      if (err) {
        console.err(" Something went wrong, couldn't parse parseBookInfo.")
      } else {
        let decodedBody = iconv.decode(body, 'windows-1252');

        let $ = cheerio.load(decodedBody);
        let first = $('.ProductList__item')
          .children()
          .first();

        let title = first.find($('.Item__title--large'))
          .text()
          .trim();
        let status = first.find($('.ProductList__status'))
          .text()
          .trim();

        //console.log('Bokus status: ', status);

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

const getLatestBookAdlibris = function (book) {
  return new Promise(function (resolve, reject) {
    let url = properties.adlibrisUrl.replace("#####", book.author);
    request(url, function (err, response, body) {
      if (err) {
        console.err(" Something went wrong, couldn't parse parseBookInfo.")
      } else {
        let $ = cheerio.load(body);
        let books = [];
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

        //console.log('Adlibris status: ', status);

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

const getLibraryBook = function (book) {
  return new Promise(function (resolve, reject) {
    let url = properties.libraryUrl.replace("#####", book.title);
    request(url, function (err, response, body) {
      if (err) {
        console.err(" Something went wrong, couldn't parse parseBookInfo.")
      } else {
        let $ = cheerio.load(body);
        let result = $('.result-count')
          .first()
          .text();

        let status = book.status;
        if (parseInt(result) >= 1) {
          status = 'Tillgänglig på biblioteket';
        }

        let libBook = {
          'title': book.title,
          'status': status,
          'store': book.store
        }

        resolve(libBook);
      }
    });
  });
}

const translateStatus = (status) => {
  if (stringSimilarity.compareTwoStrings(status, 'Ännu ej utkommen') > 0.95) {
    return 'Kommande';
  } else if (stringSimilarity.compareTwoStrings(status, 'Förväntas skickas under') >= 0.8
    || stringSimilarity.compareTwoStrings(status, 'Förboka gärna! Förväntad leverans under vecka') >= 0.8) {
    return 'Förhandsboka';
  } else if (stringSimilarity.compareTwoStrings(status, 'Tillfälligt slut') > 0.95) {
    return 'Tillfälligt slut';
  } else {
    return 'I lager';
  }
}

const processBook = (storedBook, latestBook) => {
  if (latestBook.title === null || latestBook.title === undefined || latestBook.title.trim() === '') {
    console.log(" " + dateFormat(new Date(), 'yyyy-mm-dd') + " - FEL! Kunde inte hitta nån bok alls för " + storedBook.author);
    slack.send("FEL! Kunde inte hitta nån bok alls för " + storedBook.author);
  } else if (storedBook.latestBookTitle === null || storedBook.latestBookTitle === undefined || storedBook.latestBookTitle === '') {
    storedBook.latestBookTitle = latestBook.title;
    storedBook.latestBookStatus = latestBook.status;
    console.log(" " + dateFormat(new Date(), 'yyyy-mm-dd') + " - Saknar bok för " + storedBook.author + " sparar senaste -> " + latestBook.title);
  } else if (!titleMatch(storedBook.latestBookTitle, latestBook.title)) {
    storedBook.latestBookTitle = latestBook.title;
    storedBook.latestBookStatus = latestBook.status;
    slack.send("Ny bok '" + latestBook.title + "' av " + storedBook.author
      + " (" + latestBook.status + ")");
    console.log(" " + dateFormat(new Date(), 'yyyy-mm-dd') + " - Ny bok '" + latestBook.title + "' av " + storedBook.author
      + " (" + latestBook.status + " hos " + latestBook.store + ")");
  } else if (storedBook.latestBookStatus !== latestBook.status) {
    storedBook.latestBookTitle = latestBook.title;
    storedBook.latestBookStatus = latestBook.status;
    slack.send("Ny status för boken '" + latestBook.title + "' av " + storedBook.author
      + " (" + latestBook.status + ")");
    console.log(" " + dateFormat(new Date(), 'yyyy-mm-dd') + " - Ny status för boken '" + latestBook.title + "' av " + storedBook.author
      + " (" + latestBook.status + " hos " + latestBook.store + ")");
  }

  return storedBook;
}

const titleMatch = (storedBook, latestBook) => {
  let sim = stringSimilarity.compareTwoStrings(storedBook, latestBook);
  return sim > 0.9;
}

const addPoints = (stored, bookstore) => {
  bookstore.points = 0;
  if (bookstore.title !== stored.latestBookTitle) {
    bookstore.points += 5;
  }

  if (stored.latestBookStatus === 'Tillgänglig på biblioteket') {
    bookstore.points -= 4;
  } else if (stored.latestBookStatus === 'I lager') {
    bookstore.points -= 3;
  } else if (stored.latestBookStatus === 'Förhandsboka') {
    bookstore.points -= 2;
  } else if (stored.latestBookStatus === 'Kommande') {
    bookstore.points -= 1;
  }

  if (bookstore.status === 'Tillgänglig på biblioteket') {
    bookstore.points += 4;
  } else if (bookstore.status === 'I lager') {
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