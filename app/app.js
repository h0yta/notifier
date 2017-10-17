var dateFormat = require('dateformat');
var bookNotifier = require('./bookNotifier');

var init = function() {
  var argv = require('minimist')(process.argv.slice(2));
  argv._.forEach((notifierName) => {
    runNotifier(notifierName);
  })
}

var runNotifier = function(notifierName) {
  switch(notifierName) {
    case 'book':
      bookNotifier.run();
    break;
  }
}

init();