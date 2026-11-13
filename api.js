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
