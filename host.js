// host.js — страница ведущего. Сейчас: форма «Создать голосование» и экран QR.

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

  screenForm.hidden = true;
  screenQr.hidden = false;
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

optionFields.forEach(function (field) {
  field.addEventListener('input', function () {
    field.classList.remove('invalid');
    autoGrow(field);
  });
});

createButton.addEventListener('click', onCreateClick);
