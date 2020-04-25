const util = require('./ServiceUtil');
const request = require('request');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');
const Promise = require('promise');
const stringSimilarity = require('string-similarity');
let properties = require('../../resources/properties.json');

const getLatestBook = async function (author) {
  return await getBookFromBokus(author, undefined);
}

const getLatestStatus = async function (author, book) {
  return await getBookFromBokus(author, book);
}

const getBookFromBokus = async function (author, title) {
  return new Promise(function (resolve, reject) {
    let url = properties.bokusUrl;

    if (author != undefined) {
      url = url + '&authors=' + author;
    }

    if (title != undefined) {
      url = url + '&search_word=' + title;
    }

    request({
      'url': url,
      'encoding': null
    }, function (err, response, body) {
      if (err) {
        console.log(' Error in getLatestBookBokus', err);
        reject(err);
      } else {
        let book = {
          'title': title,
          'store': 'Bokus'
        };

        iconv.skipDecodeWarning = true;
        let decodedBody = iconv.decode(body, 'windows-1252');

        let $ = cheerio.load(decodedBody);
        $('.ProductList__item').each((i, elm) => {

          let foundAuthors = $(elm).find($('.ProductList__authors'))
            .text()
            .replace(/\(.*\)/gi, '')
            .replace(/:.*/gi, '')
            .replace("av", "")
            .trim()
            .split(' Och ')
            .join(',')
            .split(',');

          if (matchesAny(foundAuthors, author)) {
            let foundTitle = $(elm).find($('.Item__title--large'))
              .text()
              .replace(/\(.*\)/gi, '')
              .replace(/:.*/gi, '')
              .trim();

            let link = $(elm).find($('.Item__title--large a'))
              .attr('href');

            let status = $(elm).find($('.ProductList__status'))
              .text()
              .trim();

            //console.log('Bokus status: ', status);

            book = {
              'title': foundTitle,
              'status': translateStatus(status),
              'store': 'Bokus',
              'link': util.createBookUrl(url, link)
            }

            return false;
          };
        });

        resolve(book);
        return;

      }
    });
  });
}

const matchesAny = (authorArray, author) => {
  return authorArray.filter(a => stringSimilarity.compareTwoStrings(author, a) >= 0.8).length > 0;
}

const translateStatus = (status) => {
  if (stringSimilarity.compareTwoStrings(status, 'Ännu ej utkommen') > 0.95) {
    return 'KOMMANDE';
  } else if (stringSimilarity.compareTwoStrings(status, 'Förväntas skickas under') >= 0.8
    || stringSimilarity.compareTwoStrings(status, 'Förboka gärna! Förväntad leverans under vecka') >= 0.8) {
    return 'KOMMANDE';
  } else if (stringSimilarity.compareTwoStrings(status, 'Tillfälligt slut') > 0.95) {
    return 'SLUTSALD';
  } else {
    return 'TILLGANGLIG_FOR_KOP';
  }
}

module.exports.getLatestBook = getLatestBook;
module.exports.getLatestStatus = getLatestStatus;