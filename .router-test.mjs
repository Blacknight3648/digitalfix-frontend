import '@angular/compiler';
import { DefaultUrlSerializer } from '@angular/router';
// state como lo genera MSAL (btoa) y como lo devuelve Entra ID (URL-encoded)
let state;
do {
  state = btoa(JSON.stringify({ id: crypto.randomUUID(), meta: { interactionType: 'redirect' } }));
} while (!state.includes('+'));
const fromMicrosoft = '/#code=abc&client_info=xyz&state=' + encodeURIComponent(state) + '&session_state=s1';
const s = new DefaultUrlSerializer();
const rewritten = s.serialize(s.parse(fromMicrosoft));
const read = (url) => new URLSearchParams(url.split('#')[1]).get('state');
console.log('state guardado por MSAL :', state);
console.log('URL de Microsoft        :', fromMicrosoft);
console.log('URL tras router Angular :', rewritten);
console.log('state leído (original)  :', read(fromMicrosoft), read(fromMicrosoft) === state ? 'OK' : 'MISMATCH');
console.log('state leído (router)    :', read(rewritten), read(rewritten) === state ? 'OK' : 'MISMATCH');
