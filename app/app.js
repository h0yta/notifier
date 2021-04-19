const program = require('commander');
const stringSimilarity = require('string-similarity');
const authorService = require('./AuthorService');
const authorNotifier = require('./AuthorNotifier');
const gbg = require('./services/GbgService');
const vryd = require('./services/VrydService');
const jkpg = require('./services/JkpgService');
const bokus = require('./services/BokusService');
let properties = require('../resources/properties.json');

const init = async () => {
  program
    .version('0.1.2')
    .option('-a --action <action>', '* Action: Books, Authors, Add')
    .option('-l --list <author list>', '* List: oscar, viggo')
    .option('-t --title <book title>', '* Title: The best book')
    .option('-n --name <author name>', 'Name: John Doe')
    .parse(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
    return;
  }

  let exitCode = 0;
  let list = getAuthorList(program.list);
  if (stringSimilarity.findBestMatch(program.action, ['authors', 'books', 'bokus']).bestMatch.rating === 1) {
    await runNotifier(list, program.action, program.title);
  } else if (stringSimilarity.findBestMatch(program.action, ['gbg', 'vryd', 'jkpg']).bestMatch.rating === 1) {
    if (!program.name) {
      console.log('Missing -n <author name>');
    } else if (!program.title) {
      console.log('Missing -t <book title>');
    }

    await runNotifier(list, program.action, program.title, program.name);
  } else if (stringSimilarity.findBestMatch(program.action, ['add']).bestMatch.rating === 1) {
    if (!program.name) {
      console.log('Missing -n <author name>');
    } else if (!program.title) {
      console.log('Missing -t <book title>');
    }

    await runService(list, program.name, program.title);
  } else {
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
    case 'bokus':
      let bokusBook = await bokus.getLatestBook(title);
      console.log(bokusBook);
      break;
  }
}

const runService = async function (authorList, name, title) {
  await authorService.run(authorList, name, title);
}

const getAuthorList = (list) => {
  if (list === undefined || list === null) {
    return properties.authorFiles.default;
  }

  return properties.authorFiles[list];
}

init();