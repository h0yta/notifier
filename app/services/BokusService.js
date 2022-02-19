const util = require('./ServiceUtil');
const request = require('request');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');
const Promise = require('promise');
const stringSimilarity = require('string-similarity');

const bokusUrlWithLang = 'https://www.bokus.com/cgi-bin/product_search.cgi?language=Svenska&rank_order=print_year_month_desc';
const bokusUrlWithoutLang = 'https://www.bokus.com/cgi-bin/product_search.cgi?rank_order=print_year_month_desc';

const getLatestBook = async function (author) {
  let url = createUrl(bokusUrlWithLang, author, undefined);
  return await getBookFromBokus(url, author, undefined);
}

const getLatestStatus = async function (author, title) {
  let url = createUrl(bokusUrlWithoutLang, author, title);
  return await getBookFromBokus(url, author, title);
}

const createUrl = (baseUrl, author, title) => {
  let url = baseUrl;

  if (title != undefined && author.name != undefined) {
    url = url + '&search_word=' + encodeToWin(author.name) + ' ' + encodeToWin(title);
  } else if (title != undefined && author.keyword != undefined) {
    url = url + '&search_word=' + encodeToWin(author.keyword) + ' ' + encodeToWin(title);
  } else if (author.keyword != undefined) {
    url = url + '&search_word=' + encodeToWin(author.keyword);
  } else if (author.name != undefined) {
    url = url + '&authors=' + encodeToWin(author.name);
  }

  return url;
}

const encodeToWin = (text) => {
  return text.toLowerCase()
    .replace(/å/g, '%E5')
    .replace(/ä/g, '%E4')
    .replace(/ö/g, '%F6');
}

const getBookFromBokus = async function (url, author, title) {
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

          if (matchesAny(foundAuthors, author.name) && matchesFormats(foundFormat)) {
            let foundTitle = $(elm).find($('.Item__title--large'))
              .text()
              .replace(/\(.*\)/gi, '')
              .replace(/:/gi, '')
              .replace(/-/gi, '')
              .trim();

            let link = $(elm).find($('.Item__title--large a'))
              .attr('href');

            let status = $(elm).find($('.ProductList__status'))
              .text()
              .trim();

            let releaseDate = $(elm).find($('.Item__edition'))
              .text()
              .trim();

            book = {
              'title': translateTitle(foundTitle, author),
              'status': translateStatus(status),
              'store': 'Bokus',
              'link': util.createBookUrl(url, link),
              'release': parseDate(releaseDate)
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

const matchesAny = (authorArray, authorName) => {
  return authorArray.filter(a => stringSimilarity.compareTwoStrings(authorName, a) >= 0.8).length > 0;
}

const matchesFormats = (format) => {
  return format.toUpperCase() === 'INBUNDEN' || format.toUpperCase() === 'KARTONNAGE';
}

const translateTitle = (title, author) => {
  if (author.excludeKeyword) {
    return capitalizeFirstLetter(title.toLowerCase().replace(author.keyword.toLowerCase(), "").trim());
  }

  return title;
}

const parseDate = (dateString) => {
  // 2021-07-26
  let ruleRegexp = /^.*(\d\d\d\d-\d\d-\d\d)/;
  let match = ruleRegexp.exec(dateString);
  if (match === null) {
    console.log('Found no match for', dateString);
  } else {
    return match[1].trim();
  }
}

function capitalizeFirstLetter(string) {
  return string.replace(/^./, string[0].toUpperCase());
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