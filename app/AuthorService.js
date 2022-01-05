const fileService = require('./services/FileService');
const bokusService = require('./services/BokusService');
const notificationService = require('./services/NotificationService');
const dateFormat = require('dateformat');
const stringSimilarity = require('string-similarity');

const run = async (authorList, name, title, keyword) => {
  let authors = await fileService.readAuthors(authorList);
  if (authorExists(authors, name)) {
    let newAuthors = await Promise.all(authors.map(async author => {
      if (authorMatch(author.name, name)) {
        let book = await createBook(author, title);
        let books = addNewIfDontExist(author.books, book);
        author.books = books;
        return author;
      }

      return author;
    }));
    await fileService.writeAuthors(authorList, newAuthors);
    sendNotifications(newAuthors);
  } else {
    let newAuthor = createAuthor(name, keyword);
    if (title !== undefined && title !== null) {
      let book = await createBook(newAuthor, title);
      newAuthor.books.push(book);
    }

    authors.push(newAuthor);
    await fileService.writeAuthors(authorList, authors);
    sendNotifications(authors);
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

const createAuthor = (name, keyword) => {
  if (keyword !== undefined && keyword !== null) {
    return {
      'name': name,
      'keyword': keyword,
      'books': []
    }
  }

  return {
    'name': name,
    'books': []
  }
}

const createBook = async (author, title) => {
  let bokusBook = await bokusService.getLatestStatus(author, title);
  bokusBook._notify = 'NY_BOK';
  return bokusBook;
}

const addNewIfDontExist = (books, newBook) => {
  let allreadyExists = books.filter(book => titleMatch(book.title, newBook.title)).length > 0;

  if (!allreadyExists) {
    books.push(newBook);
  }

  return books;
}

const authorExists = (authors, name) => {
  return authors.filter(author => {
    return authorMatch(author.name, name);
  }).length > 0;
}

const authorMatch = (storedAuthor, newAuthor) => {
  let sim = stringSimilarity.compareTwoStrings(storedAuthor, newAuthor);
  return sim > 0.9;
}

const titleMatch = (storedBook, newBook) => {
  let sim = stringSimilarity.compareTwoStrings(storedBook, newBook);
  if (sim > 0.9) {
    return true;
  }

  let sl = storedBook.trim().indexOf(newBook.trim());
  let ls = newBook.trim().indexOf(storedBook.trim());
  return (sl === 0 || ls === 0) && sim > 0.5;
}

module.exports.run = run;