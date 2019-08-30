const program = require('commander');
const stringSimilarity = require('string-similarity');
const authorsNotifier = require('./authorNotifier');

const init = function () {
  program
    .version('0.1.1')
    .option('-a --action <action>', 'Action: Books')
    .parse(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
    return;
  }

  let matches = stringSimilarity.findBestMatch(program.action, ['authors', 'books']);
  if (matches.bestMatch.rating === 1) {
    run(program.action);
  } else {
    console.log(' \'' + program.action + '\' is not a valid action. See --help');
    console.log(' Did you mean \t\'' + matches.bestMatch.target + '\'');
  }
}

const run = async function (notifierName) {
  switch (notifierName) {
    case 'books':
    case 'authors':
      await authorsNotifier.run();
      break;
  }
}

init();