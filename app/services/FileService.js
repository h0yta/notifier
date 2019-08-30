const fs = require('fs');

const readAuthors = async () => {
    return await read('../../resources/authors.json');
}

const read = async (filename) => {
    let data = fs.readFileSync(__dirname + '/' + filename, 'utf8');
    return JSON.parse(data);
}

const writeAuthors = async (authors) => {
    return await write('../../resources/authors.json', authors);
}

const write = async (filename, authors) => {
    fs.writeFileSync(__dirname + '/' + filename, JSON.stringify(authors, propertyReplacer, 2));
}

const propertyReplacer = (key, value) => {
    if (key.indexOf("_") === 0) return undefined;
    else return value;
}

module.exports.readAuthors = readAuthors;
module.exports.writeAuthors = writeAuthors;