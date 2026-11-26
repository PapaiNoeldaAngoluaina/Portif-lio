/**
 * Camada de dados (CRUD) sobre LocalStorage, armazenando JSON.
 * No primeiro acesso (storage vazio) injeta 20 registros de teste.
 */
const Store = (() => {
  const KEY = CONFIG.STORAGE_KEY;
  let memory = null; // fallback se o LocalStorage estiver bloqueado

  const read = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) return null;
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : null;
    } catch (e) { return memory; }
  };
  const write = (list) => {
    memory = list;
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* modo privado/cheio */ }
  };

  const NOMES = ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Alves", "Elisa Rocha", "Felipe Costa", "Gabriela Nunes", "Henrique Dias", "Isabela Martins", "João Pereira",
                 "Karen Oliveira", "Lucas Ribeiro", "Marina Teixeira", "Nicolas Barros", "Olívia Castro", "Paulo Gomes", "Quésia Freitas", "Rafael Moura", "Sofia Cardoso", "Thiago Araújo"];
  const ASSUNTOS = ["Proposta de estágio", "Dúvida sobre projeto", "Convite para entrevista", "Parceria em projeto", "Feedback do portfólio"];
  const TEXTOS = [
    "Gostei muito do seu portfólio e gostaria de conversar sobre uma oportunidade.",
    "Poderia explicar como foi feita a integração do formulário com a automação?",
    "Temos uma vaga de desenvolvedor Frontend júnior e gostaríamos de conhecer você.",
    "Vi seu repositório no GitHub e tenho interesse em colaborar em um projeto open source.",
    "Parabéns pelo design responsivo! Funciona muito bem no meu celular."
  ];

  function seedData() {
    const base = Date.now();
    return NOMES.map((nome, i) => ({
      id: i + 1,
      nome,
      email: nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".") + "@exemplo.com",
      assunto: ASSUNTOS[i % ASSUNTOS.length],
      mensagem: TEXTOS[i % TEXTOS.length],
      data: new Date(base - i * 86400000 * 1.5).toISOString(),
      status: i % 3 === 0 ? "novo" : "lido",
      envio: "seed"
    }));
  }

  // Verificação de primeiro acesso: vazio => injeta 20 registros
  function init() {
    const list = read();
    if (list === null || list.length === 0) write(seedData());
  }

  const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id), 0) + 1;

  return {
    init,
    // READ
    all() { return (read() || []).slice().sort((a, b) => new Date(b.data) - new Date(a.data)); },
    get(id) { return (read() || []).find(x => x.id === Number(id)) || null; },
    // CREATE
    create(msg) {
      const list = read() || [];
      const item = { id: nextId(list), data: new Date().toISOString(), status: "novo", envio: "pendente", ...msg };
      list.push(item); write(list); return item;
    },
    // UPDATE
    update(id, patch) {
      const list = read() || [];
      const i = list.findIndex(x => x.id === Number(id));
      if (i < 0) return null;
      list[i] = { ...list[i], ...patch, id: list[i].id };
      write(list); return list[i];
    },
    // DELETE
    remove(id) { write((read() || []).filter(x => x.id !== Number(id))); },
    clear() { write([]); },
    resetSeed() { write(seedData()); }
  };
})();

Store.init();
