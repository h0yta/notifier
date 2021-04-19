const fs = require('fs');

const readAuthors = async (filename) => {
  return await read(filename);
}

const read = async (filename) => {
  let data = fs.readFileSync(__dirname + '/' + filename, 'utf8');
  return JSON.parse(data);
}

const writeAuthors = async (filename, authors) => {
  return await write(filename, authors);
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