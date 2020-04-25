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

const getBookFromBokus = async function (author, book) {
  return new Promise(function (resolve, reject) {
    let url = properties.bokusUrl.replace("#####", util.concatAuthorAndBook(author, book));
    request({
      'url': url,
      'encoding': null
    }, function (err, response, body) {
      if (err) {
        console.log(' Error in getLatestBookBokus', err);
        reject(err);
      } else {
        iconv.skipDecodeWarning = true;
        let decodedBody = iconv.decode(body, 'windows-1252');

        let $ = cheerio.load(decodedBody);
        let first = $('.ProductList__item')
          .children()
          .first();

        let title = first.find($('.Item__title--large'))
          .text()
          .replace(/\(.*\)/gi, '')
          .replace(/:.*/gi, '')
          .trim();

        let link = first.find($('.Item__title--large a'))
          .attr('href');

        let status = first.find($('.ProductList__status'))
          .text()
          .trim();

        //console.log('Bokus status: ', status);

        let book = {
          'title': title,
          'status': translateStatus(status),
          'store': 'Bokus',
          'link': util.createBookUrl(url, link)
        }

        resolve(book);
      }
    });
  });
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