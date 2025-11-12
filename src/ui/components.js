import { el } from './dom.js';

export function SessionItem({ id, title, wordsCount, onDelete, onExport }) {
  return el('li', { class: 'session-item' }, [
    el('div', {}, `${title} (${wordsCount} mot(s))`),
    el('div', { class: 'actions' }, [
      // Redirection RELATIVE (OK local + GitHub Pages)
      el('button', {
        class: 'btn',
        onclick: () => {
          try { localStorage.setItem('lastSessionId', id); } catch {}
          window.location.href = `game.html?session=${id}`;
        }
      }, '▶️ Jouer'),
      el('button', { class: 'btn', onclick: () => onExport(id) }, '💾 Exporter'),
      el('button', { class: 'btn btn-danger', onclick: () => onDelete(id) }, '🗑️ Supprimer')
    ])
  ]);
}
