const vrydService = require('./services/VrydService');
const gbgService = require('./services/GbgService');
const jkpgService = require('./services/JkpgService');
const haboService = require('./services/HaboService');

const run = async (name, title) => {

  console.log('\n\t' + name.trim(), ' - ', title.trim());
  console.log('\t----------------------------------------------');
  let vrydBook = await vrydService.getLibraryBook(name, title);
  console.log('\tVAGGERYD:', translateStatus(vrydBook.status), '\n');

  let gbgBook = await gbgService.getLibraryBook(name, title);
  console.log('\tGÖTEBORG:', translateStatus(gbgBook.status), '\n');

  let jkpgBook = await jkpgService.getLibraryBook(name, title);
  console.log('\tJÖNKÖPING:', translateStatus(jkpgBook.status), '\n');

  let haboBook = await haboService.getLibraryBook(name, title);
  console.log('\tHABO:', translateStatus(haboBook.status), '\n');
  // TODO Add Lund, Mullsjö, Sollentuna

}

const translateStatus = (status) => {
  if (status === 'EJ_TILLGANGLIG_FOR_LAN') {
    return 'NEJ';
  } else if (status === 'TIILGANGLIG_FOR_LAN') {
    return 'JA';
  } else if (status === 'KOMMANDE') {
    return 'BOKAS';
  }

  return 'Okänt';
}

module.exports.run = run;