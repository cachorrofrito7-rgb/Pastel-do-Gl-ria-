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
    whatsapp: '5553991312445',
    origemLat: DEFAULT_ORIGIN.lat,
    origemLng: DEFAULT_ORIGIN.lng,
    raioMaximoKm: 5,
    tempoEntrega: 'de 45 minutos a 70 minutos',
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
    // Pastel Tradicional (1 a 13: Médio 20,00 | Big 27,00)
    { id: '1', nome: '1 - Carne com ovo', categoria: 'salgados', descricao: 'Pastel tradicional de carne com ovo.', imagem: 'carne-moida-queijo-ovo.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '2', nome: '2 - Carne, ovo e queijo', categoria: 'salgados', descricao: 'Carne, ovo e queijo.', imagem: 'carne-moida-queijo-ovo.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '3', nome: '3 - Carne completo', categoria: 'salgados', descricao: 'Ovo, azeitonas e queijo.', imagem: 'carne-moida-queijo-ovo.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '4', nome: '4 - Frango com ovo', categoria: 'salgados', descricao: 'Frango com ovo.', imagem: 'frango-catupiry.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '5', nome: '5 - Frango, ovo e queijo', categoria: 'salgados', descricao: 'Frango, ovo e queijo.', imagem: 'frango-catupiry.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '6', nome: '6 - Frango Completo', categoria: 'salgados', descricao: 'Ovo, azeitonas e queijo.', imagem: 'frango-catupiry.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '7', nome: '7 - Frango com queijo mussarela', categoria: 'salgados', descricao: 'Frango com queijo mussarela.', imagem: 'frango-catupiry.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '8', nome: '8 - Frango 2 queijos', categoria: 'salgados', descricao: 'Cheddar e mussarela.', imagem: 'frango-catupiry.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '9', nome: '9 - Calabresa, ovo e queijo', categoria: 'salgados', descricao: 'Calabresa, ovo e queijo.', imagem: 'calabresa-cheddar.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '10', nome: '10 - Calabresa completo', categoria: 'salgados', descricao: 'Ovo, azeitona e queijo.', imagem: 'calabresa-cheddar.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '11', nome: '11 - Calabresa 2 queijos', categoria: 'salgados', descricao: 'Cheddar e mussarela.', imagem: 'calabresa-cheddar.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '12', nome: '12 - Calabresa com cheddar', categoria: 'salgados', descricao: 'Calabresa com cheddar.', imagem: 'calabresa-cheddar.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '13', nome: '13 - Queijo mussarela', categoria: 'salgados', descricao: 'Queijo mussarela.', imagem: 'quatro-queijos.jpg', ativo: true, tamanhos: { medio: 20.00, big: 27.00 } },
    { id: '14', nome: '14 - Palmito com mussarela', categoria: 'salgados', descricao: 'Palmito com mussarela.', imagem: 'quatro-queijos.jpg', ativo: true, tamanhos: { medio: 17.00, big: 24.00 } },

    // Pastéis Especiais Salgados (15 a 28)
    { id: '15', nome: '15 - Carne de panela com mussarela', categoria: 'salgados', descricao: 'Carne de panela com mussarela.', imagem: 'carne-panela.jpg', ativo: true, tamanhos: { medio: 22.00, big: 30.00 } },
    { id: '16', nome: '16 - Carne de panela 2 queijos', categoria: 'salgados', descricao: 'Cheddar e mussarela.', imagem: 'carne-panela.jpg', ativo: true, tamanhos: { medio: 22.00, big: 30.00 } },
    { id: '17', nome: '17 - Carne de panela', categoria: 'salgados', descricao: 'Catupiry e mussarela.', imagem: 'carne-panela.jpg', ativo: true, tamanhos: { medio: 25.00, big: 33.00 } },
    { id: '18', nome: '18 - Alcatra com gorgonzola', categoria: 'salgados', descricao: 'Alcatra com gorgonzola.', imagem: 'carne-panela.jpg', ativo: true, tamanhos: { medio: 32.00, big: 39.00 } },
    { id: '19', nome: '19 - Frango Catupiry', categoria: 'salgados', descricao: 'Frango com Catupiry.', imagem: 'frango-catupiry.jpg', ativo: true, tamanhos: { medio: 23.00, big: 29.00 } },
    { id: '20', nome: '20 - Pizza', categoria: 'salgados', descricao: 'Queijo, tomate e orégano.', imagem: 'quatro-queijos.jpg', ativo: true, tamanhos: { medio: 21.00, big: 27.00 } },
    { id: '21', nome: '21 - 3 queijos', categoria: 'salgados', descricao: 'Mussarela, catupiry, cheddar e oregano.', imagem: 'quatro-queijos.jpg', ativo: true, tamanhos: { medio: 22.00, big: 28.00 } },
    { id: '22', nome: '22 - 4 queijos', categoria: 'salgados', descricao: 'Mussarela, catupiry, cheddar e gorgonzola.', imagem: 'quatro-queijos.jpg', ativo: true, tamanhos: { medio: 24.00, big: 31.00 } },
    { id: '23', nome: '23 - Coração com queijo', categoria: 'salgados', descricao: 'Coração com queijo.', imagem: 'carne-panela.jpg', ativo: true, tamanhos: { medio: 22.00, big: 30.00 } },
    { id: '24', nome: '24 - Coração 2 queijos', categoria: 'salgados', descricao: 'Coração com 2 queijos.', imagem: 'carne-panela.jpg', ativo: true, tamanhos: { medio: 22.00, big: 30.00 } },
    { id: '25', nome: '25 - Coração, ovo, azeitonas e queijo', categoria: 'salgados', descricao: 'Coração, ovo, azeitonas e queijo.', imagem: 'carne-panela.jpg', ativo: true, tamanhos: { medio: 22.00, big: 30.00 } },
    { id: '26', nome: '26 - Camarão com mussarela', categoria: 'salgados', descricao: 'Camarão com mussarela.', imagem: 'camarao-especial.jpeg', ativo: true, tamanhos: { medio: 31.00, big: 38.00 } },
    { id: '27', nome: '27 - Camarão com catupiry', categoria: 'salgados', descricao: 'Camarão com catupiry.', imagem: 'camarao-especial.jpeg', ativo: true, tamanhos: { medio: 35.00, big: 41.00 } },
    { id: '28', nome: '28 - Camarão, ovo, azeitona, queijo', categoria: 'salgados', descricao: 'Camarão, ovo, azeitona e queijo.', imagem: 'camarao-especial.jpeg', ativo: true, tamanhos: { medio: 31.00, big: 38.00 } },

    // Pastéis Doces (29 a 40: Pequeno 20,00 | Médio 28,00 | Big 38,00)
    { id: '29', nome: '29 - Chocolate branco néstle', categoria: 'doces', descricao: 'Chocolate branco Nestlé.', imagem: 'ouro-branco.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },
    { id: '30', nome: '30 - Chocolate preto néstle', categoria: 'doces', descricao: 'Chocolate preto Nestlé.', imagem: 'mms.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },
    { id: '31', nome: '31 - Meio a Meio', categoria: 'doces', descricao: 'Choc preto e branco.', imagem: 'ouro-branco.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },
    { id: '32', nome: '32 - Ouro branco com choc branco', categoria: 'doces', descricao: 'Ouro branco com chocolate branco.', imagem: 'ouro-branco.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },
    { id: '33', nome: '33 - Ouro branco com choc preto', categoria: 'doces', descricao: 'Ouro branco com chocolate preto.', imagem: 'ouro-branco.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },
    { id: '34', nome: '34 - Stikadinho meio a meio', categoria: 'doces', descricao: 'Stikadinho meio a meio.', imagem: 'chocolate-coco.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },
    { id: '35', nome: '35 - Stikadinho choc preto', categoria: 'doces', descricao: 'Stikadinho com chocolate preto.', imagem: 'chocolate-coco.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },
    { id: '36', nome: '36 - M&Ms com chocolate preto', categoria: 'doces', descricao: 'M&Ms com chocolate preto.', imagem: 'mms.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },
    { id: '37', nome: '37 - M&ms com chocolate branco', categoria: 'doces', descricao: 'M&Ms com chocolate branco.', imagem: 'mms.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },
    { id: '38', nome: '38 - Prestigio', categoria: 'doces', descricao: 'Chocolate preto e coco ralado.', imagem: 'chocolate-coco.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },
    { id: '39', nome: '39 - Beijinho', categoria: 'doces', descricao: 'Chocolate branco com coco ralado.', imagem: 'chocolate-coco.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },
    { id: '40', nome: '40 - Doce de leite mumu com banana', categoria: 'doces', descricao: 'Doce de leite Mumu com banana.', imagem: 'doce-mumu.jpg', ativo: true, tamanhos: { pequeno: 20.00, medio: 28.00, big: 38.00 } },

    // Doces Especiais (42 a 46)
    { id: '42', nome: '42 - Romeu e Julieta', categoria: 'doces', descricao: 'Romeu e Julieta.', imagem: 'doce-mumu.jpg', ativo: true, tamanhos: { medio: 21.00, big: 25.00 } },
    { id: '43', nome: '43 - Nutella com Banana', categoria: 'doces', descricao: 'Nutella com banana.', imagem: 'nutella-banana.jpg', ativo: true, tamanhos: { medio: 30.00 } },
    { id: '44', nome: '44 - Nutella', categoria: 'doces', descricao: 'Nutella.', imagem: 'nutella-banana.jpg', ativo: true, tamanhos: { pequeno: 23.00 } },
    { id: '45', nome: '45 - Nutella com leite ninho', categoria: 'doces', descricao: 'Nutella com leite Ninho.', imagem: 'nutella-banana.jpg', ativo: true, tamanhos: { pequeno: 25.00 } },
    { id: '46', nome: '46 - Churros', categoria: 'doces', descricao: 'Doce de leite, açúcar e canela por fora.', imagem: 'doce-mumu.jpg', ativo: true, tamanhos: { pequeno: 19.00 } },

    // Bebidas
    { id: 'beb-coca-2l', nome: 'Coca-cola 2L', categoria: 'bebidas', descricao: 'Refrigerante 2 litros.', imagem: 'refri-2l.jpg', ativo: true, precoUnico: 14.00 },
    { id: 'beb-coca-zero-2l', nome: 'Coca-cola zero 2L', categoria: 'bebidas', descricao: 'Refrigerante zero 2 litros.', imagem: 'refri-2l.jpg', ativo: true, precoUnico: 14.00 },
    { id: 'beb-fruki-2l', nome: 'Fruki guarana 2L', categoria: 'bebidas', descricao: 'Guaraná Fruki 2 litros.', imagem: 'refri-2l.jpg', ativo: true, precoUnico: 11.00 },
    { id: 'beb-coca-lata', nome: 'Coca-cola lata', categoria: 'bebidas', descricao: 'Lata 350ml.', imagem: 'coca-lata.jpg', ativo: true, precoUnico: 6.00 },
    { id: 'beb-coca-zero-lata', nome: 'Coca-cola zero lata', categoria: 'bebidas', descricao: 'Lata 350ml.', imagem: 'coca-lata.jpg', ativo: true, precoUnico: 6.00 },
    { id: 'beb-fruki-lata', nome: 'Fruki guarana lata', categoria: 'bebidas', descricao: 'Lata 350ml.', imagem: 'guarana-lata.jpg', ativo: true, precoUnico: 6.00 },
    { id: 'beb-budweiser', nome: 'Cerveja Budweiser latão', categoria: 'bebidas', descricao: 'Latão gelado.', imagem: 'coca-lata.jpg', ativo: true, precoUnico: 10.00 },
    { id: 'beb-heineken', nome: 'Cerveja Heineken latão', categoria: 'bebidas', descricao: 'Latão gelado.', imagem: 'coca-lata.jpg', ativo: true, precoUnico: 10.00 },
    { id: 'beb-agua', nome: 'Água', categoria: 'bebidas', descricao: 'Água mineral sem gás.', imagem: 'agua-500ml.jpg', ativo: true, precoUnico: 3.50 },
    { id: 'beb-agua-gas', nome: 'Água com gás', categoria: 'bebidas', descricao: 'Água mineral com gás.', imagem: 'agua-500ml.jpg', ativo: true, precoUnico: 3.50 }
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
      produtos: Array.isArray(parsed.produtos) && parsed.produtos.length > 0 ? parsed.produtos : DEFAULT_DB.produtos
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

  const novoProduto = {
    id: body.id ? String(body.id).trim() : slugifyId(body.nome),
    nome: String(body.nome).trim(),
    categoria: String(body.categoria || 'salgados').trim(),
    descricao: String(body.descricao || '').trim(),
    imagem: String(body.imagem || 'carne-panela.jpg').trim(),
    ativo: body.ativo !== undefined ? Boolean(body.ativo) : true
  };

  if (body.precoUnico !== undefined && body.precoUnico !== null && body.precoUnico !== '') {
    const precoUnico = Number(body.precoUnico);
    novoProduto.precoUnico = !Number.isNaN(precoUnico) ? Number(precoUnico.toFixed(2)) : 0;
  } else {
    const t = body.tamanhos || {};
    const tamanhos = {};
    if (t.pequeno !== undefined && t.pequeno !== null && t.pequeno !== '') {
      tamanhos.pequeno = Number(Number(t.pequeno).toFixed(2));
    }
    if (t.medio !== undefined && t.medio !== null && t.medio !== '') {
      tamanhos.medio = Number(Number(t.medio).toFixed(2));
    }
    if (t.big !== undefined && t.big !== null && t.big !== '') {
      tamanhos.big = Number(Number(t.big).toFixed(2));
    }
    if (Object.keys(tamanhos).length === 0) {
      tamanhos.medio = 20.0;
      tamanhos.big = 27.0;
    }
    novoProduto.tamanhos = tamanhos;
  }

  state.produtos.push(novoProduto);
  saveDb(state);
  return res.status(201).json({ produto: novoProduto });
});

// Admin: editar produto
app.put('/api/admin/produtos/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const idx = state.produtos.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  const atual = state.produtos[idx];
  const body = req.body || {};

  const atualizado = {
    ...atual,
    nome: body.nome !== undefined ? String(body.nome).trim() : atual.nome,
    categoria: body.categoria !== undefined ? String(body.categoria).trim() : atual.categoria,
    descricao: body.descricao !== undefined ? String(body.descricao).trim() : atual.descricao,
    imagem: body.imagem !== undefined ? String(body.imagem).trim() : atual.imagem,
    ativo: body.ativo !== undefined ? Boolean(body.ativo) : atual.ativo
  };

  if (body.precoUnico !== undefined && body.precoUnico !== null && body.precoUnico !== '') {
    atualizado.precoUnico = Number(Number(body.precoUnico).toFixed(2));
    delete atualizado.tamanhos;
  } else if (body.tamanhos && typeof body.tamanhos === 'object') {
    const tamanhos = { ...(atual.tamanhos || {}) };
    ['pequeno', 'medio', 'big'].forEach((k) => {
      if (body.tamanhos[k] !== undefined && body.tamanhos[k] !== null && body.tamanhos[k] !== '') {
        tamanhos[k] = Number(Number(body.tamanhos[k]).toFixed(2));
      }
    });
    atualizado.tamanhos = tamanhos;
    delete atualizado.precoUnico;
  }

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
    ...(body.tempoEntrega !== undefined ? { tempoEntrega: String(body.tempoEntrega).trim() } : {}),
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
