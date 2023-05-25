const util = require('./ServiceUtil');
const request = require('request');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');
const Promise = require('promise');
const stringSimilarity = require('string-similarity');

const bokusUrlWithLang = 'https://www.bokus.com/cgi-bin/product_search.cgi?language=Svenska&rank_order=print_year_month_desc';
const bokusUrlWithoutLang = 'https://www.bokus.com/cgi-bin/product_search.cgi?rank_order=print_year_month_desc';
const bokusEbookWithLang = "https://www.bokus.com/cgi-bin/product_search.cgi?rank_order=print_year_month_desc&language=Svenska&binding_normalized=ebok"
const properties = require('../../resources/properties.json');

const getLatestBook = async (author) => {
  let url = createUrl(bokusUrlWithLang, author, undefined);
  let book = await getBookFromBokus(url, author, undefined);
  let ebook = await getEbook(author, book.title);

  return mergeBooks(book, ebook);
}

const getLatestStatus = async (author, title) => {
  let url = createUrl(bokusUrlWithoutLang, author, title);
  let book = await getBookFromBokus(url, author, title);
  let ebook = await getEbook(author, title);

  return mergeBooks(book, ebook);
}

const getEbook = async (author, title) => {
  let url = createUrl(bokusEbookWithLang, author, undefined);
  let ebook = await getEBookFromBokus(url, author, undefined);

  if (titlesMatch(title, ebook.title)) {
    return ebook;
  }

  return undefined;
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

          if (matchesAny(foundAuthors, author.name) && matchesPaperBook(foundFormat)) {
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
              '_store': 'Bokus',
              'bokusUrl': util.createBookUrl(url, link),
              'bokusRelease': parseDate(releaseDate)
            }

            return false;
          }
        });

        resolve(book);
        return;

      }
    });
  });
}

const getEBookFromBokus = async function (url, author, title) {
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

          if (matchesAny(foundAuthors, author.name) && matchesEBook(foundFormat)) {
            let foundTitle = $(elm).find($('.Item__title--large'))
              .text()
              .replace(/\(.*\)/gi, '')
              .replace(/:/gi, '')
              .replace(/-/gi, '')
              .replace(/Ebok/gi, '')
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
              '_store': 'Bokus',
              'bokusEbookUrl': util.createBookUrl(url, link),
              'bokusEbookRelease': parseDate(releaseDate)
            }

            return false;
          }
        });

        resolve(book);
        return;

      }
    });
  });
}

const matchesAny = (authorArray, authorName) => {
  return authorArray.length <= properties.maxNumberOfAuthors &&
    authorArray
      .map(author => author.normalize("NFD").replace(/\p{Diacritic}/gu, ""))
      .some(a => {
        return stringSimilarity.compareTwoStrings(authorName, a) >= 0.8
      });
}

const matchesPaperBook = (format) => {
  return format.toUpperCase() === 'INBUNDEN' || format.toUpperCase() === 'KARTONNAGE';
}

const matchesEBook = (format) => {
  return format.toUpperCase() === 'E-BOK';
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
  let result = dateString.split(',').map(ds => {
    let match = ruleRegexp.exec(ds);
    if (match === null) {
      return null;
    } else {
      return match[1].trim();
    }
  }).filter(ds => ds != null);

  if (result.length === 1) {
    return result[0];
  } else {
    console.log('Found no match for', dateString);
    return null;
  }
}

function capitalizeFirstLetter(string) {
  return string.replace(/^./, string[0].toUpperCase());
}

const translateStatus = (status) => {
  if (stringSimilarity.compareTwoStrings(status, 'Skickas inom 1-2 vardagar') > 0.75) {
    return 'TILLGANGLIG_FOR_KOP';
  } else if (stringSimilarity.compareTwoStrings(status, 'Tillfälligt slut') > 0.75) {
    return 'SLUTSALD';
  }
  return 'KOMMANDE';
}


const titlesMatch = (storedBook, latestBook) => {
  if (storedBook == undefined || latestBook == undefined) {
    return false;
  }

  let sim = stringSimilarity.compareTwoStrings(storedBook, latestBook);
  if (sim > 0.9) {
    return true;
  }

  let sl = storedBook.trim().indexOf(latestBook.trim());
  let ls = latestBook.trim().indexOf(storedBook.trim());
  return (sl === 0 || ls === 0) && sim > 0.5;
}

const mergeBooks = (book, ebook) => {
  book.bokusEbookUrl = ebook !== undefined ? ebook.bokusEbookUrl : undefined;
  book.bokusEbookRelease = ebook !== undefined ? ebook.bokusEbookRelease : undefined;
  return book;
}

module.exports.getLatestBook = getLatestBook;
module.exports.getLatestStatus = getLatestStatus;