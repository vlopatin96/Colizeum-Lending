/* COLIZEUM бэк-офис: чёрный список номеров. Номера из него не попадают ни в одну рассылку. */
(function () {
  var A = window.A, $ = A.$, esc = A.esc, KEY = "clz_black";
  var list = A.load(KEY, null);
  if (!list) { list = [{ phone: "375291230000", note: "Пример: попросил не писать", added: Date.now() - 5 * 864e5, example: true }]; A.save(KEY, list); }
  var fmt = function (p) { return /^375/.test(p) ? "+375 " + p.slice(3, 5) + " " + p.slice(5, 8) + "-" + p.slice(8, 10) + "-" + p.slice(10) : "+" + p; };

  A.black = {
    has: function (phone) { return list.some(function (x) { return x.phone === phone; }); },
    add: function (phone, note) { if (A.black.has(phone)) return false; list.unshift({ phone: phone, note: note || "", added: Date.now() }); A.save(KEY, list); render(); return true; },
    count: function () { return list.length; }
  };

  function render() {
    $("#cnt-black").textContent = list.length;
    var q = $("#b-search").value.replace(/\D/g, ""), tb = $("#b-rows");
    var rows = list.filter(function (x) { return !q || x.phone.indexOf(q) > -1; });
    tb.innerHTML = rows.length ? rows.map(function (x) {
      return '<tr><td class="mono">' + fmt(x.phone) + (x.example ? '<span class="tagx">пример</span>' : "") + "</td><td>" + (esc(x.note) || '<span class="muted">—</span>') + "</td><td>" + A.fmtDT(x.added) + '</td><td><button class="btn sm danger" data-p="' + x.phone + '">Убрать</button></td></tr>';
    }).join("") : '<tr><td colspan="4"><div class="empty"><b>' + (list.length ? "Ничего не найдено" : "Список пуст") + "</b>" + (list.length ? "" : "Добавьте номера слева.") + "</div></td></tr>";
  }
  $("#b-search").addEventListener("input", render);
  $("#b-rows").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    A.confirmBtn(b, "Точно убрать?", function () { list = list.filter(function (x) { return x.phone !== b.dataset.p; }); A.save(KEY, list); render(); A.toast("Номер убран из списка"); if (A.hooks.sms) A.hooks.sms(); });
  });
  $("#b-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var parts = $("#b-phones").value.split(/[\n,;]+/).map(function (t) { return t.trim(); }).filter(Boolean), added = 0, dup = 0, bad = [];
    parts.forEach(function (t) {
      var n = A.normPhone(t);
      if (!n.ok) { bad.push(t + " — " + n.reason); return; }
      if (A.black.add(n.phone, $("#b-note").value.trim())) added++; else dup++;
    });
    var err = $("#b-err"); err.hidden = !bad.length; err.innerHTML = bad.length ? "<b>Не добавлены:</b><br>" + bad.map(esc).join("<br>") : "";
    if (!parts.length) { err.hidden = false; err.textContent = "Введите хотя бы один номер."; return; }
    if (added) { $("#b-phones").value = bad.length ? bad.map(function (x) { return x.split(" — ")[0]; }).join("\n") : ""; $("#b-note").value = ""; }
    A.toast(added ? "Добавлено номеров: " + added + (dup ? ", уже были: " + dup : "") : (dup ? "Эти номера уже в списке" : "Ничего не добавлено"), !added);
    if (A.hooks.sms) A.hooks.sms();
  });
  A.hooks.black = render; render();
})();
