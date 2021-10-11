const util = require('./ServiceUtil');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');

const vrydUrl = 'https://vaggeryd.elib.se/Books/FreeTextSearch?searchInput=#####&bookType=e-book';

const getLibraryBook = async (author, book) => {
  let url = vrydUrl.replace("#####", book);

  const browser = await puppeteer.launch();
  return browser.newPage().then((page) => {
    return page.goto(url).then(() => {
      return page.content();
    });
  }).then((html) => {
    let $ = cheerio.load(html);
    let resultTitle = $('.product-list-item-link')
      .children()
      .first()
      .text()
      // result may be null here, moves this inside null-check and make a static function.
      .replace(/\(.*\)/gi, '')
      .replace(/:.*/gi, '')
      .trim();

    let resultAuthor = $('.product-list-author')
      .children()
      .first()
      .text()
      .replace(/[\s]{2,}/gi, '')
      .replace(/och/g, ',')
      .split(',')
      .map(t => t.trim());

    let resultLink = $('.product-list-item-link')
      .first()
      .attr('href');

    let status = 'EJ_TILLGANGLIG_FOR_LAN';
    let store = 'Vaggeryds bibliotek';
    if (authorMatches(resultAuthor, author) && titleMatches(resultTitle, book)) {
      status = 'TILLGANGLIG_FOR_LAN';
    }

    let libBook = {
      'title': book,
      'status': status,
      'store': store,
      'link': util.createBookUrl(url, resultLink)
    }

    return libBook;
  }).catch((err) => {
    console.log(' Error in getLibraryBook in VrydService', err);
  }).finally(async () => {
    await browser.close();
  });

}

const authorMatches = (resultAuthors, author) => {
  return resultAuthors.filter(a => {
    return stringSimilarity.compareTwoStrings(a, author) >= 0.8;
  }).length > 0;
}

const titleMatches = (resultTitle, book) => {
  return resultTitle !== null && stringSimilarity.compareTwoStrings(resultTitle, book) >= 0.8;
}

module.exports.getLibraryBook = getLibraryBook;