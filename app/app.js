const program = require('commander');
const stringSimilarity = require('string-similarity');
const authorService = require('./AuthorService');
const authorNotifier = require('./AuthorNotifier');
const libraryService = require('./LibraryService');
const gbg = require('./services/GbgService');
const vryd = require('./services/VrydService');
const jkpg = require('./services/JkpgService');
const habo = require('./services/HaboService');
const lund = require('./services/LundService');
const bokus = require('./services/BokusService');
let properties = require('../resources/properties.json');

const init = async () => {
  program
    .version('0.1.2')
    .option('-a --action <action>', '* Action: Books, Authors, Add')
    .option('-l --list <author list>', '* List: oscar, kids')
    .option('-n --name <author name>', 'Name: John Doe')
    .option('-t --title <book title>', '* Title: The best book')
    .option('-k --keyword <keyword>', '* Keyword: My book series')
    .parse(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
    return;
  }

  let exitCode = 0;
  if (stringSimilarity.findBestMatch(program.action, ['authors', 'books', 'bokus']).bestMatch.rating === 1) {
    let list = getAuthorList(program.list);
    await runNotifier(list, program.action, undefined, program.name);
  } else if (stringSimilarity.findBestMatch(program.action, ['gbg', 'vryd', 'jkpg', 'habo', 'lund']).bestMatch.rating === 1) {
    if (!program.name) {
      console.log('Missing -n <author name>');
    } else if (!program.title) {
      console.log('Missing -t <book title>');
    }

    await runNotifier(null, program.action, program.title, program.name);
  } else if (stringSimilarity.findBestMatch(program.action, ['lib']).bestMatch.rating === 1) {
    if (!program.name) {
      console.log('Missing -n <author name>');
    } else if (!program.title) {
      console.log('Missing -t <book title>');
    }

    await runNotifier(null, program.action, program.title, program.name);
  } else if (stringSimilarity.findBestMatch(program.action, ['add']).bestMatch.rating === 1) {
    if (!program.name) {
      console.log('Missing -n <author name>');
    }

    let list = getAuthorList(program.list);
    await runService(list, program.name, program.title, program.keyword);
  } else {
    let matches = stringSimilarity.findBestMatch(program.action,
      ['authors', 'books', 'bokus', 'gbg', 'vryd', 'jkpg', 'habo', 'lund', 'lib', 'add']);
    console.log(' \'' + program.action + '\' is not a valid action. See --help');
    console.log(' Did you mean \t\'' + matches.bestMatch.target + '\'');
    exitCode = 1;
  }

  process.exit(exitCode);
}

const runNotifier = async function (authorList, notifierName, title, name) {
  switch (notifierName) {
    case 'books':
    case 'authors':
      await authorNotifier.run(authorList);
      break;
    case 'lib':
      await libraryService.run(name, title);
      break;
    case 'gbg':
      let gbgBook = await gbg.getLibraryBook(name, title);
      console.log(gbgBook);
      break;
    case 'vryd':
      let vrydBook = await vryd.getLibraryBook(name, title);
      console.log(vrydBook);
      break;
    case 'jkpg':
      let jkpgBook = await jkpg.getLibraryBook(name, title);
      console.log(jkpgBook);
      break;
    case 'habo':
      let haboBook = await habo.getLibraryBook(name, title);
      console.log(haboBook);
      break;
    case 'lund':
      let lundBook = await lund.getLibraryBook(name, title);
      console.log(lundBook);
      break;
    case 'bokus':
      let author = {
        'name': name
      }
      let bokusBook = await bokus.getLatestBook(author);
      console.log(bokusBook);
      break;
  }
}

const runService = async function (authorList, name, title, keyword) {
  await authorService.run(authorList, name, title, keyword);
}

const getAuthorList = (list) => {
  if (list === undefined || list === null) {
    return properties.authorFiles.default;
  }

  return properties.authorFiles[list];
}

init();