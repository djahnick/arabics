import { hashPassword, setCurrentUser, getCurrentUser } from './auth.js';
import { getUser, createUser } from './services/users.js';
import { qs, toast } from './ui/dom.js';

// Si déjà connecté -> aller sur l'accueil
const already = getCurrentUser();
if (already) {
  window.location.href = './';
}

const form = document.getElementById('register-form');
const pseudoEl = qs('#reg-pseudo');
const pass1El = qs('#reg-password');
const pass2El = qs('#reg-password2');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pseudo = pseudoEl.value.trim();
  const p1 = pass1El.value;
  const p2 = pass2El.value;

  if (!pseudo || !p1 || !p2) {
    toast('Tous les champs sont obligatoires.');
    return;
  }
  if (p1 !== p2) {
    toast('Les mots de passe ne correspondent pas.');
    return;
  }
  if (p1.length < 4) {
    toast('Mot de passe trop court (min 4 caractères).');
    return;
  }

  try {
    const existing = await getUser(pseudo);
    if (existing) {
      toast('Ce pseudo est déjà pris.');
      return;
    }
    const hash = await hashPassword(p1);
    await createUser({ pseudo, passwordHash: hash });
    setCurrentUser(pseudo);
    toast('Compte créé ✔️');
    window.location.href = './';
  } catch (err) {
    console.error(err);
    toast("Erreur lors de la création du compte.");
  }
});
