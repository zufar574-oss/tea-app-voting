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
  const refreshLabel = refreshButton.querySelector('.btn-label');
  const qrMessage = document.getElementById('qr-message');
  const copyButton = document.getElementById('copy-button');
  const countButton = document.getElementById('count-button');
  const screenResults = document.getElementById('screen-results');
  const resultsList = document.getElementById('results-list');
  const resultsMessage = document.getElementById('results-message');
  const resultsRefreshButton = document.getElementById('results-refresh-button');
  const newRoundButton = document.getElementById('new-round-button');

  // Голосование, которое ведёт ведущий (понадобится в следующих шагах)
  let currentPoll = null;

  // Поле растёт по высоте вместе с текстом
  function autoGrow(field) {
    field.style.height = 'auto';
    field.style.height = field.scrollHeight + 'px';
  }

  function showMessage(text) {
    formMessage.textContent = text;
    if (text !== '') {
      replayAnimation(formMessage, 'shake');
    }
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
      const line = document.createElement('span'); // одна строка, длинный текст обрезается многоточием
      line.className = 'variant-text';
      line.textContent = text;
      item.appendChild(line);
      qrOptions.appendChild(item);
    });

    // Для нового голосования счётчик начинается с нуля
    votedCount.textContent = 'Проголосовало: 0';
    showQrMessage('', false);
    setCounting(false);
    screenResults.hidden = true;

    screenForm.hidden = true;
    screenQr.hidden = false;
    focusScreen(screenQr);
  }

  // Строка статуса под счётчиком: серый текст («Обновлено», «Ссылка скопирована») или красная ошибка.
  // Серый текст сам исчезает через 3 секунды, ошибка остаётся до следующего действия.
  let qrMessageTimer = null;

  function showQrMessage(text, isError) {
    clearTimeout(qrMessageTimer);
    qrMessage.textContent = text;
    qrMessage.className = isError ? 'qr-status is-error' : 'qr-status';
    qrMessage.setAttribute('role', isError ? 'alert' : 'status');
    if (isError) {
      replayAnimation(qrMessage, 'shake');
    } else if (text !== '') {
      qrMessageTimer = setTimeout(function () {
        qrMessage.textContent = '';
      }, 3000);
    }
  }

  // Копирует текст в буфер обмена. Если современный способ не сработал, пробуем запасной.
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (error) {
        // не вышло, пробуем запасной способ ниже
      }
    }

    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    if (!copied) {
      throw new Error('Не удалось скопировать');
    }
  }

  // Кнопка «Скопировать ссылку»: копирует ссылку для гостей (адрес страницы + ?poll=<id>)
  async function onCopyClick() {
    if (currentPoll === null) {
      return;
    }
    try {
      await copyText(makeGuestLink(currentPoll.id));
      showQrMessage('Ссылка скопирована', false);
    } catch (error) {
      showQrMessage('Не удалось скопировать ссылку.', true);
    }
  }

  // Пока идёт подсчёт, кнопки на экране QR недоступны
  function setCounting(isCounting) {
    countButton.disabled = isCounting;
    refreshButton.disabled = isCounting;
    copyButton.disabled = isCounting;
    countButton.textContent = isCounting ? 'Считаю…' : 'Подсчитать';
  }

  // Кнопка «Обновить»: читает голоса и показывает, сколько человек проголосовало
  async function onRefreshClick() {
    if (currentPoll === null) {
      return;
    }

    showQrMessage('', false);
    refreshButton.disabled = true;
    refreshButton.classList.add('is-loading'); // вместо иконки крутится кружок
    refreshLabel.textContent = 'Обновляю…';

    try {
      const votes = await getVotes(currentPoll.id);
      votedCount.textContent = 'Проголосовало: ' + votes.length;
      replayAnimation(votedCount, 'counter-pulse'); // при каждом обновлении счётчик коротко пульсирует
      showQrMessage('Обновлено', false);
    } catch (error) {
      // Число остаётся прежним
      showQrMessage('Не удалось обновить. Нажмите «Обновить» ещё раз.', true);
    }

    refreshButton.disabled = false;
    refreshButton.classList.remove('is-loading');
    refreshLabel.textContent = 'Обновить';
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
    resultsMessage.className = 'status-text loading';
    resultsMessage.textContent = 'Считаю…';
    resultsRefreshButton.hidden = true;
    newRoundButton.hidden = true;

    try {
      const votes = await getVotes(currentPoll.id);
      renderResults(votes);
      resultsMessage.textContent = '';
      newRoundButton.hidden = false;
    } catch (error) {
      resultsList.innerHTML = '';
      resultsMessage.className = 'error-message';
      resultsMessage.textContent = 'Не удалось обновить. Нажмите «Обновить» ещё раз.';
      replayAnimation(resultsMessage, 'shake');
      resultsRefreshButton.hidden = false;
    }
  }

  // Кнопка «Подсчитать»: сначала закрываем голосование, потом считаем голоса
  async function onCountClick() {
    if (currentPoll === null) {
      return;
    }

    showQrMessage('', false);
    setCounting(true);

    try {
      await closePoll(currentPoll.id);
    } catch (error) {
      // Голосование осталось открытым
      showQrMessage('Не удалось подсчитать. Нажмите «Подсчитать» ещё раз.', true);
      setCounting(false);
      return;
    }

    // Голосование закрыто: новые голоса уже не придут. Показываем итоги.
    screenQr.hidden = true;
    screenResults.hidden = false;
    focusScreen(screenResults);
    await loadResults();
  }

  // Кнопка «Новый раунд»: возвращаемся к форме, поля заполнены текстами прошлого раунда.
  // Прошлое голосование остаётся в базе закрытым, новое создаётся кнопкой «Создать».
  function onNewRoundClick() {
    if (currentPoll === null) {
      return;
    }

    optionFields[0].value = currentPoll.option_1;
    optionFields[1].value = currentPoll.option_2;
    optionFields[2].value = currentPoll.option_3;
    optionFields.forEach(function (field) {
      field.classList.remove('invalid');
    });
    showMessage('');
    setLoading(false);

    // Забываем прошлый раунд, чтобы кнопки не работали с закрытым голосованием
    currentPoll = null;
    resultsList.innerHTML = '';
    resultsMessage.textContent = '';
    resultsRefreshButton.hidden = true;
    newRoundButton.hidden = true;

    screenResults.hidden = true;
    screenForm.hidden = false;
    focusScreen(screenForm);

    // Высота полей подгоняется под текст, когда форма уже видна
    optionFields.forEach(autoGrow);
  }

  optionFields.forEach(function (field) {
    field.addEventListener('input', function () {
      field.classList.remove('invalid');
      autoGrow(field);
    });
  });

  createButton.addEventListener('click', onCreateClick);
  refreshButton.addEventListener('click', onRefreshClick);
  copyButton.addEventListener('click', onCopyClick);
  countButton.addEventListener('click', onCountClick);
  resultsRefreshButton.addEventListener('click', loadResults);
  newRoundButton.addEventListener('click', onNewRoundClick);

  screenForm.hidden = false;
}
