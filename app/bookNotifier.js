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
    bookList.forEach(async (book) => {
      let latestBook = await getLatestBookAdlibris(book);
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
    });
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
    request(url, function (err, response, body) {
      if (err) {
        console.err(" Something went wrong, couldn't parse parseBookInfo.")
      } else {
        var $ = cheerio.load(iconv.decode(body, 'iso-8859-1'));
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
          'status': translateStatus(status)
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
  } else if (status.indexOf('Förväntas skickas under') === 0) {
    return 'Förhandsboka';
  } else {
    return 'I lager';
  }
}

exports.run = run;