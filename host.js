// host.js — страница ведущего. Сейчас: форма «Создать голосование» и экран QR.
// Весь код внутри функции startHost(): её запускает app.js, если в адресе нет ?poll=.

function startHost() {
  const optionFields = [
    document.getElementById('option_1'),
    document.getElementById('option_2'),
    document.getElementById('option_3')
  ];
  const createButton = document.getElementById('create-button');
  const formMessage = document.getElementById('form-message');
  const screenForm = document.getElementById('screen-form');
  const screenQr = document.getElementById('screen-qr');
  const qrBox = document.getElementById('qr-box');
  const qrOptions = document.getElementById('qr-options');
  const votedCount = document.getElementById('voted-count');
  const refreshButton = document.getElementById('refresh-button');
  const qrMessage = document.getElementById('qr-message');
  const countButton = document.getElementById('count-button');
  const screenResults = document.getElementById('screen-results');
  const resultsList = document.getElementById('results-list');
  const resultsMessage = document.getElementById('results-message');
  const resultsRefreshButton = document.getElementById('results-refresh-button');

  // Голосование, которое ведёт ведущий (понадобится в следующих шагах)
  let currentPoll = null;

  // Поле растёт по высоте вместе с текстом
  function autoGrow(field) {
    field.style.height = 'auto';
    field.style.height = field.scrollHeight + 'px';
  }

  function showMessage(text) {
    formMessage.textContent = text;
  }

  // Пока идёт запрос, поля и кнопка недоступны
  function setLoading(isLoading) {
    optionFields.forEach(function (field) {
      field.disabled = isLoading;
    });
    createButton.disabled = isLoading;
    createButton.textContent = isLoading ? 'Создаю…' : 'Создать';
  }

  // Ссылка для гостей: адрес этой же страницы + ?poll=<id>
  function makeGuestLink(pollId) {
    return location.origin + location.pathname + '?poll=' + encodeURIComponent(pollId);
  }

  // Показывает экран QR: большой QR и мелкие тексты вариантов
  function showQrScreen(poll) {
    const qr = qrcode(0, 'M'); // 0 = размер подберётся сам, 'M' = средний запас на помехи
    qr.addData(makeGuestLink(poll.id));
    qr.make();
    qrBox.innerHTML = qr.createSvgTag({ cellSize: 4, scalable: true });

    // Тексты вставляем как текст (textContent), а не как код
    qrOptions.innerHTML = '';
    [poll.option_1, poll.option_2, poll.option_3].forEach(function (text) {
      const item = document.createElement('li');
      item.textContent = text;
      qrOptions.appendChild(item);
    });

    // Для нового голосования счётчик начинается с нуля
    votedCount.textContent = 'Проголосовало: 0';
    qrMessage.textContent = '';
    setCounting(false);
    screenResults.hidden = true;

    screenForm.hidden = true;
    screenQr.hidden = false;
  }

  // Пока идёт подсчёт, обе кнопки на экране QR недоступны
  function setCounting(isCounting) {
    countButton.disabled = isCounting;
    refreshButton.disabled = isCounting;
    countButton.textContent = isCounting ? 'Считаю…' : 'Подсчитать';
  }

  // Кнопка «Обновить»: читает голоса и показывает, сколько человек проголосовало
  async function onRefreshClick() {
    if (currentPoll === null) {
      return;
    }

    qrMessage.textContent = '';
    refreshButton.disabled = true;
    refreshButton.textContent = 'Обновляю…';

    try {
      const votes = await getVotes(currentPoll.id);
      votedCount.textContent = 'Проголосовало: ' + votes.length;
    } catch (error) {
      // Число остаётся прежним
      qrMessage.textContent = 'Не удалось обновить. Нажмите «Обновить» ещё раз.';
    }

    refreshButton.disabled = false;
    refreshButton.textContent = 'Обновить';
  }

  async function onCreateClick() {
    const values = optionFields.map(function (field) {
      return field.value.trim();
    });

    // Подсвечиваем пустые поля
    let hasEmpty = false;
    optionFields.forEach(function (field, i) {
      const isEmpty = values[i] === '';
      field.classList.toggle('invalid', isEmpty);
      if (isEmpty) {
        hasEmpty = true;
      }
    });

    if (hasEmpty) {
      showMessage('Заполните все три варианта');
      return;
    }

    showMessage('');
    setLoading(true);

    let poll;
    try {
      poll = await createPoll(values[0], values[1], values[2]);
    } catch (error) {
      showMessage('Не удалось создать голосование. Проверьте интернет и нажмите «Создать» ещё раз.');
      setLoading(false);
      return;
    }

    currentPoll = poll;
    showQrScreen(poll);
  }

  // Рисует три строки итогов: текст варианта и число голосов
  function renderResults(votes) {
    const texts = [currentPoll.option_1, currentPoll.option_2, currentPoll.option_3];
    resultsList.innerHTML = '';
    texts.forEach(function (text, i) {
      const choice = i + 1;
      const count = votes.filter(function (vote) {
        return Number(vote.choice) === choice;
      }).length;

      const row = document.createElement('div');
      row.className = 'result-row';

      const textBox = document.createElement('span');
      textBox.className = 'result-text';
      textBox.textContent = text;

      const numberBox = document.createElement('span');
      numberBox.className = 'result-number';
      numberBox.textContent = String(count);

      row.appendChild(textBox);
      row.appendChild(numberBox);
      resultsList.appendChild(row);
    });
  }

  // Читает голоса и показывает итоги. Если не вышло, даёт повторить кнопкой «Обновить».
  async function loadResults() {
    resultsMessage.textContent = 'Считаю…';
    resultsRefreshButton.hidden = true;

    try {
      const votes = await getVotes(currentPoll.id);
      renderResults(votes);
      resultsMessage.textContent = '';
    } catch (error) {
      resultsList.innerHTML = '';
      resultsMessage.textContent = 'Не удалось обновить. Нажмите «Обновить» ещё раз.';
      resultsRefreshButton.hidden = false;
    }
  }

  // Кнопка «Подсчитать»: сначала закрываем голосование, потом считаем голоса
  async function onCountClick() {
    if (currentPoll === null) {
      return;
    }

    qrMessage.textContent = '';
    setCounting(true);

    try {
      await closePoll(currentPoll.id);
    } catch (error) {
      // Голосование осталось открытым
      qrMessage.textContent = 'Не удалось подсчитать. Нажмите «Подсчитать» ещё раз.';
      setCounting(false);
      return;
    }

    // Голосование закрыто: новые голоса уже не придут. Показываем итоги.
    screenQr.hidden = true;
    screenResults.hidden = false;
    await loadResults();
  }

  optionFields.forEach(function (field) {
    field.addEventListener('input', function () {
      field.classList.remove('invalid');
      autoGrow(field);
    });
  });

  createButton.addEventListener('click', onCreateClick);
  refreshButton.addEventListener('click', onRefreshClick);
  countButton.addEventListener('click', onCountClick);
  resultsRefreshButton.addEventListener('click', loadResults);

  screenForm.hidden = false;
}
