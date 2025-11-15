import { hashPassword, setCurrentUser, getCurrentUser } from './auth.js';
import { getUser } from './services/users.js';
import { qs, toast } from './ui/dom.js';

// Si déjà connecté -> aller sur l'accueil
const already = getCurrentUser();
if (already) {
  window.location.href = './';
}

const form = document.getElementById('login-form');
const pseudoEl = qs('#pseudo');
const passwordEl = qs('#password');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pseudo = pseudoEl.value.trim();
  const password = passwordEl.value;

  if (!pseudo || !password) {
    toast('Pseudo et mot de passe requis.');
    return;
  }

  try {
    const user = await getUser(pseudo);
    if (!user) {
      toast('Utilisateur inconnu.');
      return;
    }
    const hash = await hashPassword(password);
    if (user.passwordHash !== hash) {
      toast('Mot de passe incorrect.');
      return;
    }
    setCurrentUser(pseudo);
    window.location.href = './';
  } catch (err) {
    console.error(err);
    toast("Erreur lors de la connexion.");
  }
});
