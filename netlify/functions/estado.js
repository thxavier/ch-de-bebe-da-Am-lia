const { getStore } = require("@netlify/blobs");

const LIMITES = { RN: 3, P: 12, M: 15, G: 10 };
const TAMANHOS = Object.keys(LIMITES);

exports.handler = async (event) => {
  const store = getStore("cha-amelia");

  if (event.httpMethod === "GET") {
    const estado = await obterEstado(store);
    return resposta(200, { ok: true, estado: estado });
  }

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const nome = String(body.nome || "").trim();
      const tamanho = String(body.tamanho || "").trim();

      if (!nome || nome.length < 2 || TAMANHOS.indexOf(tamanho) === -1) {
        return resposta(400, { ok: false, erro: "dados_invalidos" });
      }

      const estadoAtual = await obterEstado(store);

      if (estadoAtual.contagem[tamanho] >= LIMITES[tamanho]) {
        return resposta(200, { ok: false, erro: "esgotado", estado: estadoAtual });
      }

      const registro = {
        nome: nome,
        item: tamanho,
        horario: new Date().toISOString()
      };

      const novosConfirmados = estadoAtual.confirmados.concat([registro]);
      await store.setJSON("confirmados", novosConfirmados);

      const estadoAtualizado = calcularEstado(novosConfirmados);
      return resposta(200, { ok: true, estado: estadoAtualizado, registro: registro });
    } catch (erro) {
      return resposta(500, { ok: false, erro: "erro_interno", detalhe: String(erro) });
    }
  }

  return resposta(405, { ok: false, erro: "metodo_nao_permitido" });
};

async function obterEstado(store) {
  const confirmados = (await store.get("confirmados", { type: "json" })) || [];
  return calcularEstado(confirmados);
}

function calcularEstado(confirmados) {
  const contagem = { RN: 0, P: 0, M: 0, G: 0 };
  for (const c of confirmados) {
    if (contagem.hasOwnProperty(c.item)) {
      contagem[c.item]++;
    }
  }
  return { contagem: contagem, confirmados: confirmados };
}

function resposta(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  };
}
