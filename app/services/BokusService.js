const util = require('./ServiceUtil');
const request = require('request');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');
const Promise = require('promise');
const stringSimilarity = require('string-similarity');
let properties = require('../../resources/properties.json');

const getLatestBook = async function (author, keyword) {
  let url = createUrl(properties.bokusUrl, author, keyword, undefined);
  return await getBookFromBokus(url, author, keyword, undefined);
}

const getLatestStatus = async function (author, keyword, book) {
  let url = createUrl(properties.bokusUrl, author, keyword, book);
  return await getBookFromBokus(url, author, keyword, book);
}

const createUrl = (baseUrl, author, keyword, title) => {
  let url = baseUrl;

  if (title != undefined && author != undefined) {
    url = url + '&search_word=' + author + ' ' + title;
  } if (title != undefined && keyword != undefined) {
    url = url + '&search_word=' + keyword + ' ' + title;
  } else if (keyword != undefined) {
    url = url + '&search_word=' + keyword;
  } else if (author != undefined) {
    url = url + '&authors=' + author;
  }

  return url;
}

const getBookFromBokus = async function (url, author, keyword, title) {
  return new Promise(function (resolve, reject) {
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

          let foundFormat = $(elm).find($('.Item__format'))
            .text();

          if (matchesAny(foundAuthors, author) && matchesFormats(foundFormat)) {
            let foundTitle = $(elm).find($('.Item__title--large'))
              .text()
              .replace(/\(.*\)/gi, '')
              .replace(/:.*/gi, '')
              .replace(/-.*/gi, '')
              .trim();

            let link = $(elm).find($('.Item__title--large a'))
              .attr('href');

            let status = $(elm).find($('.ProductList__status'))
              .text()
              .trim();

            console.log('Bokus title: ', foundTitle);

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

const matchesFormats = (format) => {
  return format.toUpperCase() === 'INBUNDEN' || format.toUpperCase() === 'KARTONNAGE';
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