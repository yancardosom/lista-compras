let products = [];

function generateRandomId() {
    return Math.random().toString(36).substr(2, 9);
}

function removeProduct(event) {
    event.preventDefault();// Previne o comportamento padrão do link
    const productId = event.target.getAttribute("data-id");
    const productElement = document.getElementById(productId);
    if (productElement) {
        productElement.remove();
    }

    products = products.filter(product => product.id !== productId);
    // Atualiza o total do carrinho
    atualizarTotalCarrinho();
    console.log(products);

}
function saveInJsonFile() {
    const jsonData = JSON.stringify(products, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Extrai o valor numérico do campo de preço formatado
function parsePreco(precoStr) {
    if (!precoStr) return 0;
    return Number(precoStr.replace(/[^\d,]/g, '').replace(',', '.'));
}

document.getElementById("add-product").addEventListener("click", function (event) {
    event.preventDefault(); // Previne o envio do formulário
    const productName = document.getElementById("product-name");
    const productPrice = document.getElementById("product-price");
    const storeName = document.getElementById("store-name");
    const storeUrl = document.getElementById("store-url");
    const productImage = document.getElementById("product-image");
    const form = document.querySelector("form");
    if (!productName.value || !productPrice.value || !storeName.value || !storeUrl.value || !productImage.files.length) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    const randomId = generateRandomId();
    // Garante que o preço fique no formato 'R$ 1.234,56' ao exibir no carrinho
    let precoNumerico = parsePreco(productPrice.value);
    let precoFormatado = 'R$ ' + precoNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const productList = document.getElementById("product-list");
    // Garante centralização e organização dos cards do carrinho lado a lado
    productList.style.display = 'flex';
    productList.style.flexWrap = 'wrap';
    productList.style.justifyContent = 'center';
    productList.style.alignItems = 'flex-start';
    productList.style.gap = '18px';
    productList.style.rowGap = '18px';
    productList.style.columnGap = '18px';
    productList.style.margin = '0 auto 24px auto';
    productList.style.width = '100%';
    productList.innerHTML += `
        <div id="${randomId}" style="background:#181f2a;border-radius:10px;padding:16px;width:220px;box-shadow:0 0 8px #00eaff;display:flex;flex-direction:column;align-items:center;position:relative;">
            <button class="btn-favorito" title="Favoritar" data-favorito="0" style="position:absolute;top:10px;right:10px;background:none;border:none;cursor:pointer;outline:none;z-index:2;">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00eaff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" class="coracao-path"></path>
                </svg>
            </button>
            <img src="${URL.createObjectURL(productImage.files[0])}" alt="${productName.value}" style="width:120px;height:120px;object-fit:contain;background:#222;border-radius:8px;margin-bottom:10px;">
            <div style="color:#fff;font-size:1rem;font-family:Roboto,sans-serif;font-weight:bold;text-align:center;">${productName.value}</div>
            <div style="color:#00eaff;font-family:Roboto Mono,Consolas,monospace;font-size:1.1rem;font-weight:bold;margin:6px 0;">${precoFormatado}</div>
            <div style="color:#00eaff;font-size:0.95rem;margin-bottom:6px;">${storeName.value}</div>
            <a href="${storeUrl.value}" target="_blank" style="color:#00eaff;text-decoration:underline;font-size:0.95rem;">Ver na loja</a>
            <a href="#" data-id="${randomId}" onclick="removeProduct(event)" class="btn btn-danger w-100" style="margin-top:10px;">Remover</a>
        </div>
    `;
    // Adiciona evento de clique para o botão de favorito recém-criado
    setTimeout(() => {
        const card = document.getElementById(randomId);
        if (card) {
            const btnFav = card.querySelector('.btn-favorito');
            if (btnFav) {
                btnFav.addEventListener('click', function(e) {
                    e.preventDefault();
                    const svg = btnFav.querySelector('svg');
                    const path = svg.querySelector('.coracao-path');
                    if (btnFav.getAttribute('data-favorito') === '0') {
                        path.setAttribute('fill', '#00eaff');
                        btnFav.setAttribute('data-favorito', '1');
                        // Salvar favorito no backend
                        const token = localStorage.getItem('token');
                        fetch('http://localhost:3001/favorites', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': token
                            },
                            body: JSON.stringify({
                                product: productName.value,
                                price: precoNumerico,
                                store: storeName.value,
                                url: storeUrl.value
                            })
                        }).then(r => r.json()).then(data => {
                            // Opcional: feedback visual
                        });
                    } else {
                        path.setAttribute('fill', 'none');
                        btnFav.setAttribute('data-favorito', '0');
                        // Remover favorito do backend
                        const token = localStorage.getItem('token');
                        // Buscar o id do favorito para remover
                        fetch('http://localhost:3001/favorites', {
                            headers: { 'Authorization': token }
                        })
                        .then(r => r.json())
                        .then(favs => {
                            const fav = favs.find(f => f.product === productName.value && f.price === precoNumerico && f.store === storeName.value && f.url === storeUrl.value);
                            if (fav) {
                                fetch(`http://localhost:3001/favorites/${fav.id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': token }
                                });
                            }
                        });
                    }
                });
            }
        }
    }, 10);
    products.push({
        id: randomId,
        name: productName.value,
        price: precoNumerico,
        store: {
            name: storeName.value,
            url: storeUrl.value
        },
        image: URL.createObjectURL(productImage.files[0])
    });
    // Atualiza o total do carrinho
    atualizarTotalCarrinho();
    form.reset(); // Limpa o formulário após adicionar o produto
});

// Máscara automática para o campo de preço no padrão 'R$ 1.234,56'
const productPriceInput = document.getElementById("product-price");
if (productPriceInput) {
    productPriceInput.addEventListener('input', function (e) {
        let v = e.target.value;
        // Remove tudo que não for número
        v = v.replace(/[^\d]/g, '');
        if (v.length === 0) {
            e.target.value = '';
            return;
        }
        // Converte para centavos
        let num = parseInt(v, 10);
        let valor = (num / 100).toFixed(2);
        // Formata para pt-BR
        let valorFormatado = Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        e.target.value = 'R$ ' + valorFormatado;
    });
}

// Cria container/modal para resultados de busca
let resultadoBuscaContainer = document.createElement('div');
resultadoBuscaContainer.id = 'resultado-busca-container';
resultadoBuscaContainer.style.position = 'fixed';
resultadoBuscaContainer.style.top = '0';
resultadoBuscaContainer.style.left = '0';
resultadoBuscaContainer.style.width = '100vw';
resultadoBuscaContainer.style.height = '100vh';
resultadoBuscaContainer.style.background = 'rgba(0,0,0,0.85)';
resultadoBuscaContainer.style.zIndex = '9999';
resultadoBuscaContainer.style.display = 'none';
resultadoBuscaContainer.style.overflowY = 'auto';
resultadoBuscaContainer.style.padding = '40px 0 0 0';
document.body.appendChild(resultadoBuscaContainer);

function fecharResultadoBusca() {
    resultadoBuscaContainer.style.display = 'none';
    resultadoBuscaContainer.innerHTML = '';
}

// Busca aprimorada usando backend Node.js para todas as lojas
async function buscarPrecoBackend(produto) {
    try {
        const response = await fetch(`http://localhost:3001/buscar-preco?produto=${encodeURIComponent(produto)}`);
        let data;
        try {
            data = await response.json();
        } catch (e) {
            alert("Erro ao processar resposta do backend.");
            return;
        }
        if (!response.ok) {
            if (data && data.erro) {
                alert(data.erro);
            } else {
                alert("Erro desconhecido do backend.");
            }
            console.error('Resposta do backend:', data);
            return;
        }
        if (Array.isArray(data) && data.length > 0) {
            // FILTRO: só exibe produtos cujo nome contenha todas as palavras da busca (case insensitive)
            const termosBusca = produto.toLowerCase().split(/\s+/).filter(Boolean);
            // Refinamento: exige que o nome contenha todas as palavras E que a primeira palavra da busca esteja no início do nome OU o nome seja muito semelhante
            data = data.filter(item => {
                if (!item.nome) return false;
                const nome = item.nome.toLowerCase();
                // Todas as palavras devem estar presentes
                const todasPresentes = termosBusca.every(palavra => nome.includes(palavra));
                // A primeira palavra da busca deve estar no início do nome OU o nome deve ser muito parecido
                const primeira = termosBusca[0];
                const nomeSemPontuacao = nome.replace(/[^a-z0-9 ]/gi, '');
                const similar = nomeSemPontuacao.startsWith(primeira) || nomeSemPontuacao.includes(produto.toLowerCase().replace(/[^a-z0-9 ]/gi, ''));
                // Também aceita se o nome for igual ao termo buscado (ignora maiúsculas/minúsculas e pontuação)
                const nomeNormalizado = nomeSemPontuacao.replace(/\s+/g, ' ').trim();
                const buscaNormalizada = produto.toLowerCase().replace(/[^a-z0-9 ]/gi, '').replace(/\s+/g, ' ').trim();
                const igual = nomeNormalizado === buscaNormalizada;
                return todasPresentes && (similar || igual);
            });
            // Limita a 50 produtos e pagina 10 por página
            const pageSize = 10;
            let currentPage = 1;
            data = data.slice(0, 50);
            let totalPages = Math.ceil(data.length / pageSize);
            if (totalPages < 1) totalPages = 1;

            function renderPage(page) {
                let html = `<div style="max-width:1100px;margin:0 auto;background:#111;border-radius:12px;padding:24px;box-shadow:0 0 24px #00eaff;position:relative;">
                    <button id='fechar-busca-modal' style='position:absolute;top:12px;right:18px;font-size:2rem;background:none;border:none;color:#00eaff;cursor:pointer;'>&times;</button>
                    <h3 style='color:#00eaff;font-family:Roboto,sans-serif;margin-bottom:18px;'>Produtos encontrados (${data.length})</h3>
                    <div style='display:flex;flex-wrap:wrap;gap:18px;justify-content:center;'>`;
                const start = (page - 1) * pageSize;
                const end = Math.min(start + pageSize, data.length);
                for (let i = start; i < end; i++) {
                    const loja = data[i];
                    let nomeProduto = loja.nome || produto;
                    let precoStr = loja.precoStr || '';
                    let valor = loja.preco;
                    if ((!precoStr || precoStr.trim() === '') && valor) {
                        precoStr = 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    } else if (precoStr) {
                        let numStr = precoStr.replace(/[^\d,]/g, '');
                        if ((numStr.match(/,/g) || []).length > 1) {
                            numStr = numStr.replace(/,(?=.*,)/g, '');
                        }
                        let num = Number(numStr.replace(',', '.'));
                        if (!isNaN(num) && num > 0) {
                            precoStr = 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        } else {
                            precoStr = '';
                        }
                    }
                    html += `<div style='background:#181f2a;border-radius:10px;padding:16px;width:220px;box-shadow:0 0 8px #00eaff;display:flex;flex-direction:column;align-items:center;'>
                        <img src='${loja.imagem || 'https://via.placeholder.com/180x180?text=Sem+Imagem'}' alt='${nomeProduto}' style='width:120px;height:120px;object-fit:contain;background:#222;border-radius:8px;margin-bottom:10px;'>
                        <div style='color:#fff;font-size:1rem;font-family:Roboto,sans-serif;font-weight:bold;text-align:center;'>${nomeProduto}</div>
                        <div style='color:#00eaff;font-family:Roboto Mono,Consolas,monospace;font-size:1.1rem;font-weight:bold;margin:6px 0;'>${precoStr}</div>
                        <div style='color:#00eaff;font-size:0.95rem;margin-bottom:6px;'>${loja.loja}</div>
                        <a href='${loja.url}' target='_blank' style='color:#00eaff;text-decoration:underline;font-size:0.95rem;'>Ver na loja</a>
                        <button class='adicionar-produto-btn' data-idx='${i}' style='margin-top:10px;background:#00eaff;color:#181f2a;font-weight:bold;border:none;border-radius:6px;padding:6px 18px;cursor:pointer;'>Adicionar</button>
                    </div>`;
                }
                html += `</div>`;
                // Paginação
                html += `<div style='display:flex;justify-content:center;gap:8px;margin-top:8px;margin-bottom:0;'>`;
                for (let p = 1; p <= totalPages; p++) {
                    html += `<button class='paginacao-busca-btn' data-pagina='${p}' style='background:${p===page?'#00eaff':'#222'};color:${p===page?'#181f2a':'#00eaff'};border:none;border-radius:6px;padding:6px 16px;font-weight:bold;cursor:pointer;font-size:1.1rem;'>${p}</button>`;
                }
                html += `</div>`;
                html += `</div>`;
                resultadoBuscaContainer.innerHTML = html;
                resultadoBuscaContainer.style.display = 'block';
                document.getElementById('fechar-busca-modal').onclick = fecharResultadoBusca;
                // Adiciona evento aos botões "Adicionar"
                document.querySelectorAll('.adicionar-produto-btn').forEach(btn => {
                    btn.onclick = function() {
                        const loja = data[Number(btn.getAttribute('data-idx'))];
                        // Sempre usa o nome do produto exatamente como veio do backend (site)
                        document.getElementById("product-name").value = loja.nome || '';
                        // Formata o preço automaticamente ao padrão brasileiro
                        let precoNumerico = Number((loja.preco || '').toString().replace(',', '.'));
                        let precoFormatado = '';
                        if (!isNaN(precoNumerico) && precoNumerico > 0) {
                            precoFormatado = 'R$ ' + precoNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        } else if (loja.precoStr) {
                            let numStr = loja.precoStr.replace(/[^\d,]/g, '');
                            if ((numStr.match(/,/g) || []).length > 1) {
                                numStr = numStr.replace(/,(?=.*,)/g, '');
                            }
                            let num = Number(numStr.replace(',', '.'));
                            if (!isNaN(num) && num > 0) {
                                precoFormatado = 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            }
                        }
                        document.getElementById("product-price").value = precoFormatado;
                        document.getElementById("store-name").value = loja.loja;
                        document.getElementById("store-url").value = loja.url;
                        // Baixa a imagem e coloca no input file
                        if (loja.imagem) {
                            fetch(loja.imagem)
                                .then(resp => resp.blob())
                                .then(blob => {
                                    const file = new File([blob], 'produto.jpg', { type: blob.type });
                                    const dt = new DataTransfer();
                                    dt.items.add(file);
                                    document.getElementById("product-image").files = dt.files;
                                });
                        }
                        fecharResultadoBusca();
                    }
                });
                // Evento de paginação
                document.querySelectorAll('.paginacao-busca-btn').forEach(btn => {
                    btn.onclick = function() {
                        renderPage(Number(btn.getAttribute('data-pagina')));
                    }
                });
            }
            renderPage(currentPage);
            return;
        } else {
            alert("Nenhum preço encontrado pelo backend.");
            console.error('Resposta do backend:', data);
        }
    } catch (e) {
        alert("Erro de conexão com o backend.");
        console.error(e);
    }
}

// Substitui o evento do botão pesquisar para usar o backend
const searchBtn = document.getElementById("search-product");
if (searchBtn) {
    searchBtn.addEventListener("click", function (event) {
        event.preventDefault();
        const productName = document.getElementById("product-name").value.trim();
        if (!productName) {
            alert("Digite o nome do produto para pesquisar.");
            return;
        }
        buscarPrecoBackend(productName);
    });
}

// Função para atualizar o total do carrinho
function atualizarTotalCarrinho() {
    const total = products.reduce((acc, item) => acc + (item.price || 0), 0);
    document.getElementById('total-carrinho').textContent = `Total: R$ ${total.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}