const fileService = require('./services/FileService');
const bokusService = require('./services/BokusService');
const vrydService = require('./services/VrydService');
const gbgService = require('./services/GbgService');
const jkpgService = require('./services/JkpgService');
const haboService = require('./services/HaboService');
const notificationService = require('./services/NotificationService');
const dateFormat = require('dateformat');
const stringSimilarity = require('string-similarity');

const run = async (authorList) => {
  let authors = await fileService.readAuthors(authorList);
  let newAuthors = [];
  for (let authorIndex = 0; authorIndex < authors.length; authorIndex++) {
    let author = authors[authorIndex];
    let latestBook = await bokusService.getLatestBook(author);
    let books = addLatestIfDontExist(author.books, latestBook);

    let newBooks = [];
    for (let bookIndex = 0; bookIndex < books.length; bookIndex++) {
      let book = books[bookIndex];
      if (book.status === 'KOMMANDE' && book._notify != 'NY_BOK') {
        let bokusBook = await bokusService.getLatestStatus(author, book.title);
        if (bokusBook.status === 'TILLGANGLIG_FOR_KOP') {
          bokusBook._notify = 'NY_STATUS';
        }

        newBooks.push(bokusBook);
        continue;
      } else if (book.status === 'TILLGANGLIG_FOR_KOP') {
        let libraryBook = await findLibraryBook(author, book);
        newBooks.push(mergeBooks(book, libraryBook));
        continue;
      }

      newBooks.push(book);
    };

    author.books = newBooks;
    newAuthors.push(author);
  };

  await fileService.writeAuthors(authorList, newAuthors);
  await sendNotifications(newAuthors);
}

const findLibraryBook = async (author, book) => {
  let libraryBook = await vrydService.getLibraryBook(author.name, book.title);
  if (libraryBook.status === 'TILLGANGLIG_FOR_LAN') {
    libraryBook._notify = 'TILLGANGLIG_FOR_LAN';
    return libraryBook;
  }

  libraryBook = await gbgService.getLibraryBook(author.name, book.title);
  if (libraryBook.status === 'TILLGANGLIG_FOR_LAN') {
    libraryBook._notify = 'TILLGANGLIG_FOR_LAN';
    return libraryBook;
  }

  libraryBook = await jkpgService.getLibraryBook(author.name, book.title);
  if (libraryBook.status === 'TILLGANGLIG_FOR_LAN') {
    libraryBook._notify = 'TILLGANGLIG_FOR_LAN';
    return libraryBook;
  }

  libraryBook = await haboService.getLibraryBook(author.name, book.title);
  if (libraryBook.status === 'TILLGANGLIG_FOR_LAN') {
    libraryBook._notify = 'TILLGANGLIG_FOR_LAN';
    return libraryBook;
  }

  return book;
}

const mergeBooks = (book, libraryBook) => {
  libraryBook.bokusUrl = book.bokusUrl;
  libraryBook.bokusRelease = book.bokusRelease;
  libraryBook.bokusEbookUrl = book.bokusEbookUrl;
  libraryBook.bokusEbookRelease = book.bokusEbookRelease;
  return libraryBook;
}

const addLatestIfDontExist = (books, latestBook) => {
  let latestExists = false;
  let newBooks = books.map(book => {
    if (latestBook.title && titleMatch(book.title, latestBook.title)) {
      latestExists = true;

      if (statusExceed(book.status, latestBook.status)) {
        latestBook._notify = 'NY_STATUS';
      }

      return latestBook;
    }

    return book;
  });

  if (latestBook.title && !latestExists) {
    latestBook._notify = 'NY_BOK';
    newBooks.push(latestBook);
  }

  return newBooks;
}

const titleMatch = (storedBook, latestBook) => {
  let sim = stringSimilarity.compareTwoStrings(storedBook, latestBook);
  if (sim > 0.9) {
    return true;
  }

  let sl = storedBook.trim().indexOf(latestBook.trim());
  let ls = latestBook.trim().indexOf(storedBook.trim());
  return (sl === 0 || ls === 0) && sim > 0.5;
}

const statusExceed = (storedStatus, latestStatus) => {
  return calculateStatusScore(latestStatus) > calculateStatusScore(storedStatus);
}

const calculateStatusScore = (status) => {
  if (status === 'TILLGANGLIG_FOR_LAN') {
    return 4;
  } else if (status === 'SLUTSALD') {
    return 3;
  } else if (status === 'TILLGANGLIG_FOR_KOP') {
    return 2;
  } else if (status === 'KOMMANDE') {
    return 1;
  }
}

const sendNotifications = async (authors) => {
  let notifications = authors.flatMap(author => {
    return author.books.filter(book => {
      return book._notify !== undefined
    }).map(book => {
      return constructNotification(author, book);;
    });
  });

  await Promise.all(notifications.map(async notification => {
    await notificationService.notify(notification);
  }));
}

const constructNotification = (author, book) => {
  let message = 'HALLÅ';
  if (book._notify === 'NY_BOK') {
    message = 'Ny bok ' + book.title + ' av ' + author.name;
  } else if (book._notify === 'NY_STATUS') {
    message = 'Ny status för ' + book.title + ' av ' + author.name + ' (' + translateStatus(book.status) + ')';
  } else if (book._notify === 'TILLGANGLIG_FOR_LAN') {
    message = book.title + ' av ' + author.name + ' är nu tillgänglig för lån på ' + book._store;
  }

  if (book.link) {
    message += '\n' + book.link;
  }

  return {
    'slackMessage': message,
    'consoleMessage': message,
    'timestamp': dateFormat(new Date(), 'yyyy-mm-dd')
  }
}

const translateStatus = (status) => {
  if (status === 'TILLGANGLIG_FOR_LAN') {
    return 'Tillgänglig för lån';
  } else if (status === 'SLUTSALD') {
    return 'Slutsåld';
  } else if (status === 'TILLGANGLIG_FOR_KOP') {
    return 'Tillgänglig för köp';
  } else if (status === 'KOMMANDE') {
    return 'Kommande';
  }
}

module.exports.run = run;