import { products, categories } from './products-data.js';

const categoryList = document.getElementById('category-list');
const productGrid = document.getElementById('product-grid');

if (!categoryList || !productGrid) {
    throw new Error('Products page container elements are missing.');
}

function renderCategories() {
    categoryList.innerHTML = '';

    const allBtn = document.createElement('li');
    const isAllActive = !window.location.hash || window.location.hash === '#all';
    allBtn.innerHTML = `<button onclick="window.location.hash='#all'" class="text-left w-full transition-colors uppercase text-sm tracking-wide ${isAllActive ? 'text-accent font-bold' : 'text-gray-500 hover:text-white'}">All Products</button>`;
    categoryList.appendChild(allBtn);

    categories.forEach((category) => {
        const li = document.createElement('li');
        const isActive = decodeURIComponent(window.location.hash.substring(1)) === category;
        li.innerHTML = `<button onclick="window.location.hash='${encodeURIComponent(category)}'" class="text-left w-full transition-colors uppercase text-sm tracking-wide ${isActive ? 'text-accent font-bold' : 'text-gray-500 hover:text-white'}">${category}</button>`;
        categoryList.appendChild(li);
    });
}

function renderProducts() {
    const hash = decodeURIComponent(window.location.hash.substring(1));
    const currentCategory = hash === 'all' || !hash ? null : hash;

    const filtered = currentCategory
        ? products.filter((product) => product.category === currentCategory)
        : products;

    productGrid.innerHTML = filtered.map((product) => `
        <a href="/products/detail.html?id=${product.id}" class="group block bg-white border border-gray-100 hover:border-accent transition-all duration-500 hover:shadow-2xl reveal-on-scroll">
            <div class="aspect-square overflow-hidden relative p-8 flex items-center justify-center" style="background: radial-gradient(circle, #ffffff 0%, #f0f0f0 100%)">
                <img src="${product.images[0]}" alt="${product.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-700">
                <div class="absolute top-4 left-4">
                    <span class="px-3 py-1 bg-dark text-white text-[9px] font-bold uppercase tracking-widest">${product.id.toUpperCase()}</span>
                </div>
            </div>
            <div class="p-8">
                <div class="text-[10px] text-accent font-bold mb-2 uppercase tracking-[0.2em]">${product.category}</div>
                <h3 class="font-oswald text-2xl font-bold text-dark uppercase mb-4 leading-tight group-hover:text-accent transition-colors">${product.name}</h3>
                <p class="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-6">${product.description}</p>

                <table class="w-full text-[10px] text-gray-400 border-t border-gray-50 mt-4">
                    <tr class="border-b border-gray-50">
                        <td class="py-2 font-bold uppercase">Size</td>
                        <td class="py-2 text-right text-dark font-semibold">${product.specs['Product Size'] || '-'}</td>
                    </tr>
                    <tr class="border-b border-gray-50">
                        <td class="py-2 font-bold uppercase">Load</td>
                        <td class="py-2 text-right text-dark font-semibold">${product.specs['Total Capacity'] || '-'}</td>
                    </tr>
                </table>
            </div>
        </a>
    `).join('');
}

window.addEventListener('hashchange', () => {
    renderCategories();
    renderProducts();
    window.scrollTo({ top: 300, behavior: 'smooth' });
});

renderCategories();
renderProducts();
