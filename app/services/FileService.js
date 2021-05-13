const fs = require('fs');

const readAuthors = async (filename) => {
  let authors = await read(filename);
  return authors.authors;
}

const read = async (filename) => {
  let data = fs.readFileSync(filename, 'utf8');
  return JSON.parse(data);
}

const writeAuthors = async (filename, authors) => {
  return await write(filename, authors);
}

const write = async (filename, authors) => {
  let authorsFile = {
    "authors": authors,
    "updated": new Date()
  }
  fs.writeFileSync(filename, JSON.stringify(authorsFile, propertyReplacer, 2));
}

const propertyReplacer = (key, value) => {
  if (key.indexOf("_") === 0) return undefined;
  else return value;
}

module.exports.readAuthors = readAuthors;
module.exports.writeAuthors = writeAuthors;