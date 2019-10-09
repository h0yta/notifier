const program = require('commander');
const stringSimilarity = require('string-similarity');
const authorService = require('./AuthorService');
const authorNotifier = require('./AuthorNotifier');

const init = async function () {
  program
    .version('0.1.1')
    .option('-a --action <action>', 'Action: Books, Authors, Add')
    .option('-n --name <name>', 'Name: John Doe')
    .option('-t --title <title>', 'Title: The best book')
    .parse(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
    return;
  }

  if (stringSimilarity.findBestMatch(program.action, ['authors', 'books']).bestMatch.rating === 1) {
    await runNotifier(program.action);
  } else if (stringSimilarity.findBestMatch(program.action, ['add']).bestMatch.rating === 1) {
    await runService(program.name, program.title);
  } else {
    console.log(' \'' + program.action + '\' is not a valid action. See --help');
    console.log(' Did you mean \t\'' + matches.bestMatch.target + '\'');
  }
}

const runNotifier = async function (notifierName) {
  switch (notifierName) {
    case 'books':
    case 'authors':
      await authorNotifier.run();
      break;
    case 'add':
      await authorService.run();
      break;
  }
}

const runService = async function (name, title) {

  await authorService.run(name, title);

}

init();