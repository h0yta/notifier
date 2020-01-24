const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');
let properties = require('../../resources/properties.json');

const getLibraryBook = async (bookTitle) => {
  let url = properties.jkpgLibraryUrl.replace("#####", bookTitle);

  return puppeteer
    .launch()
    .then((browser) => {
      return browser.newPage();
    }).then((page) => {
      return page.goto(url).then(() => {
        return page.content();
      });
    }).then((html) => {
      let $ = cheerio.load(html);
      let result = $('.work-link')
        .first()
        .text()
        // result may be null here, moves this inside null-check and make a static function.
        .replace(/\(.*\)/gi, '')
        .replace(/:.*/gi, '')
        .trim();

      let status = 'EJ_TIILGANGLIG_FOR_LAN';
      let store = 'Jönköping bibliotek';
      if (result !== null && stringSimilarity.compareTwoStrings(result, bookTitle) >= 0.8) {
        status = 'TILLGANGLIG_FOR_LAN';
      }

      let libBook = {
        'title': bookTitle,
        'status': status,
        'store': store
      }

      return libBook;
    }).catch((err) => {
      console.log(' Error in getLibraryBook in JkpgService', err);
    });

}

module.exports.getLibraryBook = getLibraryBook;