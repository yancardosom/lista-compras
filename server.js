const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET = 'sua_chave_secreta';

const app = express();
app.use(cors());

// Inicializa banco SQLite
const db = new sqlite3.Database('buyzapp.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT,
        email TEXT,
        phone TEXT,
        username TEXT UNIQUE,
        password TEXT,
        reset_token TEXT,
        reset_token_expiry DATETIME
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product TEXT,
        price REAL,
        store TEXT,
        url TEXT,
        searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product TEXT,
        price REAL,
        store TEXT,
        url TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Middleware para autenticação JWT
function auth(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ erro: 'Token não fornecido' });
    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ erro: 'Token inválido' });
        req.userId = decoded.id;
        next();
    });
}

// Cadastro
app.post('/register', express.json(), (req, res) => {
    const { fullname, email, phone, username, password } = req.body;
    if (!fullname || !email || !phone || !username || !password) return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    const hash = bcrypt.hashSync(password, 8);
    db.run('INSERT INTO users (fullname, email, phone, username, password) VALUES (?, ?, ?, ?, ?)', [fullname, email, phone, username, hash], function(err) {
        if (err) return res.status(400).json({ erro: 'Usuário já existe ou dados inválidos' });
        res.json({ id: this.lastID, username });
    });
});

// Login
app.post('/login', express.json(), (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) return res.status(400).json({ erro: 'Usuário não encontrado' });
        if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ erro: 'Senha inválida' });
        const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1d' });
        res.json({ token });
    });
});

// Funções de scraping para cada loja (agora retornam lista de até 10 produtos)
async function buscarAmericanas(produto, isUrl = false, max = 10) {
    const url = isUrl ? produto : `https://www.americanas.com.br/busca/${encodeURIComponent(produto)}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let resultados = [];
        $("div[data-testid='product-card-container']").each((i, el) => {
            if (resultados.length >= max) return false;
            // Tenta pegar o preço de diferentes seletores possíveis
            let precoEl = $(el).find("span[class*='src__BestPrice']").first();
            if (!precoEl.text()) {
                precoEl = $(el).find("span.price__SalesPrice").first();
            }
            let preco = precoEl.text().replace(/[\sR$]/g, '').replace(/\./g, '').replace(',', '.');
            let valor = parseFloat(preco);
            if (!valor || isNaN(valor)) return; // ignora cards sem preço
            const card = $(el).find('a').first();
            const link = card.attr('href') ? 'https://www.americanas.com.br' + card.attr('href') : url;
            const nome = $(el).find('h3').first().text() || produto;
            const imagem = $(el).find('img').first().attr('src') || '';
            resultados.push({ loja: 'Americanas', preco: valor, precoStr: precoEl.text(), url: link, nome, imagem });
        });
        return resultados;
    } catch (e) {}
    return [];
}

async function buscarAmazon(produto, isUrl = false, max = 10) {
    const url = isUrl ? produto : `https://www.amazon.com.br/s?k=${encodeURIComponent(produto)}`;
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        let resultados = [];
        $("div.s-result-item").each((i, el) => {
            if (resultados.length >= max) return false;
            // Tenta múltiplos seletores de preço
            let precoEl = $(el).find("span.a-price-whole").first();
            let centavos = precoEl.next('span.a-price-fraction').text();
            if (!precoEl.text()) {
                precoEl = $(el).find("span.a-offscreen").first();
                centavos = '';
            }
            let preco = precoEl.text().replace(/\./g, '');
            if (centavos) preco += ',' + centavos;
            let valor = parseFloat(preco.replace('.', '').replace(',', '.'));
            if (!valor || isNaN(valor)) return;
            const card = $(el).find('a.a-link-normal').attr('href');
            const link = card ? 'https://www.amazon.com.br' + card : url;
            const nome = $(el).find('span.a-text-normal').first().text() || produto;
            const imagem = $(el).find('img.s-image').attr('src') || '';
            resultados.push({ loja: 'Amazon', preco: valor, precoStr: 'R$ ' + preco, url: link, nome, imagem });
        });
        return resultados;
    } catch (e) {}
    return [];
}

async function buscarCasasBahia(produto, isUrl = false, max = 10) {
    const url = isUrl ? produto : `https://www.casasbahia.com.br/busca/${encodeURIComponent(produto)}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let resultados = [];
        $("div[data-testid='product-card-container']").each((i, el) => {
            if (resultados.length >= max) return false;
            // Tenta múltiplos seletores de preço
            let precoEl = $(el).find("span.sales-price").first();
            if (!precoEl.text()) {
                precoEl = $(el).find("span.price-value").first();
            }
            let preco = precoEl.text().replace(/[^\d,]/g, '');
            let valor = parseFloat(preco.replace('.', '').replace(',', '.'));
            if (!valor || isNaN(valor)) return;
            const card = $(el).find('a').first();
            const link = card.attr('href') ? 'https://www.casasbahia.com.br' + card.attr('href') : url;
            const nome = $(el).find('h3').first().text() || produto;
            const imagem = $(el).find('img').first().attr('src') || '';
            resultados.push({ loja: 'Casas Bahia', preco: valor, precoStr: 'R$ ' + preco, url: link, nome, imagem });
        });
        return resultados;
    } catch (e) {}
    return [];
}

async function buscarMagazineLuiza(produto, isUrl = false, max = 10) {
    const url = isUrl ? produto : `https://www.magazineluiza.com.br/busca/${encodeURIComponent(produto)}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let resultados = [];
        $("li[data-testid='product-card']").each((i, el) => {
            if (resultados.length >= max) return false;
            // Tenta múltiplos seletores de preço
            let precoEl = $(el).find("p[data-testid='price-value']").first();
            if (!precoEl.text()) {
                precoEl = $(el).find("span.price-value").first();
            }
            let preco = precoEl.text().replace(/[^\d,]/g, '');
            let valor = parseFloat(preco.replace('.', '').replace(',', '.'));
            if (!valor || isNaN(valor)) return;
            const card = $(el).find('a').first();
            const link = card.attr('href') ? card.attr('href') : url;
            const nome = $(el).find('h2').first().text() || produto;
            const imagem = $(el).find('img').first().attr('src') || '';
            resultados.push({ loja: 'Magazine Luiza', preco: valor, precoStr: 'R$ ' + preco, url: link, nome, imagem });
        });
        return resultados;
    } catch (e) {}
    return [];
}

async function buscarMercadoLivre(produto, isUrl = false, max = 10) {
    if (isUrl) {
        // Scraping direto da página do produto Mercado Livre
        try {
            const { data } = await axios.get(produto);
            const $ = cheerio.load(data);
            const precoStr = $('[data-testid="price-value"]').first().text() || $('[itemprop="price"]').attr('content');
            let preco = null;
            if (precoStr) {
                preco = parseFloat(precoStr.replace(/[^\d,\.]/g, '').replace('.', '').replace(',', '.'));
            }
            return {
                loja: 'Mercado Livre',
                preco: preco,
                precoStr: preco ? `R$ ${preco.toFixed(2).replace('.', ',')}` : '',
                url: produto
            };
        } catch (e) { return null; }
    } else {
        const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(produto)}`;
        try {
            const { data } = await axios.get(url);
            if (!data.results || data.results.length === 0) return [];
            return data.results.slice(0, max).map(item => ({
                loja: 'Mercado Livre',
                preco: item.price,
                precoStr: `R$ ${item.price.toFixed(2).replace('.', ',')}`,
                url: item.permalink,
                nome: item.title,
                imagem: item.thumbnail
            }));
        } catch (e) { return []; }
    }
}

// Funções para buscar por URL específica de cada loja
async function buscarPorUrlAmericanas(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const precoEl = $("span[class*='src__BestPrice']").first();
        const precoStr = precoEl.text();
        const preco = parseFloat(precoStr.replace(/[^\d,]/g, '').replace(',', '.'));
        const nome = $("h1").first().text() || 'Produto Americanas';
        if (preco) {
            return { loja: 'Americanas', preco, precoStr, url, nome };
        }
    } catch (e) {}
    return null;
}
async function buscarPorUrlAmazon(url) {
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const precoEl = $("span.a-price-whole").first();
        const centavos = precoEl.next('span.a-price-fraction').text();
        const precoStr = precoEl.text() ? 'R$ ' + precoEl.text() + ',' + centavos : '';
        const preco = precoEl.text() ? parseFloat((precoEl.text() + ',' + centavos).replace('.', '').replace(',', '.')) : null;
        const nome = $("span#productTitle").text().trim() || 'Produto Amazon';
        if (preco) {
            return { loja: 'Amazon', preco, precoStr, url, nome };
        }
    } catch (e) {}
    return null;
}
async function buscarPorUrlCasasBahia(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const precoEl = $("span.sales-price").first();
        const precoStr = precoEl.text();
        const preco = parseFloat(precoStr.replace(/[^\d,]/g, '').replace('.', '').replace(',', '.'));
        const nome = $("h1.product-name").text().trim() || 'Produto Casas Bahia';
        if (preco) {
            return { loja: 'Casas Bahia', preco, precoStr, url, nome };
        }
    } catch (e) {}
    return null;
}
async function buscarPorUrlMagazineLuiza(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const precoEl = $("p[data-testid='price-value']").first();
        const precoStr = precoEl.text();
        const preco = parseFloat(precoStr.replace(/[^\d,]/g, '').replace('.', '').replace(',', '.'));
        const nome = $("h1[data-testid='heading-product-title']").text().trim() || 'Produto Magazine Luiza';
        if (preco) {
            return { loja: 'Magazine Luiza', preco, precoStr, url, nome };
        }
    } catch (e) {}
    return null;
}
async function buscarPorUrlMercadoLivre(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const precoEl = $("span.andes-money-amount__fraction").first();
        const centavos = $("span.andes-money-amount__cents").first().text();
        const precoStr = precoEl.text() ? 'R$ ' + precoEl.text() + (centavos ? ',' + centavos : '') : '';
        const preco = precoEl.text() ? parseFloat((precoEl.text() + (centavos ? ',' + centavos : '')).replace('.', '').replace(',', '.')) : null;
        const nome = $("h1").first().text().trim() || 'Produto Mercado Livre';
        if (preco) {
            return { loja: 'Mercado Livre', preco, precoStr, url, nome };
        }
    } catch (e) {}
    return null;
}

function identificarLojaPorUrl(url) {
    if (/americanas\.com\.br/.test(url)) return 'americanas';
    if (/amazon\.com\.br/.test(url)) return 'amazon';
    if (/casasbahia\.com\.br/.test(url)) return 'casasbahia';
    if (/magazineluiza\.com\.br/.test(url)) return 'magazineluiza';
    if (/mercadolivre\.com\.br/.test(url)) return 'mercadolivre';
    return null;
}

// Histórico de buscas (adicionar)
app.post('/history', auth, express.json(), (req, res) => {
    const { product, price, store, url } = req.body;
    db.run('INSERT INTO history (user_id, product, price, store, url) VALUES (?, ?, ?, ?, ?)',
        [req.userId, product, price, store, url],
        function(err) {
            if (err) return res.status(500).json({ erro: 'Erro ao salvar histórico' });
            res.json({ id: this.lastID });
        }
    );
});
// Histórico de buscas (listar)
app.get('/history', auth, (req, res) => {
    db.all('SELECT * FROM history WHERE user_id = ? ORDER BY searched_at DESC', [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar histórico' });
        res.json(rows);
    });
});
// Favoritos (adicionar)
app.post('/favorites', auth, express.json(), (req, res) => {
    const { product, price, store, url } = req.body;
    db.run('INSERT INTO favorites (user_id, product, price, store, url) VALUES (?, ?, ?, ?, ?)',
        [req.userId, product, price, store, url],
        function(err) {
            if (err) return res.status(500).json({ erro: 'Erro ao salvar favorito' });
            res.json({ id: this.lastID });
        }
    );
});
// Favoritos (listar)
app.get('/favorites', auth, (req, res) => {
    db.all('SELECT * FROM favorites WHERE user_id = ? ORDER BY added_at DESC', [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar favoritos' });
        res.json(rows);
    });
});
// Favoritos (remover)
app.delete('/favorites/:id', auth, (req, res) => {
    db.run('DELETE FROM favorites WHERE id = ? AND user_id = ?', [req.params.id, req.userId], function(err) {
        if (err) return res.status(500).json({ erro: 'Erro ao remover favorito' });
        res.json({ removido: true });
    });
});

// Rota de busca de preço (nome ou URL)
app.get('/buscar-preco', async (req, res) => {
    const { produto } = req.query;
    if (!produto) return res.status(400).json({ erro: 'Produto não informado' });

    // Detecta se é uma URL de loja suportada
    const isUrl = str => /^https?:\/\//i.test(str);
    let resultados = [];
    if (isUrl(produto)) {
        // Busca por URL específica
        let result = null;
        if (/americanas\.com\.br/.test(produto)) {
            result = await buscarAmericanas(produto, true, 1);
        } else if (/amazon\.com\.br/.test(produto)) {
            result = await buscarAmazon(produto, true, 1);
        } else if (/casasbahia\.com\.br/.test(produto)) {
            result = await buscarCasasBahia(produto, true, 1);
        } else if (/magazineluiza\.com\.br/.test(produto)) {
            result = await buscarMagazineLuiza(produto, true, 1);
        } else if (/mercadolivre\.com\.br/.test(produto)) {
            result = await buscarMercadoLivre(produto, true, 1);
        }
        if (result && Array.isArray(result)) resultados = result;
        else if (result) resultados = [result];
    } else {
        // Busca até 10 de cada loja e intercala os resultados
        const [americanas, amazon, casasbahia, magazineluiza, mercadolivre] = await Promise.all([
            buscarAmericanas(produto, false, 10),
            buscarAmazon(produto, false, 10),
            buscarCasasBahia(produto, false, 10),
            buscarMagazineLuiza(produto, false, 10),
            buscarMercadoLivre(produto, false, 10)
        ]);
        // LOG para depuração
        console.log('Resultados Americanas:', americanas.length);
        console.log('Resultados Amazon:', amazon.length);
        console.log('Resultados CasasBahia:', casasbahia.length);
        console.log('Resultados MagazineLuiza:', magazineluiza.length);
        console.log('Resultados MercadoLivre:', mercadolivre.length);
        // Intercala os resultados
        for (let i = 0; i < 10; i++) {
            if (americanas[i]) resultados.push(americanas[i]);
            if (amazon[i]) resultados.push(amazon[i]);
            if (casasbahia[i]) resultados.push(casasbahia[i]);
            if (magazineluiza[i]) resultados.push(magazineluiza[i]);
            if (mercadolivre[i]) resultados.push(mercadolivre[i]);
        }
        resultados = resultados.filter(Boolean).slice(0, 50); // Remove undefined/null
    }
    if (!resultados.length) return res.status(404).json({ erro: 'Nenhum preço encontrado' });
    res.json(resultados);
});

// Recuperação de senha - solicitar
app.post('/forgot-password', express.json(), (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ erro: 'E-mail obrigatório' });
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user) return res.status(200).json({ msg: 'Se este e-mail estiver cadastrado, você receberá instruções.' });
        // Gera token simples (pode ser JWT ou string aleatória)
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiry = Date.now() + 1000 * 60 * 30; // 30 minutos
        db.run('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?', [token, expiry, user.id], (err2) => {
            // Simula envio de e-mail: retorna link na resposta
            const link = `http://localhost:3001/reset-password?token=${token}`;
            res.json({ msg: 'Se este e-mail estiver cadastrado, você receberá instruções.', resetLink: link });
        });
    });
});

// Recuperação de senha - redefinir
app.post('/reset-password', express.json(), (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ erro: 'Token e nova senha obrigatórios' });
    db.get('SELECT * FROM users WHERE reset_token = ?', [token], (err, user) => {
        if (err || !user) return res.status(400).json({ erro: 'Token inválido' });
        if (!user.reset_token_expiry || Date.now() > user.reset_token_expiry) return res.status(400).json({ erro: 'Token expirado' });
        const hash = bcrypt.hashSync(password, 8);
        db.run('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?', [hash, user.id], (err2) => {
            if (err2) return res.status(500).json({ erro: 'Erro ao redefinir senha' });
            res.json({ msg: 'Senha redefinida com sucesso' });
        });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Servidor rodando na porta', PORT));
