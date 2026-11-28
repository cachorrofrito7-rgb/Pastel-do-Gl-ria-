const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'db.json');

const ADMIN_USER = process.env.ADMIN_USER || 'gloria';
const ADMIN_PASS = process.env.ADMIN_PASS || 'pastelgloria2026';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'troque-esta-chave-secreta-em-producao';

// Origem de referência em Porto Alegre (Glória) caso não haja coordenadas exatas
const DEFAULT_ORIGIN = {
  lat: -30.0565,
  lng: -51.2312,
  label: 'Glória, Porto Alegre - RS'
};

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const DEFAULT_DB = {
  loja: {
    nome: 'Pastel do Glória',
    cidade: 'Porto Alegre - RS',
    bairro: 'Glória',
    whatsapp: '5551999999999',
    origemLat: DEFAULT_ORIGIN.lat,
    origemLng: DEFAULT_ORIGIN.lng,
    raioMaximoKm: 5,
    mensagemAberta: 'Aberto para pedidos'
  },
  faixasEntrega: [
    { ateKm: 1, taxa: 5.0 },
    { ateKm: 2, taxa: 7.0 },
    { ateKm: 3, taxa: 9.0 },
    { ateKm: 4, taxa: 11.0 },
    { ateKm: 5, taxa: 13.0 }
  ],
  produtos: [
    {
      id: 'pastel-carne-panela',
      nome: 'Carne de Panela',
      categoria: 'Tradicionais',
      descricao: 'Carne desfiada bem temperada no ponto certo.',
      imagem: 'carne-panela.jpg',
      ativo: true,
      tamanhos: {
        medio: 14.0,
        big: 19.0
      }
    },
    {
      id: 'pastel-camarao-especial',
      nome: 'Camarão Especial',
      categoria: 'Especiais',
      descricao: 'Camarão refogado cremoso com tempero da casa.',
      imagem: 'camarao-especial.jpeg',
      ativo: true,
      tamanhos: {
        medio: 18.0,
        big: 24.0
      }
    },
    {
      id: 'pastel-queijo-presunto',
      nome: 'Queijo e Presunto',
      categoria: 'Tradicionais',
      descricao: 'Clássico crocante com queijo derretido e presunto.',
      imagem: 'queijo-presunto.jpg',
      ativo: true,
      tamanhos: {
        medio: 13.0,
        big: 18.0
      }
    }
  ]
};

function loadDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf8');
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      loja: { ...DEFAULT_DB.loja, ...(parsed.loja || {}) },
      faixasEntrega: Array.isArray(parsed.faixasEntrega) ? parsed.faixasEntrega : DEFAULT_DB.faixasEntrega,
      produtos: Array.isArray(parsed.produtos) ? parsed.produtos : DEFAULT_DB.produtos
    };
  } catch (err) {
    console.error('Erro ao ler db.json, usando padrão em memória:', err.message);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function saveDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar db.json:', err.message);
  }
}

let state = loadDb();

function signToken(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const session = verifyToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado. Faça login novamente.' });
  }
  req.admin = session;
  next();
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function geocodeEnderecoPortoAlegre(endereco) {
  const query = `${endereco}, Porto Alegre, Rio Grande do Sul, Brasil`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PastelDoGloriaApp/1.0 (contato@pasteldogloria.local)',
      'Accept-Language': 'pt-BR'
    }
  });

  if (!response.ok) {
    throw new Error('Falha ao consultar serviço de geocodificação.');
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name
  };
}

function calcularTaxaPorDistancia(distanciaKm, faixas, raioMax = 5) {
  const ordenadas = [...faixas]
    .map((f) => ({ ateKm: Number(f.ateKm), taxa: Number(f.taxa) }))
    .filter((f) => !Number.isNaN(f.ateKm) && !Number.isNaN(f.taxa))
    .sort((a, b) => a.ateKm - b.ateKm);

  const limite = Number(raioMax) || 5;
  if (distanciaKm > limite) {
    return { foraDoRaio: true, limiteKm: limite, taxa: null };
  }

  for (const faixa of ordenadas) {
    if (distanciaKm <= faixa.ateKm) {
      return { foraDoRaio: false, limiteKm: limite, taxa: faixa.taxa, faixaAteKm: faixa.ateKm };
    }
  }

  const ultima = ordenadas[ordenadas.length - 1];
  return {
    foraDoRaio: false,
    limiteKm: limite,
    taxa: ultima ? ultima.taxa : 13.0,
    faixaAteKm: ultima ? ultima.ateKm : limite
  };
}

function slugifyId(nome) {
  return (
    String(nome || 'item')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    Date.now().toString().slice(-4)
  );
}

// Health check
app.get('/', (req, res) => {
  res.json({
    ok: true,
    servico: 'Pastel do Glória API',
    status: 'online'
  });
});

// Vitrine: retorna apenas itens ativos + dados públicos da loja e faixas
app.get('/api/cardapio', (req, res) => {
  const produtosAtivos = state.produtos.filter((p) => Boolean(p.ativo));
  res.json({
    loja: state.loja,
    faixasEntrega: state.faixasEntrega,
    produtos: produtosAtivos
  });
});

// Cálculo de entrega até 5 km (aceita endereco OU lat/lng)
app.post('/api/entrega/calcular', async (req, res) => {
  try {
    const { endereco, lat, lng } = req.body || {};
    const origemLat = Number(state.loja.origemLat ?? DEFAULT_ORIGIN.lat);
    const origemLng = Number(state.loja.origemLng ?? DEFAULT_ORIGIN.lng);
    const raioMax = Number(state.loja.raioMaximoKm ?? 5);

    let destinoLat = Number(lat);
    let destinoLng = Number(lng);
    let enderecoEncontrado = endereco ? String(endereco).trim() : '';

    if (Number.isNaN(destinoLat) || Number.isNaN(destinoLng)) {
      if (!enderecoEncontrado) {
        return res.status(400).json({ error: 'Informe o endereço ou coordenadas para calcular a entrega.' });
      }
      const geo = await geocodeEnderecoPortoAlegre(enderecoEncontrado);
      if (!geo) {
        return res.status(404).json({
          error: 'Endereço não encontrado em Porto Alegre. Tente incluir rua, número e bairro.'
        });
      }
      destinoLat = geo.lat;
      destinoLng = geo.lng;
      enderecoEncontrado = geo.displayName;
    }

    const distanciaBruta = haversineKm(origemLat, origemLng, destinoLat, destinoLng);
    const distanciaKm = Number(distanciaBruta.toFixed(2));
    const calculo = calcularTaxaPorDistancia(distanciaKm, state.faixasEntrega, raioMax);

    if (calculo.foraDoRaio) {
      return res.json({
        disponivel: false,
        distanciaKm,
        raioMaximoKm: raioMax,
        taxa: null,
        endereco: enderecoEncontrado,
        mensagem: `Entrega disponível apenas até ${raioMax} km da Glória (distância calculada: ${distanciaKm} km).`
      });
    }

    return res.json({
      disponivel: true,
      distanciaKm,
      raioMaximoKm: raioMax,
      faixaAteKm: calculo.faixaAteKm,
      taxa: Number(calculo.taxa.toFixed(2)),
      endereco: enderecoEncontrado
    });
  } catch (err) {
    console.error('Erro em /api/entrega/calcular:', err);
    return res.status(500).json({ error: 'Erro interno ao calcular a entrega.' });
  }
});

// Autenticação do painel admin
app.post('/api/auth/login', (req, res) => {
  const { usuario, senha } = req.body || {};
  if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
    const token = signToken({
      sub: usuario,
      role: 'admin',
      exp: Date.now() + 1000 * 60 * 60 * 24
    });
    return res.json({ token, usuario });
  }
  return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
});

// Admin: lista todos os produtos (ativos e pausados)
app.get('/api/admin/produtos', requireAdmin, (req, res) => {
  res.json({
    loja: state.loja,
    faixasEntrega: state.faixasEntrega,
    produtos: state.produtos
  });
});

// Admin: criar novo produto
app.post('/api/admin/produtos', requireAdmin, (req, res) => {
  const body = req.body || {};
  if (!body.nome || !String(body.nome).trim()) {
    return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
  }

  const precoMedio = Number(body.tamanhos?.medio ?? body.precoMedio ?? 14);
  const precoBig = Number(body.tamanhos?.big ?? body.precoBig ?? 19);

  const novoProduto = {
    id: body.id ? String(body.id).trim() : slugifyId(body.nome),
    nome: String(body.nome).trim(),
    categoria: String(body.categoria || 'Tradicionais').trim(),
    descricao: String(body.descricao || '').trim(),
    imagem: String(body.imagem || 'carne-panela.jpg').trim(),
    ativo: body.ativo !== undefined ? Boolean(body.ativo) : true,
    tamanhos: {
      medio: Number.isNaN(precoMedio) ? 14 : Number(precoMedio.toFixed(2)),
      big: Number.isNaN(precoBig) ? 19 : Number(precoBig.toFixed(2))
    }
  };

  state.produtos.push(novoProduto);
  saveDb(state);
  return res.status(201).json({ produto: novoProduto });
});

// Admin: editar produto (nome, descrição, imagem, ativo, tamanhos Médio/Big)
app.put('/api/admin/produtos/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const idx = state.produtos.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  const atual = state.produtos[idx];
  const body = req.body || {};

  const medio = body.tamanhos?.medio !== undefined ? Number(body.tamanhos.medio) : atual.tamanhos?.medio;
  const big = body.tamanhos?.big !== undefined ? Number(body.tamanhos.big) : atual.tamanhos?.big;

  const atualizado = {
    ...atual,
    nome: body.nome !== undefined ? String(body.nome).trim() : atual.nome,
    categoria: body.categoria !== undefined ? String(body.categoria).trim() : atual.categoria,
    descricao: body.descricao !== undefined ? String(body.descricao).trim() : atual.descricao,
    imagem: body.imagem !== undefined ? String(body.imagem).trim() : atual.imagem,
    ativo: body.ativo !== undefined ? Boolean(body.ativo) : atual.ativo,
    tamanhos: {
      medio: !Number.isNaN(medio) ? Number(medio.toFixed(2)) : 14,
      big: !Number.isNaN(big) ? Number(big.toFixed(2)) : 19
    }
  };

  state.produtos[idx] = atualizado;
  saveDb(state);
  return res.json({ produto: atualizado });
});

// Admin: pausar / ativar item rapidamente
app.patch('/api/admin/produtos/:id/toggle', requireAdmin, (req, res) => {
  const { id } = req.params;
  const produto = state.produtos.find((p) => p.id === id);
  if (!produto) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  if (req.body && typeof req.body.ativo === 'boolean') {
    produto.ativo = req.body.ativo;
  } else {
    produto.ativo = !produto.ativo;
  }

  saveDb(state);
  return res.json({ produto });
});

// Admin: excluir produto
app.delete('/api/admin/produtos/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const antes = state.produtos.length;
  state.produtos = state.produtos.filter((p) => p.id !== id);
  if (state.produtos.length === antes) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }
  saveDb(state);
  return res.json({ ok: true, id });
});

// Admin: atualizar faixas de entrega até 5 km
app.put('/api/admin/entrega', requireAdmin, (req, res) => {
  const { faixasEntrega, raioMaximoKm } = req.body || {};
  if (!Array.isArray(faixasEntrega) || faixasEntrega.length === 0) {
    return res.status(400).json({ error: 'Envie uma lista válida em faixasEntrega.' });
  }

  const normalizadas = faixasEntrega
    .map((f) => ({
      ateKm: Number(f.ateKm),
      taxa: Number(f.taxa)
    }))
    .filter((f) => !Number.isNaN(f.ateKm) && !Number.isNaN(f.taxa) && f.ateKm > 0 && f.taxa >= 0)
    .sort((a, b) => a.ateKm - b.ateKm);

  if (normalizadas.length === 0) {
    return res.status(400).json({ error: 'Nenhuma faixa válida encontrada.' });
  }

  state.faixasEntrega = normalizadas.map((f) => ({
    ateKm: f.ateKm,
    taxa: Number(f.taxa.toFixed(2))
  }));

  if (raioMaximoKm !== undefined && !Number.isNaN(Number(raioMaximoKm))) {
    state.loja.raioMaximoKm = Number(raioMaximoKm);
  }

  saveDb(state);
  return res.json({
    faixasEntrega: state.faixasEntrega,
    raioMaximoKm: state.loja.raioMaximoKm
  });
});

// Admin: atualizar configurações básicas da loja
app.put('/api/admin/loja', requireAdmin, (req, res) => {
  const body = req.body || {};
  state.loja = {
    ...state.loja,
    ...(body.nome !== undefined ? { nome: String(body.nome).trim() } : {}),
    ...(body.whatsapp !== undefined ? { whatsapp: String(body.whatsapp).replace(/\D/g, '') } : {}),
    ...(body.mensagemAberta !== undefined ? { mensagemAberta: String(body.mensagemAberta).trim() } : {}),
    ...(body.origemLat !== undefined && !Number.isNaN(Number(body.origemLat))
      ? { origemLat: Number(body.origemLat) }
      : {}),
    ...(body.origemLng !== undefined && !Number.isNaN(Number(body.origemLng))
      ? { origemLng: Number(body.origemLng) }
      : {})
  };
  saveDb(state);
  return res.json({ loja: state.loja });
});

app.listen(PORT, () => {
  console.log(`Backend Pastel do Glória rodando na porta ${PORT}`);
});
