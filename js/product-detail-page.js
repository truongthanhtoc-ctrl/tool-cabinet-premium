import { products } from './products-data.js';

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');
const product = products.find((item) => item.id === productId);

const productContent = document.getElementById('product-content');
const breadcrumbCurrent = document.getElementById('breadcrumb-current');

if (!productContent || !breadcrumbCurrent) {
    throw new Error('Product detail page container elements are missing.');
}

if (!product) {
    productContent.innerHTML = `
        <div class="text-center py-20">
            <h2 class="text-3xl font-oswald text-white mb-4">Product Not Found</h2>
            <a href="/products/" class="text-accent hover:underline">Return to Catalog</a>
        </div>
    `;
    breadcrumbCurrent.textContent = 'Not Found';
} else {
    document.title = `${product.name} | SAFEWELL`;
    breadcrumbCurrent.textContent = product.name;

    productContent.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20 reveal-on-scroll">
            <div>
                <div class="overflow-hidden border border-white/5 mb-4 h-[500px] flex items-center justify-center" style="background: radial-gradient(circle, #ffffff 0%, #f0f0f0 100%)">
                    <img src="${product.images[0]}" alt="${product.name}" class="max-h-full max-w-full object-contain p-8 transition-transform hover:scale-105 duration-700">
                </div>
                <div class="grid grid-cols-4 gap-4">
                    ${product.images.slice(0, 4).map((img) => `
                        <div class="border border-white/5 overflow-hidden h-24 flex items-center justify-center cursor-pointer hover:border-accent transition-colors" style="background: radial-gradient(circle, #ffffff 0%, #f0f0f0 100%)">
                            <img src="${img}" class="max-h-full max-w-full object-contain p-2">
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="flex flex-col justify-center">
                <div class="text-accent font-bold text-[10px] uppercase tracking-[0.3em] mb-4">${product.category}</div>
                <h1 class="text-4xl md:text-6xl font-oswald font-bold text-white mb-8 uppercase leading-tight tracking-tighter">${product.name}</h1>

                <p class="text-gray-400 leading-relaxed mb-10 text-lg font-light border-l-2 border-accent pl-6">${product.description}</p>

                <div class="flex flex-col sm:flex-row gap-4">
                    <a href="/contact/?interest=${encodeURIComponent(product.name)}" class="btn-primary py-5 px-10 text-sm justify-center">
                        REQUEST FACTORY PRICE
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                        </svg>
                    </a>
                    <a href="/contact/" class="btn-outline py-5 px-10 text-sm justify-center border-white/10 hover:border-white">
                        TECHNICAL CONSULTATION
                    </a>
                </div>
            </div>
        </div>

        <div class="border-t border-white/5 pt-20">
            <div class="flex flex-col lg:flex-row gap-20">
                <div class="w-full lg:w-1/3 reveal-on-scroll">
                    <h3 class="text-3xl font-oswald text-white mb-8 uppercase tracking-tight">Key Features</h3>
                    <ul class="space-y-6">
                        ${product.features.map((feature) => `
                            <li class="flex items-start text-gray-400 group">
                                <span class="text-accent mr-4 mt-1">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                </span>
                                <span class="text-sm leading-relaxed">${feature}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="w-full lg:w-2/3 reveal-on-scroll" style="transition-delay: 100ms;">
                    <h3 class="text-3xl font-oswald text-white mb-8 uppercase tracking-tight">Technical Specifications</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 border border-white/5">
                        ${Object.entries(product.specs).map(([key, value]) => `
                            <div class="bg-dark p-6 flex justify-between items-center group hover:bg-white/5 transition-colors">
                                <span class="text-gray-500 text-[10px] font-bold uppercase tracking-widest">${key}</span>
                                <span class="text-white font-semibold text-sm">${value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}
