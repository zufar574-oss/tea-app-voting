// app.js — выбирает, какую страницу показать, по адресу:
// без ?poll= — страница ведущего, с ?poll=<id> — страница гостя.

const pollIdFromUrl = new URLSearchParams(location.search).get('poll');

if (pollIdFromUrl !== null) {
  startGuest(pollIdFromUrl);
} else {
  startHost();
}
