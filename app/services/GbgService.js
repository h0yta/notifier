const util = require('./ServiceUtil');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');
let properties = require('../../resources/properties.json');

const getLibraryBook = async (author, book) => {
  let url = properties.gbgLibraryUrl.replace("#####", util.concatAuthorAndBook(author, book));

  return puppeteer
    .launch()
    .then(function (browser) {
      return browser.newPage();
    }).then(function (page) {
      return page.goto(url).then(function () {
        return page.content();
      });
    }).then(function (html) {
      let $ = cheerio.load(html);
      let result = $('.title-name')
        .children()
        .first()
        .text()
        // result may be null here, moves this inside null-check and make a static function.
        .replace(/\(.*\)/gi, '')
        .replace(/:.*/gi, '')
        .trim();

      let link = $('.title-name a')
        .attr('href');

      let status = 'EJ_TIILGANGLIG_FOR_LAN';
      let store = 'Göteborgs bibliotek';
      if (result !== null && stringSimilarity.compareTwoStrings(result, book) >= 0.8) {
        status = 'TILLGANGLIG_FOR_LAN';
      }

      let libBook = {
        'title': book,
        'status': status,
        'store': store,
        'link': util.createBookUrl(url, link)
      }

      return libBook;
    }).catch(function (err) {
      console.log(' Error in getLibraryBook in GbgService', err);
    });

}

module.exports.getLibraryBook = getLibraryBook;