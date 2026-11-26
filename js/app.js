/** Lógica pública: galeria, formulário de contato, utilitários. */

// Escapa HTML para evitar XSS ao renderizar dados do usuário
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function showToast(msg, type = "success") {
  const el = document.getElementById("appToast");
  el.className = `toast align-items-center border-0 text-bg-${type}`;
  document.getElementById("appToastBody").textContent = msg;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 4000 }).show();
}

document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Galeria de projetos ---------- */
document.getElementById("projectsGrid").innerHTML = PROJECTS.map(p => `
  <div class="col-12 col-md-6 col-lg-4">
    <article class="project-card">
      <img src="${esc(p.imagem)}" alt="Screenshot do ${esc(p.titulo)}" loading="lazy">
      <div class="body">
        <h3 class="h5">${esc(p.titulo)}</h3>
        <p class="text-secondary small">${esc(p.descricao)}</p>
        <div class="d-flex flex-wrap gap-1 mb-3">${p.tecnologias.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        <a class="btn btn-outline-accent btn-sm mt-auto align-self-start" href="${esc(p.repo)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-github me-1"></i>Ver repositório</a>
      </div>
    </article>
  </div>`).join("");

/* ---------- Link ativo no menu ---------- */
const links = [...document.querySelectorAll(".nav-link")];
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id));
  });
}, { rootMargin: "-40% 0px -55% 0px" });
document.querySelectorAll("main section[id]").forEach(s => io.observe(s));
// fecha menu mobile ao clicar
links.forEach(l => l.addEventListener("click", () => {
  const m = document.getElementById("menu");
  if (m.classList.contains("show")) bootstrap.Collapse.getOrCreateInstance(m).hide();
}));

/* ---------- Formulário de contato ---------- */
const form = document.getElementById("contactForm");
const fb = document.getElementById("cFeedback");
const keyConfigured = () => CONFIG.WEB3FORMS_ACCESS_KEY && !CONFIG.WEB3FORMS_ACCESS_KEY.startsWith("COLE_");

async function notifyByEmail(msg) {
  const res = await fetch(CONFIG.WEB3FORMS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: CONFIG.WEB3FORMS_ACCESS_KEY,
      subject: `[Portfólio] ${msg.assunto}`,
      from_name: msg.nome,
      name: msg.nome,
      email: msg.email,
      message: msg.mensagem
    })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || "Falha no envio");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  fb.innerHTML = "";
  if (document.getElementById("cBot").value) return; // honeypot
  if (!form.checkValidity()) { form.classList.add("was-validated"); return; }

  const btn = document.getElementById("cSubmit");
  btn.disabled = true;
  const msg = {
    nome: document.getElementById("cNome").value.trim(),
    email: document.getElementById("cEmail").value.trim(),
    assunto: document.getElementById("cAssunto").value.trim(),
    mensagem: document.getElementById("cMensagem").value.trim()
  };

  // 1) armazenamento local (sempre)
  const saved = Store.create(msg);

  // 2) automação de envio
  let status = "enviado", alert = ["success", "Mensagem enviada! Obrigado pelo contato."];
  if (!keyConfigured()) {
    status = "nao-configurado";
    alert = ["warning", "Mensagem salva localmente, mas a automação de e-mail ainda não foi configurada (js/config.js)."];
  } else {
    try { await notifyByEmail(msg); }
    catch (err) {
      status = "falhou";
      alert = ["warning", "Mensagem salva localmente, mas o envio por e-mail falhou. Tente novamente mais tarde."];
    }
  }
  Store.update(saved.id, { envio: status });

  fb.innerHTML = `<div class="alert alert-${alert[0]} mb-0">${esc(alert[1])}</div>`;
  if (status === "enviado") { form.reset(); form.classList.remove("was-validated"); }
  btn.disabled = false;
  if (typeof Admin !== "undefined" && Admin.isOpen()) Admin.render();
});
