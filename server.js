const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

// Funções de scraping para cada loja
async function buscarAmericanas(produto) {
    const url = `https://www.americanas.com.br/busca/${encodeURIComponent(produto)}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let menorPreco = Infinity, precoStr = '', link = '';
        $("span[class*='src__BestPrice']").each((i, el) => {
            const preco = $(el).text().replace(/[^\d,]/g, '').replace(',', '.');
            const valor = parseFloat(preco);
            if (valor && valor < menorPreco) {
                menorPreco = valor;
                precoStr = $(el).text();
                // Tenta pegar o link do produto
                const card = $(el).closest('a');
                link = card.attr('href') ? 'https://www.americanas.com.br' + card.attr('href') : url;
            }
        });
        if (menorPreco !== Infinity) {
            return { loja: 'Americanas', preco: menorPreco, precoStr, url: link };
        }
    } catch (e) {}
    return null;
}

async function buscarAmazon(produto) {
    const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(produto)}`;
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        let menorPreco = Infinity, precoStr = '', link = '';
        $("span.a-price-whole").each((i, el) => {
            const centavos = $(el).next('span.a-price-fraction').text();
            const preco = $(el).text().replace(/\./g, '') + ',' + centavos;
            const valor = parseFloat(preco.replace('.', '').replace(',', '.'));
            if (valor && valor < menorPreco) {
                menorPreco = valor;
                precoStr = 'R$ ' + preco;
                // Link do produto
                const card = $(el).closest('div.s-result-item').find('a.a-link-normal').attr('href');
                link = card ? 'https://www.amazon.com.br' + card : url;
            }
        });
        if (menorPreco !== Infinity) {
            return { loja: 'Amazon', preco: menorPreco, precoStr, url: link };
        }
    } catch (e) {}
    return null;
}

async function buscarCasasBahia(produto) {
    const url = `https://www.casasbahia.com.br/busca/${encodeURIComponent(produto)}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let menorPreco = Infinity, precoStr = '', link = '';
        $("span.sales-price").each((i, el) => {
            const preco = $(el).text().replace(/[^\d,]/g, '');
            const valor = parseFloat(preco.replace('.', '').replace(',', '.'));
            if (valor && valor < menorPreco) {
                menorPreco = valor;
                precoStr = 'R$ ' + preco;
                // Link do produto
                const card = $(el).closest('a').attr('href');
                link = card ? 'https://www.casasbahia.com.br' + card : url;
            }
        });
        if (menorPreco !== Infinity) {
            return { loja: 'Casas Bahia', preco: menorPreco, precoStr, url: link };
        }
    } catch (e) {}
    return null;
}

async function buscarMagazineLuiza(produto) {
    const url = `https://www.magazineluiza.com.br/busca/${encodeURIComponent(produto)}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let menorPreco = Infinity, precoStr = '', link = '';
        $("p[data-testid='price-value']").each((i, el) => {
            const preco = $(el).text().replace(/[^\d,]/g, '');
            const valor = parseFloat(preco.replace('.', '').replace(',', '.'));
            if (valor && valor < menorPreco) {
                menorPreco = valor;
                precoStr = 'R$ ' + preco;
                // Link do produto
                const card = $(el).closest('a').attr('href');
                link = card ? card : url;
            }
        });
        if (menorPreco !== Infinity) {
            return { loja: 'Magazine Luiza', preco: menorPreco, precoStr, url: link };
        }
    } catch (e) {}
    return null;
}

app.get('/buscar-preco', async (req, res) => {
    const { produto } = req.query;
    if (!produto) return res.status(400).json({ erro: 'Produto não informado' });
    // Busca em todas as lojas
    const resultados = await Promise.all([
        buscarAmericanas(produto),
        buscarAmazon(produto),
        buscarCasasBahia(produto),
        buscarMagazineLuiza(produto)
    ]);
    const validos = resultados.filter(r => r);
    if (validos.length === 0) return res.status(404).json({ erro: 'Nenhum preço encontrado' });
    const menor = validos.reduce((a, b) => a.preco < b.preco ? a : b);
    res.json(menor);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Servidor rodando na porta', PORT));
