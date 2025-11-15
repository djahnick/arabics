// Gestion utilisateur côté client

export function getCurrentUser() {
  try {
    return localStorage.getItem('currentUser');
  } catch {
    return null;
  }
}

export function setCurrentUser(pseudo) {
  try {
    localStorage.setItem('currentUser', pseudo);
  } catch {
    // ignore
  }
}

export function clearCurrentUser() {
  try {
    localStorage.removeItem('currentUser');
  } catch {
    // ignore
  }
}

// Redirige vers login si pas connecté (à utiliser sur les pages protégées)
export function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = './login.html';
    throw new Error('Not authenticated');
  }
  return user;
}

// Hash SHA-256 du mot de passe
export async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
