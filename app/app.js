const program = require('commander');
const stringSimilarity = require('string-similarity');
const authorService = require('./AuthorService');
const authorNotifier = require('./AuthorNotifier');
const gbg = require('./services/GbgService');
const vryd = require('./services/VrydService');
const jkpg = require('./services/JkpgService');

const init = async () => {
  program
    .version('0.1.2')
    .option('-a --action <action>', 'Action: Books, Authors, Add')
    .option('-n --name <name>', 'Name: John Doe')
    .option('-t --title <title>', 'Title: The best book')
    .parse(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
    return;
  }

  let exitCode = 0;
  if (stringSimilarity.findBestMatch(program.action, ['authors', 'books', 'gbg', 'vryd', 'jkpg']).bestMatch.rating === 1) {
    await runNotifier(program.action, program.title);
  } else if (stringSimilarity.findBestMatch(program.action, ['add']).bestMatch.rating === 1) {
    await runService(program.name, program.title);
  } else {
    console.log(' \'' + program.action + '\' is not a valid action. See --help');
    console.log(' Did you mean \t\'' + matches.bestMatch.target + '\'');
    exitCode = 1;
  }

  process.exit(exitCode);
}

const runNotifier = async function (notifierName, title) {
  switch (notifierName) {
    case 'books':
    case 'authors':
      await authorNotifier.run();
      break;
    case 'gbg':
      let gbgBook = await gbg.getLibraryBook(title);
      console.log(gbgBook);
      break;
    case 'vryd':
      let vrydBook = await vryd.getLibraryBook(title);
      console.log(vrydBook);
      break;
    case 'jkpg':
      let jkpgBook = await jkpg.getLibraryBook(title);
      console.log(jkpgBook);
      break;
  }
}

const runService = async function (name, title) {
  await authorService.run(name, title);
}

init();