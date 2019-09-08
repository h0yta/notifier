const fileService = require('./services/FileService');
const notificationService = require('./services/NotificationService');
const dateFormat = require('dateformat');
const stringSimilarity = require('string-similarity');

const run = async (name, title) => {
    let authors = await fileService.readAuthors();
    if (authorExists(authors, name)) {
        let newAuthors = authors.map(author => {
            if (authorMatch(author.name, name)) {
                let books = addNewIfDontExist(author.books, createBook(title));
                author.books = books;
                return author;
            }

            return author;
        });
        await fileService.writeAuthors(newAuthors);
        sendNotifications(newAuthors);
    } else {
        let newAuthor = createAuthor(name);
        newAuthor.books.push(createBook(title));
        authors.push(newAuthor);
        await fileService.writeAuthors(authors);
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

const createAuthor = (name) => {
    return {
        'name': name,
        'books': []
    }
}

const createBook = (title) => {
    return {
        'title': title,
        'status': 'KOMMANDE',
        '_notify': 'NY_BOK'
    }
}

const addNewIfDontExist = (books, newBook) => {
    let latestExists = false;
    let newBooks = books.map(book => {
        if (titleMatch(book.title, newBook.title)) {
            latestExists = true;
        }

        return book;
    });

    if (!latestExists) {
        newBooks.push(newBook);
    }

    return newBooks;
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