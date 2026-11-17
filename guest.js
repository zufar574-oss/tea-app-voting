// guest.js — страница гостя (адрес с ?poll=<id>).
// Показывает варианты или сообщение. Нажатие на вариант отправляет голос.

// --- Идентификатор устройства ---------------------------------------------

let memoryDeviceId = null; // запасной вариант, если браузер не даёт хранить данные

function makeRandomId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// Случайная строка, которая создаётся при первом открытии и запоминается в браузере.
// По ней база понимает, что это то же устройство, и заменяет голос, а не добавляет второй.
function getDeviceId() {
  try {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = makeRandomId();
      localStorage.setItem('device_id', id);
    }
    return id;
  } catch (error) {
    if (!memoryDeviceId) {
      memoryDeviceId = makeRandomId();
    }
    return memoryDeviceId;
  }
}

// --- Страница гостя --------------------------------------------------------

async function startGuest(pollId) {
  const screenGuest = document.getElementById('screen-guest');
  const guestStatus = document.getElementById('guest-status');
  const guestOptions = document.getElementById('guest-options');
  const guestHint = document.getElementById('guest-hint');

  let poll = null;
  let selectedChoice = null; // подтверждённый выбор: 1, 2, 3 или null
  let isSending = false;

  // Сообщение. kind — вид оформления:
  //   'loading'      «Загрузка…» по центру, серым, с крутилкой
  //   'message'      «Голосование закрыто» / «Голосование не найдено»: крупно по центру
  //   'center-error' «Не удалось загрузить…»: красный текст по центру
  //   'success'      «Голос принят»: вверху над кнопками, зелёным, с «попом»
  //   'error'        «Голос не отправился…»: вверху над кнопками, красный текст
  //   'reserve'      пустая строка статуса над кнопками (место занято, чтобы кнопки не прыгали)
  const STATUS_CLASSES = {
    'loading': 'center-message status-text loading',
    'message': 'center-message big-message',
    'center-error': 'center-message guest-error shake',
    'success': 'vote-status success',
    'error': 'vote-status guest-error shake',
    'reserve': 'vote-status'
  };

  function showStatus(text, kind) {
    guestStatus.className = '';
    void guestStatus.offsetWidth; // сброс, чтобы плавное появление сыграло заново при каждом голосе
    guestStatus.textContent = text;
    guestStatus.className = STATUS_CLASSES[kind] || '';
    guestStatus.hidden = text === '' && kind !== 'reserve';
  }

  function getButtons() {
    return Array.from(guestOptions.querySelectorAll('.vote-button'));
  }

  // Пока голос отправляется, кнопки недоступны (защита от двойного нажатия)
  function setSending(sending) {
    isSending = sending;
    getButtons().forEach(function (button) {
      button.disabled = sending;
    });
  }

  // Выбранная кнопка: светлый фон и зелёная рамка
  function markSelected() {
    getButtons().forEach(function (button) {
      const isSelected = Number(button.dataset.choice) === selectedChoice;
      button.classList.toggle('selected', isSelected);
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  }

  async function onVoteClick(choice) {
    if (isSending) {
      return;
    }
    setSending(true);

    try {
      await castVote(poll.id, getDeviceId(), choice);
      selectedChoice = choice;
      markSelected();
      showStatus('Голос принят', 'success');
      guestHint.classList.add('visible'); // подсказка «Нажмите на другой вариант…»
    } catch (error) {
      // Голос не ушёл. Возможно, ведущий уже закрыл голосование: проверяем.
      let current;
      try {
        current = await getPoll(poll.id);
      } catch (checkError) {
        current = undefined; // связи нет, статус узнать не удалось
      }

      if (current && current.status === 'closed') {
        guestOptions.innerHTML = '';
        guestHint.hidden = true;
        showStatus('Голосование закрыто', 'message');
      } else if (current === null) {
        guestOptions.innerHTML = '';
        guestHint.hidden = true;
        showStatus('Голосование не найдено', 'message');
      } else {
        showStatus('Голос не отправился. Проверьте интернет и нажмите на вариант ещё раз.', 'error');
      }
    }

    setSending(false);
  }

  screenGuest.hidden = false;
  showStatus('Загрузка…', 'loading');

  try {
    poll = await getPoll(pollId);
  } catch (error) {
    showStatus('Не удалось загрузить. Проверьте интернет и обновите страницу.', 'center-error');
    return;
  }

  if (poll === null) {
    showStatus('Голосование не найдено', 'message');
    return;
  }

  if (poll.status === 'closed') {
    showStatus('Голосование закрыто', 'message');
    return;
  }

  // Голосование открыто: три кнопки с текстом вариантов
  showStatus('', 'reserve');
  guestHint.hidden = false; // место под подсказку занято, сама она появится после выбора
  guestOptions.innerHTML = '';
  [poll.option_1, poll.option_2, poll.option_3].forEach(function (text, i) {
    const choice = i + 1; // номер варианта: 1, 2 или 3
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vote-button';
    button.dataset.choice = String(choice);
    button.setAttribute('aria-pressed', 'false');
    button.textContent = text; // текст вставляем как текст, не как код
    button.addEventListener('click', function () {
      onVoteClick(choice);
    });
    guestOptions.appendChild(button);
  });
}
