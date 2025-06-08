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
    const precoNumerico = parsePreco(productPrice.value);

    const productList = document.getElementById("product-list");
    productList.innerHTML += `
             <div id="${randomId}" class="col-6 col-md-4 col-lg-3">
                <div class="card mt-2 neon-hover" style="width: 18rem;">
                    <img src="${URL.createObjectURL(productImage.files[0])}" class="card-img-top" alt="${productName.value}">
                    <div class="card-body">
                        <h5 class="card-title fw-bold">${productName.value}</h5>
                        <p class="card-text fst-italic">${productPrice.value}</p>
                        <p class="card-text fst-italic">
                            <a href="${storeUrl.value}" target="_blank">${storeName.value}</a>
                        </p>
                        <a href="#" data-id="${randomId}" onclick="removeProduct(event)" class="btn btn-danger w-100">Remover</a>
                    </div>
                </div>
            </div>
            `
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

// Busca aprimorada usando backend Node.js
async function buscarPrecoBackend(produto) {
    try {
        const response = await fetch(`http://localhost:3001/buscar-preco?produto=${encodeURIComponent(produto)}`);
        if (!response.ok) throw new Error('Nenhum preço encontrado');
        const data = await response.json();
        document.getElementById("product-price").value = `R$ ${data.preco.toFixed(2).replace('.', ',')}`;
        document.getElementById("store-name").value = data.loja;
        document.getElementById("store-url").value = data.url;
        alert(`Menor preço encontrado em ${data.loja}: ${data.precoStr}`);
    } catch (e) {
        alert("Nenhum preço encontrado pelo backend.");
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