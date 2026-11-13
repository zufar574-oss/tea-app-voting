// host.js — страница ведущего. Сейчас: форма «Создать голосование».

const optionFields = [
  document.getElementById('option_1'),
  document.getElementById('option_2'),
  document.getElementById('option_3')
];
const createButton = document.getElementById('create-button');
const formMessage = document.getElementById('form-message');
const screenForm = document.getElementById('screen-form');
const screenCreated = document.getElementById('screen-created');
const createdLine = document.getElementById('created-line');

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

  try {
    const poll = await createPoll(values[0], values[1], values[2]);
    // Временно: в шаге 7 здесь откроется экран QR
    screenForm.hidden = true;
    screenCreated.hidden = false;
    createdLine.textContent = 'Голосование создано. id: ' + poll.id;
  } catch (error) {
    showMessage('Не удалось создать голосование. Проверьте интернет и нажмите «Создать» ещё раз.');
    setLoading(false);
  }
}

optionFields.forEach(function (field) {
  field.addEventListener('input', function () {
    field.classList.remove('invalid');
    autoGrow(field);
  });
});

createButton.addEventListener('click', onCreateClick);
