const util = require('./ServiceUtil');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');

const jkpgUrl = 'https://bibliotek.jonkoping.se/search?query=#####&pagesize=5&mode=full&fMediaId=9bccd1a463234d0ba8cea5d10108805b&fLang=swe&sort=PublishYear#catalog-results';

const getLibraryBook = async (author, book) => {
  let url = jkpgUrl.replace("#####", util.concatAuthorAndBook(author, book));

  const browser = await util.getBrowser();
  return browser.newPage().then((page) => {
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

    let link = $('.work-link')
      .first()
      .attr('href');

    let status = 'EJ_TILLGANGLIG_FOR_LAN';
    let store = 'Jönköping bibliotek';
    if (result !== null && titlesMatch(result, book)) {
      status = 'TILLGANGLIG_FOR_LAN';
    }

    let libBook = {
      'title': book,
      'status': status,
      '_store': store,
      'libraryUrl': util.createBookUrl(url, link)
    }

    return libBook;
  }).catch((err) => {
    console.log(' Error in getLibraryBook in JkpgService', err);
  }).finally(async () => {
    await browser.close();
  });
}

const titlesMatch = (searchedTitle, foundTitle) => {
  if (searchedTitle == undefined || foundTitle == undefined) {
    return false;
  }

  let sim = stringSimilarity.compareTwoStrings(searchedTitle, foundTitle);
  if (sim > 0.85) {
    return true;
  }

  let sl = searchedTitle.trim().indexOf(foundTitle.trim());
  let ls = foundTitle.trim().indexOf(searchedTitle.trim());
  return (sl === 0 || ls === 0) && sim > 0.5;
}

module.exports.getLibraryBook = getLibraryBook;