/**
 * Painel administrativo oculto (CRUD das mensagens).
 * Acesso: URL com #admin  |  ou clicar 5x no "©" do rodapé  |  ou Ctrl+Shift+A.
 * Protegido por PIN (config.js). Proteção apenas no cliente: não é segurança real.
 */
const Admin = (() => {
  const panel = document.getElementById("admin");
  const body = document.getElementById("adminBody");
  const PER_PAGE = 8;
  let page = 1, authed = false;

  const loginModal = new bootstrap.Modal("#adminLogin");
  const msgModal = new bootstrap.Modal("#msgModal");
  const $ = (id) => document.getElementById(id);

  const ENVIO = {
    enviado: ["success", "e-mail enviado"], falhou: ["danger", "falhou"],
    "nao-configurado": ["warning", "sem chave"], pendente: ["secondary", "pendente"], seed: ["info", "teste"]
  };

  function filtered() {
    const q = $("adminSearch").value.trim().toLowerCase();
    const st = $("adminFilter").value;
    return Store.all().filter(m =>
      (!st || m.status === st) &&
      (!q || [m.nome, m.email, m.assunto, m.mensagem].some(v => v.toLowerCase().includes(q))));
  }

  function render() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    page = Math.min(page, pages);
    const slice = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    $("adminCount").textContent = list.length;

    body.innerHTML = slice.length ? slice.map(m => {
      const [cls, label] = ENVIO[m.envio] || ["secondary", m.envio];
      return `<tr>
        <td>${m.id}</td>
        <td class="text-nowrap small">${new Date(m.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
        <td class="truncate">${esc(m.nome)}</td>
        <td class="truncate">${esc(m.email)}</td>
        <td class="truncate" title="${esc(m.mensagem)}">${esc(m.assunto)}</td>
        <td><span class="badge text-bg-${m.status === "novo" ? "primary" : "secondary"}">${esc(m.status)}</span></td>
        <td><span class="badge text-bg-${cls}">${esc(label)}</span></td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-light" data-act="edit" data-id="${m.id}" aria-label="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${m.id}" aria-label="Excluir"><i class="bi bi-trash"></i></button>
        </td></tr>`;
    }).join("") : `<tr><td colspan="8" class="text-center text-secondary py-4">Nenhuma mensagem encontrada.</td></tr>`;

    $("adminPager").innerHTML = Array.from({ length: pages }, (_, i) =>
      `<li class="page-item ${i + 1 === page ? "active" : ""}"><button class="page-link" data-page="${i + 1}">${i + 1}</button></li>`).join("");
  }

  function open() { authed = true; panel.classList.remove("d-none"); document.body.style.overflow = "hidden"; render(); }
  function close() {
    authed = false; panel.classList.add("d-none"); document.body.style.overflow = "";
    if (location.hash === "#admin") history.replaceState(null, "", "#inicio");
  }
  function requestAccess() {
    if (authed) return;
    $("adminPin").value = ""; $("adminPinErr").classList.add("d-none");
    loginModal.show();
    setTimeout(() => $("adminPin").focus(), 300);
  }

  /* ----- acesso ----- */
  $("adminLoginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("adminPin").value === CONFIG.ADMIN_PIN) { loginModal.hide(); open(); }
    else $("adminPinErr").classList.remove("d-none");
  });
  let clicks = 0, timer;
  $("secretLogo").addEventListener("click", () => {
    clearTimeout(timer); timer = setTimeout(() => clicks = 0, 1500);
    if (++clicks >= 5) { clicks = 0; requestAccess(); }
  });
  document.addEventListener("keydown", (e) => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") { e.preventDefault(); requestAccess(); } });
  const checkHash = () => { if (location.hash === "#admin") requestAccess(); };
  window.addEventListener("hashchange", checkHash); checkHash();
  $("btnExit").addEventListener("click", close);

  /* ----- filtros e paginação ----- */
  $("adminSearch").addEventListener("input", () => { page = 1; render(); });
  $("adminFilter").addEventListener("change", () => { page = 1; render(); });
  $("adminPager").addEventListener("click", (e) => { const b = e.target.closest("[data-page]"); if (b) { page = +b.dataset.page; render(); } });

  /* ----- CRUD ----- */
  const fields = { id: "mId", nome: "mNome", email: "mEmail", assunto: "mAssunto", mensagem: "mMensagem", status: "mStatus" };
  function fillForm(m) {
    Object.entries(fields).forEach(([k, id]) => $(id).value = m ? m[k] : (k === "status" ? "novo" : ""));
    $("msgModalTitle").textContent = m ? `Editar mensagem #${m.id}` : "Nova mensagem";
    $("msgForm").classList.remove("was-validated");
    msgModal.show();
  }
  $("btnNew").addEventListener("click", () => fillForm(null));

  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const id = +b.dataset.id;
    if (b.dataset.act === "edit") fillForm(Store.get(id));
    if (b.dataset.act === "del" && confirm(`Excluir a mensagem #${id}?`)) { Store.remove(id); render(); showToast("Mensagem excluída.", "danger"); }
  });

  $("msgForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!e.target.checkValidity()) { e.target.classList.add("was-validated"); return; }
    const data = { nome: $("mNome").value.trim(), email: $("mEmail").value.trim(), assunto: $("mAssunto").value.trim(), mensagem: $("mMensagem").value.trim(), status: $("mStatus").value };
    const id = $("mId").value;
    if (id) { Store.update(id, data); showToast("Mensagem atualizada."); }
    else { Store.create({ ...data, envio: "pendente" }); showToast("Mensagem criada."); }
    msgModal.hide(); render();
  });

  /* ----- utilitários ----- */
  $("btnReset").addEventListener("click", () => { if (confirm("Substituir tudo pelos 20 registros de teste?")) { Store.resetSeed(); page = 1; render(); showToast("20 registros restaurados."); } });
  $("btnClear").addEventListener("click", () => { if (confirm("Apagar TODAS as mensagens? (ao recarregar a página os 20 testes voltam)")) { Store.clear(); render(); showToast("Todas apagadas.", "danger"); } });
  $("btnExport").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(Store.all(), null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "mensagens.json" });
    a.click(); URL.revokeObjectURL(a.href);
  });

  return { render, isOpen: () => authed };
})();
