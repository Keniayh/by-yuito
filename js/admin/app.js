/* Panel · arranque, inicio de sesión y navegación */
window.Yuito = window.Yuito || {};
(function (Y) {
  var el = Y.dom.el, A = Y.adminApi, U = Y.ui, shell, main, current = 'productos';
  var TABS = [['productos', 'Productos', 'viewProducts'], ['categorias', 'Categorías', 'viewCategories'], ['respaldo', 'Respaldo', 'viewBackup']];

  function show(node) { Y.dom.clear(main); main.appendChild(node); }
  function setShell(on) { shell.hidden = !on; }

  function setup() {
    setShell(false);
    show(el('section', { class: 'card-panel' }, [el('h1', { text: 'Falta configurar Supabase' }),
      el('p', { text: 'Este panel necesita la URL del proyecto y la clave pública en js/config.js. Siga los pasos de docs/ADMIN-SETUP.md.' })]));
  }

  function login(msg) {
    setShell(false);
    var email = el('input', { id: 'l-email', type: 'email', autocomplete: 'username', required: true, inputmode: 'email' });
    var pass = el('input', { id: 'l-pass', type: 'password', autocomplete: 'current-password', required: true });
    var err = el('p', { class: 'err', role: 'alert', hidden: !msg, text: msg || '' }), go = el('button', { type: 'submit', class: 'btn', text: 'Ingresar' });
    var form = el('form', { class: 'form card-panel', novalidate: true }, [el('h1', { text: 'Administración' }), el('p', { class: 'sub', text: 'Acceso exclusivo de la dueña de Yüito.' }),
      U.field('l-email', 'Correo', email), U.field('l-pass', 'Contraseña', pass), err, go]);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault(); err.hidden = true;
      if (!email.value.trim() || !pass.value) { err.textContent = 'Escriba su correo y su contraseña.'; err.hidden = false; return; }
      U.busy(go, true, 'Ingresando…');
      A.signIn(email.value.trim(), pass.value).then(function () { return enter(); }).catch(function (e) { U.busy(go, false); pass.value = ''; err.textContent = e.message; err.hidden = false; });
    });
    show(form); email.focus();
  }

  function tabs() {
    var nav = document.getElementById('tabs'); Y.dom.clear(nav);
    TABS.forEach(function (t) {
      nav.appendChild(el('button', { type: 'button', class: 'tab', 'aria-current': t[0] === current ? 'page' : 'false', text: t[1], onclick: function () { go(t[0]); } }));
    });
  }
  function go(id) {
    current = id; tabs(); var host = el('section', { id: 'view', 'data-view': id }); show(host);
    var t = TABS.filter(function (x) { return x[0] === id; })[0]; Y[t[2]].mount(host);
  }

  function enter() {
    return A.isAdmin().then(function (ok) {
      if (!ok) return A.signOut().then(function () { login('Esta cuenta no tiene permiso de administración.'); });
      setShell(true); go(current);
    });
  }

  Y.adminApp = {
    start: function () {
      shell = document.getElementById('shell'); main = document.getElementById('main');
      document.getElementById('logout').addEventListener('click', function () { A.signOut().then(function () { login(); }); });
      if (!A.init()) return setup();
      A.onAuth(function (ev) { if (ev === 'SIGNED_OUT') login(); });
      A.session().then(function (s) { return s ? enter() : login(); }).catch(function (e) { login(e.message); });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Y.adminApp.start); else Y.adminApp.start();
})(window.Yuito);
