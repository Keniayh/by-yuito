/* Ayudas de interfaz del panel: avisos, confirmaciones y estados de carga. */
window.Yuito = window.Yuito || {};
(function (Y) {
  var el = Y.dom.el, timer;
  Y.ui = {
    toast: function (text, kind) {
      var t = document.getElementById('toast'); t.textContent = text; t.className = 'toast show ' + (kind || 'ok');
      clearTimeout(timer); timer = setTimeout(function () { t.className = 'toast'; }, kind === 'error' ? 8000 : 3500);
    },
    confirm: function (title, text, okLabel) {
      return new Promise(function (resolve) {
        var d = document.getElementById('dlg-confirm'); d.textContent = '';
        var form = el('form', { method: 'dialog', class: 'dlg-body' }, [
          el('h2', { text: title }), el('p', { text: text }),
          el('div', { class: 'row end' }, [
            el('button', { class: 'btn alt sm', value: 'no', text: 'Cancelar' }),
            el('button', { class: 'btn sm danger', value: 'si', text: okLabel || 'Aceptar' })])]);
        d.appendChild(form);
        d.onclose = function () { resolve(d.returnValue === 'si'); };
        d.returnValue = 'no'; d.showModal();
      });
    },
    busy: function (btn, on, label) {
      if (on) { btn.dataset.label = btn.textContent; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = label || 'Procesando…'; }
      else { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = btn.dataset.label || btn.textContent; }
    },
    field: function (id, label, control, hint) {
      return el('div', { class: 'fld' }, [el('label', { for: id, text: label }), control, hint ? el('p', { class: 'hint left', id: id + '-h', text: hint }) : null]);
    },
    swatch: function (node, color) { if (color) node.style.setProperty('--sw', color); else node.style.removeProperty('--sw'); }
  };
})(window.Yuito);
