// app.js — выбирает, какую страницу показать, по адресу:
// без ?poll= — страница ведущего, с ?poll=<id> — страница гостя.

// --- Общие мелочи для интерфейса (используют host.js и guest.js) ---

// Проигрывает CSS-анимацию заново: дрожание ошибки (shake) и пульс подтверждения (pulse)
function replayAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth; // браузер «забывает» прошлый запуск, и анимация играет снова
  element.classList.add(className);
}

// После смены экрана: наверх страницы, а фокус на новый экран (клавиатура и экранные дикторы не теряют место)
function focusScreen(screen) {
  window.scrollTo(0, 0);
  screen.setAttribute('tabindex', '-1');
  screen.focus({ preventScroll: true });
}

// --- Выбор страницы ---

const pollIdFromUrl = new URLSearchParams(location.search).get('poll');

if (pollIdFromUrl !== null) {
  startGuest(pollIdFromUrl);
} else {
  startHost();
}
