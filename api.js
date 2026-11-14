// api.js — все запросы к Supabase живут в этом файле.

// Общая функция: отправляет запрос в Supabase и возвращает ответ.
// Если Supabase ответил ошибкой или нет связи, функция выбрасывает ошибку.
async function apiRequest(path, options = {}) {
  const response = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error('Supabase ответил ошибкой ' + response.status);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Читает голосования из таблицы polls. Пока нужны только их id.
async function getPolls() {
  return apiRequest('polls?select=id');
}

// Создаёт новое голосование (status станет open сам) и возвращает созданную строку с её id.
async function createPoll(option1, option2, option3) {
  const rows = await apiRequest('polls', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      option_1: option1,
      option_2: option2,
      option_3: option3
    })
  });
  return rows[0];
}

// Код голосования выглядит как UUID: 8-4-4-4-12 символов (буквы a-f и цифры)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Читает одно голосование по его id. Если такого нет (или id испорчен), возвращает null.
async function getPoll(pollId) {
  if (!UUID_PATTERN.test(pollId)) {
    return null;
  }
  const rows = await apiRequest(
    'polls?id=eq.' + pollId + '&select=id,option_1,option_2,option_3,status'
  );
  return rows.length > 0 ? rows[0] : null;
}
