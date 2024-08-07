# Digital-Bookself
This is code for a digital bookself that stores the books you have read.

## How to set it up
You will need to replace the credentials of a local database that have these schema (id, isbn, title, author, cover, review, publication_date, rating).
Set up environment variables for URL or password of the databases for secrecy.
Then run npm i and then nodemon index.js.

# Required SQl to run code 
CREATE TABLE read_books (
	id BIGSERIAL PRIMARY KEY,
	isbn INT UNIQUE NOT NUll,
	title TEXT NOT NUll,
	author TEXT NOT NUll,
	cover TEXT NOT NUll,
	review TEXT NOT NUll,
	publication_date DATE NOT NUll,
	rating INT NOT NUll
);