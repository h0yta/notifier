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

      let latestBokusBook = await getLatestBookBokus(book);
      addPoints(book, latestBokusBook);
      //console.log(latestBokusBook);

      let libraryBook = await getVrydLibraryBook(latestBokusBook);
      addPoints(book, libraryBook);

      libraryBook = await getJkpgLibraryBook(libraryBook);
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

const getJkpgLibraryBook = function (book) {
  return new Promise(function (resolve, reject) {
    let url = properties.jkpgLibraryUrl.replace("#####", book.title);
    request(url, function (err, response, body) {
      if (err) {
        console.err(" Something went wrong, couldn't parse parseBookInfo.")
      } else {
        let $ = cheerio.load(body);
        let result = $('.work-link')
          .first()
          .html();

        let status = book.status;
        let store = book.store;
        if (result !== null && stringSimilarity.compareTwoStrings(result, book.title) >= 0.8) {
          status = 'Tillgänglig för lån';
          store = 'Jönköpings bibliotek';
        }

        let libBook = {
          'title': book.title,
          'status': status,
          'store': store
        }

        resolve(libBook);
      }
    });
  });
}

const getVrydLibraryBook = function (book) {
  return new Promise(function (resolve, reject) {
    let url = properties.vrydLibraryUrl.replace("#####", book.title);
    var options = {
      url: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
      }
    };
    request(options, function (err, response, body) {
      if (err) {
        console.err(" Something went wrong, couldn't parse parseBookInfo.")
      } else {
        let $ = cheerio.load(body);
        let result = $('.product-list-item-link')
          .children()
          .first()
          .text();

        let status = book.status;
        let store = book.store;
        if (result !== null && stringSimilarity.compareTwoStrings(result, book.title) >= 0.8) {
          status = 'Tillgänglig för lån';
          store = 'Vaggeryds bibliotek';
        }

        let libBook = {
          'title': book.title,
          'status': status,
          'store': store
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
  if (sim > 0.9) {
    return true;
  }

  let sl = storedBook.trim().indexOf(latestBook.trim());
  let ls = latestBook.trim().indexOf(storedBook.trim());
  return (sl === 0 || ls === 0) && sim > 0.5;
}

const addPoints = (stored, bookstore) => {
  bookstore.points = 0;
  if (bookstore.title === null || bookstore.title === undefined || bookstore.title.trim() === '') {
    bookstore.points -= 100;
  } else if (bookstore.title !== stored.latestBookTitle) {
    bookstore.points += 5;
  }

  if (stored.latestBookStatus === 'Tillgänglig för lån') {
    bookstore.points -= 4;
  } else if (stored.latestBookStatus === 'I lager') {
    bookstore.points -= 3;
  } else if (stored.latestBookStatus === 'Förhandsboka') {
    bookstore.points -= 2;
  } else if (stored.latestBookStatus === 'Kommande') {
    bookstore.points -= 1;
  }

  if (bookstore.status === 'Tillgänglig för lån') {
    bookstore.points += 4;
  } else if (bookstore.status === 'I lager') {
    bookstore.points += 3;
  } else if (bookstore.status === 'Förhandsboka') {
    bookstore.points += 2;
  } else if (bookstore.status === 'Kommande') {
    bookstore.points += 1;
  }
}

exports.run = run;