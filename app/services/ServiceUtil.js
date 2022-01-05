const puppeteer = require('puppeteer');
let properties = require('../../resources/properties.json');

exports.concatAuthorAndBook = (author, book) => {
  return ((author != undefined ? author : '') + ' ' + (book != undefined ? book : '')).trim();
}

exports.createBookUrl = (searchUrl, bookUrl) => {
  let regex = /^(https:\/\/[\w\.]+)\/.*$/;
  let match = searchUrl.match(regex);
  return match[1] + bookUrl;
}

exports.getBrowser = async () => {
  if (properties.raspberryPi) {
    return await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } else {
    return await puppeteer.launch();
  }
}
