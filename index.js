import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

//Remote Database ElephantSQL
const connectionString = process.env.DATABASE_URL;

const db = new pg.Client({
  connectionString: connectionString,
});


/*const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Books",
  password:  process.env.DATABASE_PASSWORD,
  port: 5432,
});*/

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

async function checkBooks() {
  const result = await db.query("SELECT * FROM read_books ORDER BY id ASC");
  let books = [];
  result.rows.forEach((book) => {
    books.push(book);
  });
  return books;
}

app.get("/", async (req, res) => {
  const books = await checkBooks();
  res.render("index.ejs", { books: books, selectedOption: "" });
});

app.post("/process-form", async (req, res) => {
  const selectedOption = req.body.selectedOption;
  let query;

  if (selectedOption === "Recency") {
    query = 
      "SELECT * FROM read_books ORDER BY publication_date DESC";
  } else if (selectedOption === "Rating"){
    query = "SELECT * FROM read_books ORDER BY rating DESC";
  }

  try {
    const result = await db.query(query);
    const books = result.rows;
    res.render("index.ejs", { books: books, selectedOption: selectedOption });
  } catch (error) {
    console.error("Error querying the database:", error);
    res.redirect("/");
  }
});

app.post("/add", async (req, res) => {
  res.render("new.ejs");
});

app.post("/new", async (req, res) => {
  const isbn = req.body.ISBN;
  const bookReview = req.body.review;
  const bookRating = req.body.rating;

  const isbnPattern = /^(?:\d{10}|\d{13})$/;
  if (!isbnPattern.test(isbn)) {
    res.render("new.ejs", { error: "Invalid ISBN format." });
    return;
  }

  try {
    const existingBook = await db.query(
      "SELECT * FROM read_books WHERE isbn = $1",
      [isbn]
    );

    if (existingBook.rows.length > 0) {
      // Book already exists in the database
      res.render("new.ejs", {
        error: "You have already read this book.",
      });
    } else {
      const apiRequest = await axios.get(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
      );

      const bookData = apiRequest.data[`ISBN:${isbn}`];
      if (bookData) {
        const bookTitle = bookData.title;
        const bookAuthor = bookData.authors[0].name;
        const bookCover = bookData.cover.medium;
        const bookRelease = bookData.publish_date;

        await db.query(
          "INSERT INTO read_books (isbn,title,author,cover,review,publication_date,rating) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [
            isbn,
            bookTitle,
            bookAuthor,
            bookCover,
            bookReview,
            bookRelease,
            bookRating,
          ]
        );
        res.redirect("/");
      } else {
        res.render("new.ejs", { error: "No book that matches your criteria." });
      }
    }
  } catch (error) {
    res.render("new.ejs", {
      error: "An error occurred while processing your request.",
    });
  }
});

app.post("/edit", async (req, res) => {
  try {
    const bookId = req.body.book;
    const bookReview = await db.query(
      "SELECT review FROM read_books WHERE read_books.id = $1;",
      [bookId]
    );

    if (bookReview.rows.length === 0) {
      return res.status(404).send("Book not found");
    }
    res.render("edit.ejs", {
      bookId: bookId,
      bookReview: bookReview.rows[0].review,
    });
  } catch (error) {
    console.error("Error in /edit route:", error);
    res.status(500).send("Internal server error");
  }
});

app.post("/edited", async (req, res) => {
  try {
    const newReview = req.body.review;
    const bookId = req.body.book;

    if (!newReview) {
      return res.status(400).send("New review cannot be empty");
    }

    await db.query(
      "UPDATE read_books SET review = $1 WHERE read_books.id = $2",
      [newReview, bookId]
    );
    res.redirect("/");
  } catch (error) {
    console.error("Error in /edited route:", error);
    res.status(500).send("Internal server error");
  }
});

app.post("/delete", async (req, res) => {
  try {
    const bookId = req.body.book;
    await db.query("DELETE FROM read_books WHERE read_books.id = $1", [bookId]);

    res.redirect("/");
  } catch (error) {
    console.error("Error in /delete route:", error);
    res.status(500).send("Internal server error");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
