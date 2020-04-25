const util = require('./ServiceUtil');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');
let properties = require('../../resources/properties.json');

const getLibraryBook = async (author, book) => {
  let url = properties.vrydLibraryUrl.replace("#####", util.concatAuthorAndBook(author, book));

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
      let result = $('.product-list-item-link')
        .children()
        .first()
        .text()
        // result may be null here, moves this inside null-check and make a static function.
        .replace(/\(.*\)/gi, '')
        .replace(/:.*/gi, '')
        .trim();

      let link = $('.product-list-item-link')
        .first()
        .attr('href');

      console.log(result);
      console.log(link);
      console.log(book);
      console.log(stringSimilarity.compareTwoStrings(result, book));


      let status = 'EJ_TIILGANGLIG_FOR_LAN';
      let store = 'Vaggeryds bibliotek';
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
    }).catch((err) => {
      console.log(' Error in getLibraryBook in VrydService', err);
    });

}

module.exports.getLibraryBook = getLibraryBook;