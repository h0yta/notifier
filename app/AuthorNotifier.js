const fileService = require('./services/FileService');
const bokusService = require('./services/BokusService');
const elibService = require('./services/ElibService');
const notificationService = require('./services/NotificationService');
const dateFormat = require('dateformat');
const stringSimilarity = require('string-similarity');

const run = async () => {
  let authors = await fileService.readAuthors();

  let newAuthors = await Promise.all(authors.map(async (author) => {
    let latestBook = await bokusService.getLatestBook(author.name);

    let books = addLatestIfDontExist(author.books, latestBook);

    let newBooks = await Promise.all(books.map(async (book) => {
      if (book.status === 'TILLGANGLIG_FOR_KOP') {
        let libraryBook = await elibService.getLibraryBook(book.title);
        if (libraryBook.status === 'TILLGANGLIG_FOR_LAN') {
          libraryBook._notify = "TILLGANGLIG_FOR_LAN";
          return libraryBook;
        }
      }

      return book;
    }));

    author.books = newBooks;
    return author;
  }));

  await fileService.writeAuthors(newAuthors);
  sendNotifications(newAuthors);
}

const addLatestIfDontExist = (books, latestBook) => {
  let latestExists = false;
  let newBooks = books.map(book => {
    if (titleMatch(book.title, latestBook.title)) {
      latestExists = true;

      if (statusExceed(book.status, latestBook.status)) {
        latestBook._notify = "NY_STATUS";
        return latestBook;
      }
    }

    return book;
  });

  if (!latestExists) {
    latestBook._notify = "NY_BOK";
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

const sendNotifications = (authors) => {
  authors.forEach(author => {
    let filtredBooks = author.books.filter(book => {
      return book._notify !== undefined
    });

    filtredBooks.forEach(book => {
      let notification = constructNotification(author, book);
      notificationService.notify(notification);
    });
  });
}

const constructNotification = (author, book) => {
  let message = 'HALLÅ';
  if (book._notify === 'NY_BOK') {
    message = 'Ny bok ' + book.title + ' av ' + author.name;
  } else if (book._notify === 'NY_STATUS') {
    message = 'Ny status för ' + book.title + ' av ' + author.name + '(' + book.status + ')';
  } else if (book._notify === 'TILLGANGLIG_FOR_LAN') {
    message = book.title + ' av ' + author.name + 'är nu tillgänglig för lån på ' + book.store;
  }

  return {
    'slackMessage': message,
    'consoleMessage': message,
    'timestamp': dateFormat(new Date(), 'yyyy-mm-dd')
  }
}

module.exports.run = run;