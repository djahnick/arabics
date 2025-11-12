export const qs = (s, el=document) => el.querySelector(s);
export function el(tag, attrs={}, children=[]) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if (k === 'class') n.className = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  });
  (Array.isArray(children)?children:[children]).forEach(c=>n.append(c?.nodeType?c:document.createTextNode(c)));
  return n;
}
export const toast = (m)=> alert(m);
