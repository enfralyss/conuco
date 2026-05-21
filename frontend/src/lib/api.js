const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getHeaders() {
  const token = localStorage.getItem('conuco_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
  });

  if (res.status === 401) {
    localStorage.removeItem('conuco_token');
    localStorage.removeItem('conuco_user');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`);
  return data;
}

export const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, body)   => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),
};
