const request = require('request');
const cheerio = require('cheerio');
const Promise = require('promise');
const stringSimilarity = require('string-similarity');
let properties = require('../../resources/properties.json');

const getLibraryBook = function (bookTitle) {
    return new Promise(function (resolve, reject) {
        let url = properties.vrydLibraryUrl.replace("#####", bookTitle);
        var options = {
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
            }
        };
        request(options, function (err, response, body) {
            if (err) {
                console.log(' Error in getVrydLibraryBook', err);
                reject(err);
            } else {
                let $ = cheerio.load(body);
                let result = $('.product-list-item-link')
                    .children()
                    .first()
                    .text();

                let status = 'EJ_TIILGANGLIG_FOR_LAN';
                let store = 'Vaggeryds bibliotek';
                if (result !== null && stringSimilarity.compareTwoStrings(result, bookTitle) >= 0.8) {
                    status = 'TILLGANGLIG_FOR_LAN';
                }

                let libBook = {
                    'title': bookTitle,
                    'status': status,
                    'store': store
                }

                resolve(libBook);
            }
        });
    });
}

module.exports.getLibraryBook = getLibraryBook;