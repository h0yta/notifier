const util = require('./ServiceUtil');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');

const gbgUrl = 'https://gotlib.overdrive.com/search?query=#####&format=ebook-epub-adobe&sortBy=releasedate';

const getLibraryBook = async (author, book) => {
  let url = gbgUrl.replace("#####", util.concatAuthorAndBook(author, book));

  const browser = await util.getBrowser();
  return browser.newPage().then((page) => {
    return page.goto(url).then(() => {
      return page.content();
    });
  }).then((html) => {
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

    let status = 'EJ_TILLGANGLIG_FOR_LAN';
    let store = 'Göteborgs bibliotek';
    if (result !== null && titlesMatch(book, result)) {
      let gbgStatus = $('.TitleActionButton')
        .children()
        .first()
        .text()
        // result may be null here, moves this inside null-check and make a static function.
        .replace(/\(.*\)/gi, '')
        .replace(/:.*/gi, '')
        .trim();

      status = translateStatus(gbgStatus);
    }

    let libBook = {
      'title': book,
      'status': status,
      '_store': store,
      'libraryUrl': util.createBookUrl(url, link)
    }

    return libBook;
  }).catch(function (err) {
    console.log(' Error in getLibraryBook in GbgService', err);
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

const translateStatus = (status) => {
  if (stringSimilarity.compareTwoStrings(status, 'PLACE A HOLD') > 0.95) {
    return 'KOMMANDE';
  } else {
    return 'TILLGANGLIG_FOR_LAN';
  }
}

module.exports.getLibraryBook = getLibraryBook;