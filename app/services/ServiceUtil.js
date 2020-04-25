exports.concatAuthorAndBook = (author, book) => {
    return ((author != undefined ? author : '') + ' ' + (book != undefined ? book : '')).trim();
}

exports.createBookUrl = (searchUrl, bookUrl) => {
    let regex = /^(https:\/\/[\w\.]+)\/.*$/;
    let match = searchUrl.match(regex);
    return match[1] + bookUrl;
}
