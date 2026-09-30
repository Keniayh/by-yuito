/* Vistas: genera las tarjetas de categorías y del catálogo desde Yuito.data */
window.Yuito = window.Yuito || {};
(function (Y) {
  function categoryCard(c) {
    return '<article class="card cat" style="--cb:' + c.bg + ';--r:' + c.rot + 'deg">' +
      '<span class="ico">' + c.icon + '</span><h3>' + c.title + '</h3><p>' + c.text + '</p></article>';
  }
  function productCard(p) {
    var media = p.image
      ? '<div class="ph"><img src="' + p.image + '" alt="' + p.alt + '" loading="lazy"></div>'
      : '<div class="ph ball"><svg aria-hidden="true"><use href="#ballsym"/></svg></div>';
    return '<article class="card" style="--cb:' + p.bg + ';--r:' + p.rot + 'deg">' + media +
      '<h3>' + p.name + '</h3><p>' + p.text + '</p>' +
      '<a class="btn sm wa" href="#" data-msg="' + p.msg + '">' + p.cta + '</a></article>';
  }
  Y.catalog = {
    render: function () {
      document.getElementById('category-grid').innerHTML = Y.data.categories.map(categoryCard).join('');
      document.getElementById('product-grid').innerHTML = Y.data.products.map(productCard).join('');
      Y.tilt.bind(document.querySelectorAll('.card'));
    }
  };
})(window.Yuito);
