import { el } from './dom.js';

export function CourseItem({ id, title, onOpen, onDelete }) {
  return el('li', { class: 'session-item' }, [
    el('div', { class: 'session-main' }, [
      el('div', { class: 'session-title' }, title || '(cours sans titre)'),
    ]),
    el('div', { class: 'actions session-actions' }, [
      el('button', {
        class: 'btn',
        onclick: () => onOpen(id)
      }, '📂 Ouvrir'),
      el('button', {
        class: 'btn btn-danger',
        onclick: () => onDelete(id)
      }, '🗑️ Supprimer')
    ])
  ]);
}

export function SessionItem({ id, title, wordsCount, statsLabel, onDelete, onExport }) {
  const wordsText = `${wordsCount || 0} mot${wordsCount > 1 ? 's' : ''}`;

  return el('li', { class: 'session-item' }, [
    el('div', { class: 'session-main' }, [
      el('div', { class: 'session-title' }, title || '(sans titre)'),
      el('div', { class: 'session-meta' }, [
        el('span', { class: 'session-pill session-pill-count' }, wordsText),
        statsLabel
          ? el('span', { class: 'session-pill session-pill-stats' }, statsLabel)
          : el('span', { class: 'session-pill session-pill-stats muted' }, 'Pas encore de stats')
      ])
    ]),
    el('div', { class: 'actions session-actions' }, [
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
