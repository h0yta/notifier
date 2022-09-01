const util = require('./ServiceUtil');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');

const lundUrl = 'https://folkbiblioteken.lund.se/search?p_p_id=searchResult_WAR_arenaportlet&p_p_lifecycle=1&p_p_state=normal&p_r_p_arena_urn%3Aarena_facet_queries=&p_r_p_arena_urn%3Aarena_search_query=organisationId_index%3AASE100155%5C%7C10000+AND+mediaClass_index%3AeBook+AND+language_index%3Aswe+AND+#####&p_r_p_arena_urn%3Aarena_search_type=solr&p_r_p_arena_urn%3Aarena_sort_advice=field%3DRelevance%26direction%3DDescending';

const getLibraryBook = async (author, book) => {
  let url = lundUrl.replace("#####", createQuery(author, book));

  const browser = await util.getBrowser();
  return browser.newPage().then((page) => {
    return page.goto(url).then(() => {
      return page.content();
    });
  }).then((html) => {
    let $ = cheerio.load(html);

    let resultDetail = $('.arena-detail-title')
      .children()
      .last()
      .text()
      // result may be null here, moves this inside null-check and make a static function.
      .replace(/\(.*\)/gi, '')
      .replace(/:.*/gi, '')
      .trim();

    let resultTitle;
    let resultAuthor;
    let resultLink;

    if (resultDetail.includes(author) && resultDetail.includes(book)) {
      resultTitle = resultDetail.split('/')[0]
        .replace(/\(.*\)/gi, '')
        .replace(/:.*/gi, '')
        .replace(/\[.*\]/gi, '')
        .trim();
      resultAuthor = resultDetail.split('/')[1]
        .replace(/\(.*\)/gi, '')
        .replace(/:.*/gi, '')
        .replace(/\./gi, '')
        .trim();
      console.log('resultTitle', resultTitle)
      console.log('resultAuthor', resultAuthor)
    } else {

      resultTitle = $('.arena-record-title')
        .children()
        .first()
        .text()
        // result may be null here, moves this inside null-check and make a static function.
        .replace(/\(.*\)/gi, '')
        .replace(/:.*/gi, '')
        .trim();
      console.log('resultTitle', resultTitle)
      resultAuthor = $('.arena-record-author')
        .children()
        .last()
        .text()
        .replace(/[\s]{2,}/gi, '');
      console.log('resultAuthor', resultAuthor)

      resultAuthor = resultAuthor.split('‚');

      resultLink = $('.arena-record-title')
        .children()
        .first()
        .attr('href');
    }

    let status = 'EJ_TILLGANGLIG_FOR_LAN';
    let link = '';
    let store = 'Lunds bibliotek';
    if (authorMatches(resultAuthor, author) && titlesMatch(resultTitle, book)) {
      status = 'TILLGANGLIG_FOR_LAN';
      link = resultLink;
    }

    let libBook = {
      'title': book,
      'status': status,
      'store': store,
      'link': link
    }

    return libBook;
  }).catch((err) => {
    console.log(' Error in getLibraryBook in VrydService', err);
  }).finally(async () => {
    await browser.close();
  });
}

const createQuery = (author, title) => {
  let authorPart = author.split(' ')
    .map(part => createPart('author_index', 'contributor_index', part))
    .join(' AND ').replace(/^/, "(").replace(/$/, ")");

  let titlePart = title.split(' ')
    .map(part => createPart('title_index', 'titleMain_index', part))
    .join(' AND ').replace(/^/, "(").replace(/$/, ")");

  return authorPart + ' AND ' + titlePart;
}

const createPart = (attr1, attr2, part) => {
  return '(' + attr1 + ':' + part + ' OR ' + attr2 + ':' + part + ')';
}

const authorMatches = (resultAuthors, author) => {
  return resultAuthors.filter(a => {
    return stringSimilarity.compareTwoStrings(a, author) >= 0.8;
  }).length > 0;
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