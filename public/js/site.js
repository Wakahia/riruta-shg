(function () {
  // Ask before deleting
  document.addEventListener('submit', function (e) {
    var m = e.target && e.target.getAttribute && e.target.getAttribute('data-confirm');
    if (m && !window.confirm(m)) e.preventDefault();
  });

  // Loan calculator (Loans page)
  var a = document.getElementById('amt'), s = document.getElementById('sav'), o = document.getElementById('out');
  if (!a || !s || !o) return;
  function money(n) { return 'Ksh ' + Math.round(n).toLocaleString('en-KE'); }
  function update() {
    var x = parseFloat(a.value), v = parseFloat(s.value), parts = [];
    if (a.value !== '' && x >= 0) {
      var y = x < 50000 ? 2 : x < 300000 ? 3 : x < 500000 ? 4 : x < 1000000 ? 5 : x < 3000000 ? 7 : 8;
      parts.push('A loan of ' + money(x) + ' is repaid over up to ' + y + ' years.');
    }
    if (s.value !== '' && v >= 0) {
      parts.push('With ' + money(v) + ' saved you can self-guarantee up to ' + money(v * 0.95) + ', or borrow up to ' + money(v * 5) + ' with guarantors.');
    }
    o.textContent = parts.length ? parts.join(' ') : 'Your results will appear here.';
  }
  a.addEventListener('input', update);
  s.addEventListener('input', update);
})();
