const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');
let properties = require('../../resources/properties.json');

const getLibraryBook = async (bookTitle) => {
  let url = properties.gbgLibraryUrl.replace("#####", bookTitle);

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
        .replace(/\(.*\)/gi, '')
        .replace(/:.*/gi, '')
        .trim();

      let status = 'EJ_TIILGANGLIG_FOR_LAN';
      let store = 'Göteborgs bibliotek';
      if (result !== null && stringSimilarity.compareTwoStrings(result, bookTitle) >= 0.8) {
        status = 'TILLGANGLIG_FOR_LAN';
      }

      let libBook = {
        'title': bookTitle,
        'status': status,
        'store': store
      }

      return libBook;
    }).catch(function (err) {
      console.log(' Error in getLibraryBook in GbgService', err);
    });

}

module.exports.getLibraryBook = getLibraryBook;