// guest.js — страница гостя (адрес с ?poll=<id>).
// Сейчас: показывает варианты или сообщение. Отправка голоса появится в шаге 9.

async function startGuest(pollId) {
  const screenGuest = document.getElementById('screen-guest');
  const guestStatus = document.getElementById('guest-status');
  const guestOptions = document.getElementById('guest-options');

  // Одно сообщение по центру (или пустая строка, если сообщения нет)
  function showStatus(text) {
    guestStatus.textContent = text;
    guestStatus.hidden = text === '';
  }

  screenGuest.hidden = false;
  showStatus('Загрузка…');

  let poll;
  try {
    poll = await getPoll(pollId);
  } catch (error) {
    showStatus('Не удалось загрузить. Проверьте интернет и обновите страницу.');
    return;
  }

  if (poll === null) {
    showStatus('Голосование не найдено');
    return;
  }

  if (poll.status === 'closed') {
    showStatus('Голосование закрыто');
    return;
  }

  // Голосование открыто: три кнопки с текстом вариантов
  showStatus('');
  guestOptions.innerHTML = '';
  [poll.option_1, poll.option_2, poll.option_3].forEach(function (text, i) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vote-button';
    button.dataset.choice = String(i + 1); // номер варианта: 1, 2 или 3
    button.textContent = text;             // текст вставляем как текст, не как код
    guestOptions.appendChild(button);
  });
}
