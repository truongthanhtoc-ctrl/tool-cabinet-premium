import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const resolveQuoteApiUrl = () => {
    const envApiUrl = import.meta.env.VITE_QUOTE_API_URL;
    if (envApiUrl) {
        return envApiUrl;
    }

    const hostname = window.location.hostname;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (import.meta.env.DEV || isLocalHost) {
        return 'http://localhost:3001/api/quote';
    }

    return '/api/quote';
};

const getApiNetworkErrorMessage = () => {
    if (import.meta.env.DEV) {
        return 'Network error. Quote API is offline. Start it with: cd api && npm run dev';
    }
    return 'Network error. Please check your connection and try again.';
};

const parseJsonResponse = async (response) => {
    try {
        return await response.json();
    } catch {
        return {
            success: false,
            error: 'Unexpected server response from API.'
        };
    }
};

if (typeof window !== 'undefined') {
    const injectModal = () => {
        if (document.getElementById('quote-modal')) {
            return;
        }

        const modalHTML = `
            <div id="quote-modal" class="modal-overlay">
                <div class="modal-content">
                    <button class="modal-close">&times;</button>
                    <h2 class="modal-title">Get a Quick Quote</h2>
                    <p class="modal-subtitle">Tell us what you need, and we'll get back to you within 24 hours.</p>

                    <form id="quote-form">
                        <div class="form-group">
                            <label class="form-label" for="quote-name">Full Name</label>
                            <input type="text" id="quote-name" class="form-input" placeholder="John Doe" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="quote-email">Business Email</label>
                            <input type="email" id="quote-email" class="form-input" placeholder="john@company.com" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="quote-company">Company Name</label>
                            <input type="text" id="quote-company" class="form-input" placeholder="Safewell Inc.">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="quote-whatsapp">WhatsApp (Optional)</label>
                            <input type="text" id="quote-whatsapp" class="form-input" placeholder="+1 234 567 8900">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Attachment (Optional)</label>
                            <div class="file-upload-wrapper">
                                <label for="quote-attachment" class="file-upload-label">Choose File</label>
                                <span id="file-name-display" class="file-name-display">No file chosen</span>
                                <input type="file" id="quote-attachment" style="display: none;">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="quote-message">Project Details</label>
                            <textarea id="quote-message" class="form-textarea" placeholder="I'm interested in..." required></textarea>
                        </div>
                        <button type="submit" class="form-submit">Submit Request</button>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('quote-modal');
        const closeBtn = modal?.querySelector('.modal-close');
        const form = document.getElementById('quote-form');
        const fileInput = document.getElementById('quote-attachment');
        const fileNameDisplay = document.getElementById('file-name-display');

        if (!modal || !closeBtn || !form) {
            return;
        }

        if (fileInput && fileNameDisplay) {
            fileInput.addEventListener('change', (event) => {
                if (event.target.files.length > 0) {
                    fileNameDisplay.textContent = event.target.files[0].name;
                } else {
                    fileNameDisplay.textContent = 'No file chosen';
                }
            });
        }

        const closeModal = () => {
            modal.classList.remove('open');
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const submitButton = form.querySelector('button[type="submit"]');
            if (!submitButton) {
                return;
            }

            const originalButtonText = submitButton.innerText;
            submitButton.innerText = 'Sending...';
            submitButton.disabled = true;

            const showSuccessState = () => {
                const modalContent = modal.querySelector('.modal-content');
                if (!modalContent) {
                    return;
                }

                modalContent.innerHTML = `
                    <div class="modal-success">
                        <div class="success-icon">
                            <svg viewBox="0 0 52 52" class="checkmark">
                                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                            </svg>
                        </div>
                        <h2 class="success-title">Request Submitted!</h2>
                        <p class="success-message">Thank you for your inquiry. Our team will contact you within 24 hours.</p>
                        <button class="success-close-btn">Done</button>
                    </div>
                `;

                const doneButton = modalContent.querySelector('.success-close-btn');
                if (doneButton) {
                    doneButton.addEventListener('click', () => {
                        closeModal();
                        setTimeout(() => {
                            window.location.reload();
                        }, 300);
                    });
                }

                setTimeout(() => {
                    closeModal();
                    setTimeout(() => {
                        window.location.reload();
                    }, 300);
                }, 5000);
            };

            const showError = (message) => {
                const errorEl = document.createElement('div');
                errorEl.className = 'form-error';
                errorEl.textContent = message;

                const existing = form.querySelector('.form-error');
                if (existing) {
                    existing.remove();
                }

                form.insertBefore(errorEl, submitButton);
                setTimeout(() => {
                    errorEl.remove();
                }, 5000);
            };

            const formData = new FormData();
            formData.append('name', document.getElementById('quote-name')?.value.trim() || '');
            formData.append('email', document.getElementById('quote-email')?.value.trim() || '');
            formData.append('company', document.getElementById('quote-company')?.value.trim() || '');
            formData.append('whatsapp', document.getElementById('quote-whatsapp')?.value.trim() || '');
            formData.append('message', document.getElementById('quote-message')?.value.trim() || '');

            if (fileInput?.files?.[0]) {
                formData.append('attachment', fileInput.files[0]);
            }

            try {
                const response = await fetch(resolveQuoteApiUrl(), {
                    method: 'POST',
                    body: formData
                });

                const result = await parseJsonResponse(response);

                if (response.ok && result.success) {
                    showSuccessState();
                    return;
                }

                showError(result.error || 'Failed to submit. Please try again.');
            } catch (error) {
                console.error('Quote form submission error:', error);
                showError(getApiNetworkErrorMessage());
            } finally {
                submitButton.innerText = originalButtonText;
                submitButton.disabled = false;
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectModal);
    } else {
        injectModal();
    }

    window.addEventListener('click', (event) => {
        const target = event.target.closest('a');
        if (!target) {
            return;
        }

        const href = target.getAttribute('href');
        const shouldOpenQuoteModal = href && (
            href.includes('quote') ||
            (href.includes('contact') && target.classList.contains('btn-primary'))
        );

        if (!shouldOpenQuoteModal) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const modal = document.getElementById('quote-modal');
        if (modal) {
            modal.classList.add('open');
        }
    }, true);
}

let revealObserverInitialized = false;

const setupRevealObserver = () => {
    if (revealObserverInitialized) {
        return;
    }

    revealObserverInitialized = true;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.1 });

    const observeNewElements = () => {
        document.querySelectorAll('.reveal-on-scroll:not(.observed)').forEach((element) => {
            observer.observe(element);
            element.classList.add('observed');
        });
    };

    observeNewElements();

    const mutationObserver = new MutationObserver(() => {
        observeNewElements();
    });

    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
};

const setupCounter = () => {
    const counters = document.querySelectorAll('.animate-counter');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            const target = entry.target;
            const countTo = Number.parseInt(target.getAttribute('data-count') || '0', 10);
            let current = 0;
            const duration = 2000;
            const increment = countTo / (duration / 16);

            const updateCount = () => {
                current += increment;
                if (current < countTo) {
                    target.innerText = Math.floor(current).toString();
                    requestAnimationFrame(updateCount);
                    return;
                }

                target.innerText = countTo.toString();
            };

            updateCount();
            observer.unobserve(target);
        });
    }, { threshold: 1 });

    counters.forEach((counter) => observer.observe(counter));
};

const setupMagneticButtons = () => {
    const buttons = document.querySelectorAll('.btn-primary');

    buttons.forEach((button) => {
        button.addEventListener('mousemove', (event) => {
            const rect = button.getBoundingClientRect();
            const x = event.clientX - rect.left - rect.width / 2;
            const y = event.clientY - rect.top - rect.height / 2;
            button.style.transform = `translate(${x * 0.2}px, ${y * 0.5}px)`;
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translate(0, 0)';
        });
    });
};

const setupMobileNavigation = () => {
    const navbar = document.getElementById('navbar');
    if (!navbar) {
        return;
    }

    const navInner = navbar.querySelector(':scope > div');
    if (!navInner) {
        return;
    }

    const desktopMenu = navInner.querySelector('div.hidden.md\\:flex');
    const menuButton = navInner.querySelector('button.md\\:hidden');
    if (!desktopMenu || !menuButton) {
        return;
    }

    if (navbar.querySelector('.mobile-nav-layer')) {
        return;
    }

    const escapeHtml = (value) => value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');

    const links = [];
    Array.from(desktopMenu.children).forEach((child) => {
        const anchor = child.matches('a[href]') ? child : child.querySelector(':scope > a[href]');
        if (!anchor) {
            return;
        }

        const href = anchor.getAttribute('href') || '';
        const label = anchor.textContent?.replace(/\s+/g, ' ').trim() || '';
        if (!href || href === '#' || !label) {
            return;
        }

        const isActive = anchor.classList.contains('text-accent') || anchor.classList.contains('bg-white/10');
        links.push({
            href,
            label,
            isActive
        });
    });

    const dedupedLinks = [];
    const seen = new Set();
    links.forEach((link) => {
        if (seen.has(link.href)) {
            return;
        }
        seen.add(link.href);
        dedupedLinks.push(link);
    });

    if (dedupedLinks.length === 0) {
        return;
    }

    const ctaLink = navInner.querySelector('a.hidden.md\\:block[href]');
    const ctaHref = ctaLink?.getAttribute('href') || '';
    const rawCtaLabel = ctaLink?.textContent?.replace(/\s+/g, ' ').trim() || 'REQUEST FACTORY PRICE';
    const ctaLabel = /REQUEST FACTORY PRICE/i.test(rawCtaLabel) ? 'REQUEST PRICE' : rawCtaLabel;

    const layer = document.createElement('div');
    layer.className = 'mobile-nav-layer';
    layer.innerHTML = `
        <div class="mobile-nav-backdrop" data-mobile-nav-close="true"></div>
        <div class="mobile-nav-panel" id="mobile-nav-panel" role="dialog" aria-label="Mobile navigation">
            <div class="mobile-nav-links">
                ${dedupedLinks.map((link) => `
                    <a href="${escapeHtml(link.href)}" class="mobile-nav-link ${link.isActive ? 'is-active' : ''}">
                        ${escapeHtml(link.label)}
                    </a>
                `).join('')}
            </div>
            ${ctaHref ? `<a href="${escapeHtml(ctaHref)}" class="mobile-nav-cta">${escapeHtml(ctaLabel)}</a>` : ''}
        </div>
    `;

    navbar.appendChild(layer);
    menuButton.classList.add('mobile-nav-button');
    menuButton.setAttribute('aria-controls', 'mobile-nav-panel');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation menu');

    const syncLayerOffset = () => {
        const navHeight = Math.round(navbar.getBoundingClientRect().height);
        layer.style.setProperty('--mobile-nav-top', `${Math.max(56, navHeight)}px`);
    };

    const closeMenu = () => {
        layer.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open navigation menu');
        document.body.classList.remove('mobile-nav-open');
    };

    const openMenu = () => {
        syncLayerOffset();
        layer.classList.add('is-open');
        menuButton.setAttribute('aria-expanded', 'true');
        menuButton.setAttribute('aria-label', 'Close navigation menu');
        document.body.classList.add('mobile-nav-open');
    };

    menuButton.addEventListener('click', (event) => {
        event.preventDefault();
        if (layer.classList.contains('is-open')) {
            closeMenu();
            return;
        }
        openMenu();
    });

    layer.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        if (target.closest('[data-mobile-nav-close]')) {
            closeMenu();
            return;
        }

        if (target.closest('.mobile-nav-link') || target.closest('.mobile-nav-cta')) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && layer.classList.contains('is-open')) {
            closeMenu();
        }
    });

    window.addEventListener('resize', () => {
        syncLayerOffset();
        if (window.innerWidth >= 768) {
            closeMenu();
        }
    });

    window.addEventListener('scroll', () => {
        if (layer.classList.contains('is-open')) {
            syncLayerOffset();
        }
    }, { passive: true });

    syncLayerOffset();
};

const setupContactForm = () => {
    const form = document.getElementById('contact-form');
    if (!form) {
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const statusEl = document.getElementById('contact-form-status');
    if (!submitButton || !statusEl) {
        return;
    }

    const setStatus = (message, isError = false) => {
        if (!message) {
            statusEl.textContent = '';
            statusEl.classList.add('hidden');
            statusEl.classList.remove('text-red-400', 'text-green-400');
            return;
        }

        statusEl.textContent = message;
        statusEl.classList.remove('hidden', 'text-red-400', 'text-green-400');
        statusEl.classList.add(isError ? 'text-red-400' : 'text-green-400');
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const originalText = submitButton.innerText;
        submitButton.innerText = 'Submitting...';
        submitButton.disabled = true;
        setStatus('');

        const formData = new FormData();
        const name = form.querySelector('[name="name"]')?.value.trim() || '';
        const company = form.querySelector('[name="company"]')?.value.trim() || '';
        const email = form.querySelector('[name="email"]')?.value.trim() || '';
        const interest = form.querySelector('[name="interest"]')?.value.trim() || '';
        const projectMessage = form.querySelector('[name="message"]')?.value.trim() || '';

        if (!name || !email || !projectMessage) {
            setStatus('Please complete name, email, and project details.', true);
            submitButton.innerText = originalText;
            submitButton.disabled = false;
            return;
        }

        const message = interest
            ? `Interest: ${interest}\n\n${projectMessage}`
            : projectMessage;

        formData.append('name', name);
        formData.append('email', email);
        formData.append('company', company);
        formData.append('message', message);

        try {
            const response = await fetch(resolveQuoteApiUrl(), {
                method: 'POST',
                body: formData
            });

            const result = await parseJsonResponse(response);

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to submit. Please try again.');
            }

            form.reset();
            setStatus('Request submitted successfully. We will contact you within 24 hours.');
        } catch (error) {
            console.error('Contact page form submission error:', error);
            if (error instanceof TypeError) {
                setStatus(getApiNetworkErrorMessage(), true);
            } else {
                setStatus(error.message || 'Network error. Please try again.', true);
            }
        } finally {
            submitButton.innerText = originalText;
            submitButton.disabled = false;
        }
    });
};

const CABINET_COLOR_MAP = {
    navy: {
        label: 'Navy Blue',
        drawer: '#1f4b84',
        accent: '#11365f'
    },
    red: {
        label: 'Crimson Red',
        drawer: '#b72736',
        accent: '#8f1a28'
    },
    black: {
        label: 'Matte Black',
        drawer: '#30343a',
        accent: '#1c1f24'
    },
    silver: {
        label: 'Industrial Silver',
        drawer: '#9aa3b0',
        accent: '#6f7b89'
    },
    white: {
        label: 'Arctic White',
        drawer: '#f2f4f7',
        accent: '#c4cedb'
    },
    orange: {
        label: 'Safety Orange',
        drawer: '#e36a1f',
        accent: '#b24f15'
    },
    green: {
        label: 'Racing Green',
        drawer: '#1f6d4c',
        accent: '#154b35'
    }
};

const POWER_STANDARD_MAP = {
    us: {
        label: 'US Type B (NEMA 5-15)',
        shortLabel: 'US'
    },
    uk: {
        label: 'UK Type G',
        shortLabel: 'UK'
    },
    eu: {
        label: 'EU Type F (Schuko)',
        shortLabel: 'EU'
    },
    au: {
        label: 'AU Type I',
        shortLabel: 'AU'
    }
};

const clampRgbValue = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        return 0;
    }
    return Math.max(0, Math.min(255, parsed));
};

const componentToHex = (component) => clampRgbValue(component).toString(16).padStart(2, '0');

const rgbToHex = (r, g, b) => `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;

const hexToRgb = (hex) => {
    const normalized = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return { r: 31, g: 75, b: 132 };
    }

    return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16)
    };
};

const darkenHex = (hex, factor = 0.58) => {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(Math.round(r * factor), Math.round(g * factor), Math.round(b * factor));
};

const setupCabinetConfigurator = () => {
    const root = document.getElementById('cabinet-configurator');
    if (!root) {
        return;
    }

    const colorButtons = Array.from(root.querySelectorAll('.config-color-btn'));
    const customColorInput = document.getElementById('config-custom-color');
    const customColorChip = document.getElementById('config-custom-chip');
    const colorRInput = document.getElementById('config-color-r');
    const colorGInput = document.getElementById('config-color-g');
    const colorBInput = document.getElementById('config-color-b');
    const drawerCountSelect = document.getElementById('config-drawer-count');
    const lockInputs = Array.from(root.querySelectorAll('input[name="config-lock"]'));
    const powerAddonInput = document.getElementById('config-addon-power');
    const powerStandardSelect = document.getElementById('config-power-standard');
    const pegboardAddonInput = document.getElementById('config-addon-pegboard');
    const brandNameInput = document.getElementById('config-brand-name');
    const summaryEl = document.getElementById('config-summary');
    const applyQuoteBtn = document.getElementById('apply-config-to-quote');
    const preview3dView = document.getElementById('cabinet-3d-view');

    const badgeColor = document.getElementById('preview-badge-color');
    const badgeDrawers = document.getElementById('preview-badge-drawers');
    const badgeLock = document.getElementById('preview-badge-lock');
    const badgeAddons = document.getElementById('preview-badge-addons');

    if (
        !drawerCountSelect ||
        !customColorInput ||
        !customColorChip ||
        !colorRInput ||
        !colorGInput ||
        !colorBInput ||
        !powerAddonInput ||
        !powerStandardSelect ||
        !pegboardAddonInput ||
        !brandNameInput ||
        !summaryEl ||
        !preview3dView ||
        !badgeColor ||
        !badgeDrawers ||
        !badgeLock ||
        !badgeAddons
    ) {
        return;
    }

    const state = {
        color: 'navy',
        customHex: (customColorInput.value || '#1f4b84').toLowerCase(),
        drawers: Number.parseInt(drawerCountSelect.value, 10) || 11,
        lock: 'smart',
        brand: (brandNameInput.value || 'YOUR BRAND').trim(),
        powerStandard: POWER_STANDARD_MAP[powerStandardSelect.value] ? powerStandardSelect.value : 'us',
        addons: {
            power: powerAddonInput.checked,
            pegboard: pegboardAddonInput.checked
        }
    };

    const cabinetSize = {
        width: 3.2,
        height: 1.9,
        depth: 1.5
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f2f4f7');

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(4.6, 2.1, 4.5);

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch (error) {
        console.error('3D renderer initialization failed:', error);
        preview3dView.innerHTML = '<p class="text-sm text-gray-500 p-4">3D preview is unavailable on this device.</p>';
        return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    preview3dView.innerHTML = '';
    preview3dView.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 9.5;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI - 0.12;
    controls.target.set(0, 0.05, 0);
    controls.update();

    const desktopCameraPreset = {
        fov: 38,
        minDistance: 3.2,
        maxDistance: 9.5,
        targetY: 0.05,
        position: new THREE.Vector3(4.6, 2.1, 4.5)
    };

    const mobileCameraPreset = {
        fov: 48,
        minDistance: 4.4,
        maxDistance: 12,
        targetY: 0.12,
        position: new THREE.Vector3(5.6, 2.5, 5.8)
    };

    let lastViewportIsMobile = null;

    const applyResponsiveCamera = (forceReset = false) => {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const preset = isMobile ? mobileCameraPreset : desktopCameraPreset;
        const changedViewportType = lastViewportIsMobile !== isMobile;

        controls.minDistance = preset.minDistance;
        controls.maxDistance = preset.maxDistance;
        controls.target.y = preset.targetY;
        camera.fov = preset.fov;

        const currentDistance = camera.position.length();
        const minimumRecommended = isMobile ? 6.4 : 4.5;
        if (forceReset || changedViewportType || currentDistance < minimumRecommended) {
            camera.position.copy(preset.position);
        }

        camera.updateProjectionMatrix();
        controls.update();
        lastViewportIsMobile = isMobile;
    };

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#9ca8b8', 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#ffffff', 1.25);
    keyLight.position.set(4.5, 5.2, 3.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#bcd3ff', 0.7);
    rimLight.position.set(-4.2, 2.6, -4.8);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 18),
        new THREE.MeshStandardMaterial({
            color: '#e5eaf0',
            roughness: 0.95,
            metalness: 0.03
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -cabinetSize.height / 2 - 0.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const backdrop = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 8),
        new THREE.MeshBasicMaterial({ color: '#eef2f7' })
    );
    backdrop.position.set(0, 1.5, -5.5);
    scene.add(backdrop);

    const materials = {
        body: new THREE.MeshStandardMaterial({
            color: '#1f4b84',
            roughness: 0.54,
            metalness: 0.26
        }),
        accent: new THREE.MeshStandardMaterial({
            color: '#11365f',
            roughness: 0.46,
            metalness: 0.32
        }),
        drawer: new THREE.MeshStandardMaterial({
            color: '#1f4b84',
            roughness: 0.5,
            metalness: 0.3
        }),
        handle: new THREE.MeshStandardMaterial({
            color: '#10151b',
            roughness: 0.3,
            metalness: 0.64
        }),
        smartPanel: new THREE.MeshStandardMaterial({
            color: '#0b0f15',
            roughness: 0.38,
            metalness: 0.62
        }),
        smartLed: new THREE.MeshStandardMaterial({
            color: '#2d8dff',
            emissive: '#2d8dff',
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.15
        }),
        smartKey: new THREE.MeshStandardMaterial({
            color: '#2a3443',
            roughness: 0.35,
            metalness: 0.45
        }),
        lockPlate: new THREE.MeshStandardMaterial({
            color: '#d2dae5',
            roughness: 0.28,
            metalness: 0.8
        }),
        lockHole: new THREE.MeshStandardMaterial({
            color: '#4e5867',
            roughness: 0.28,
            metalness: 0.84
        }),
        addon: new THREE.MeshStandardMaterial({
            color: '#909bad',
            roughness: 0.52,
            metalness: 0.4
        }),
        pegboard: new THREE.MeshStandardMaterial({
            color: '#c0cad6',
            roughness: 0.72,
            metalness: 0.24
        }),
        pegboardHole: new THREE.MeshStandardMaterial({
            color: '#5a6576',
            roughness: 0.3,
            metalness: 0.7
        }),
        casterFork: new THREE.MeshStandardMaterial({
            color: '#586273',
            roughness: 0.35,
            metalness: 0.76
        }),
        casterWheel: new THREE.MeshStandardMaterial({
            color: '#1a1f28',
            roughness: 0.86,
            metalness: 0.12
        }),
        casterHub: new THREE.MeshStandardMaterial({
            color: '#b3becd',
            roughness: 0.28,
            metalness: 0.84
        }),
        casterBrake: new THREE.MeshStandardMaterial({
            color: '#6c7788',
            roughness: 0.38,
            metalness: 0.58
        })
    };

    const cabinetRoot = new THREE.Group();
    scene.add(cabinetRoot);

    const bodyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(cabinetSize.width, cabinetSize.height, cabinetSize.depth),
        materials.body
    );
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    cabinetRoot.add(bodyMesh);

    const topCapMesh = new THREE.Mesh(
        new THREE.BoxGeometry(cabinetSize.width * 0.94, 0.08, cabinetSize.depth * 0.86),
        materials.accent
    );
    topCapMesh.position.set(0, cabinetSize.height / 2 - 0.05, 0);
    topCapMesh.castShadow = true;
    cabinetRoot.add(topCapMesh);

    const accentStripMesh = new THREE.Mesh(
        new THREE.BoxGeometry(cabinetSize.width * 0.94, 0.09, 0.04),
        materials.accent
    );
    accentStripMesh.position.set(0, cabinetSize.height / 2 - 0.28, cabinetSize.depth / 2 + 0.03);
    accentStripMesh.castShadow = true;
    cabinetRoot.add(accentStripMesh);

    const castersGroup = new THREE.Group();
    const casterSpecs = [
        { x: cabinetSize.width / 2 - 0.24, z: cabinetSize.depth / 2 - 0.21, swivel: 0.52, brake: true },
        { x: -cabinetSize.width / 2 + 0.24, z: cabinetSize.depth / 2 - 0.21, swivel: -0.34, brake: true },
        { x: cabinetSize.width / 2 - 0.24, z: -cabinetSize.depth / 2 + 0.21, swivel: 0.36, brake: false },
        { x: -cabinetSize.width / 2 + 0.24, z: -cabinetSize.depth / 2 + 0.21, swivel: -0.44, brake: false }
    ];

    casterSpecs.forEach((spec) => {
        const caster = new THREE.Group();
        caster.position.set(spec.x, -cabinetSize.height / 2 - 0.01, spec.z);

        const casterTopPlate = new THREE.Mesh(
            new THREE.BoxGeometry(0.19, 0.026, 0.16),
            materials.casterFork
        );
        casterTopPlate.position.y = -0.013;
        casterTopPlate.castShadow = true;
        caster.add(casterTopPlate);

        const swivelHead = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.018, 24),
            materials.casterFork
        );
        swivelHead.position.y = -0.036;
        swivelHead.castShadow = true;
        caster.add(swivelHead);

        const casterStem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.018, 0.018, 0.058, 18),
            materials.casterFork
        );
        casterStem.position.y = -0.074;
        casterStem.castShadow = true;
        caster.add(casterStem);

        const forkBridge = new THREE.Mesh(
            new THREE.BoxGeometry(0.066, 0.02, 0.11),
            materials.casterFork
        );
        forkBridge.position.y = -0.112;
        forkBridge.castShadow = true;
        caster.add(forkBridge);

        const forkArmLeft = new THREE.Mesh(
            new THREE.BoxGeometry(0.022, 0.095, 0.012),
            materials.casterFork
        );
        forkArmLeft.position.set(0, -0.15, 0.036);
        forkArmLeft.castShadow = true;
        caster.add(forkArmLeft);

        const forkArmRight = forkArmLeft.clone();
        forkArmRight.position.z = -0.036;
        caster.add(forkArmRight);

        const casterWheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.072, 0.072, 0.056, 30),
            materials.casterWheel
        );
        casterWheel.rotation.x = Math.PI / 2;
        casterWheel.position.y = -0.162;
        casterWheel.castShadow = true;
        caster.add(casterWheel);

        const wheelRimNear = new THREE.Mesh(
            new THREE.CylinderGeometry(0.052, 0.052, 0.008, 30),
            materials.casterHub
        );
        wheelRimNear.rotation.x = Math.PI / 2;
        wheelRimNear.position.set(0, -0.162, 0.025);
        caster.add(wheelRimNear);

        const wheelRimFar = wheelRimNear.clone();
        wheelRimFar.position.z = -0.025;
        caster.add(wheelRimFar);

        const casterHub = new THREE.Mesh(
            new THREE.CylinderGeometry(0.014, 0.014, 0.07, 20),
            materials.casterHub
        );
        casterHub.rotation.x = Math.PI / 2;
        casterHub.position.y = -0.162;
        caster.add(casterHub);

        if (spec.brake) {
            const brakePedal = new THREE.Mesh(
                new THREE.BoxGeometry(0.052, 0.018, 0.032),
                materials.casterBrake
            );
            brakePedal.position.set(0.052, -0.114, 0.024);
            brakePedal.rotation.z = -0.28;
            brakePedal.castShadow = true;
            caster.add(brakePedal);

            const brakeArm = new THREE.Mesh(
                new THREE.BoxGeometry(0.038, 0.012, 0.016),
                materials.casterBrake
            );
            brakeArm.position.set(0.028, -0.126, 0.024);
            brakeArm.rotation.z = -0.2;
            caster.add(brakeArm);
        }

        caster.rotation.y = spec.swivel;
        castersGroup.add(caster);
    });
    cabinetRoot.add(castersGroup);

    const drawersGroup = new THREE.Group();
    cabinetRoot.add(drawersGroup);

    const lockX = 0;
    const lockY = cabinetSize.height / 2 - 0.12;
    const cabinetFrontZ = cabinetSize.depth / 2;
    const lockZ = cabinetFrontZ - 0.008;

    const smartLockGroup = new THREE.Group();
    const smartFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.11, 0.01),
        materials.smartKey
    );
    smartFrame.position.set(lockX, lockY, lockZ - 0.002);
    smartFrame.castShadow = true;
    smartLockGroup.add(smartFrame);

    const smartPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.09, 0.012),
        materials.smartPanel
    );
    smartPanel.position.set(lockX, lockY, lockZ);
    smartPanel.castShadow = true;
    smartLockGroup.add(smartPanel);

    const smartScreen = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.028, 0.004),
        materials.smartLed
    );
    smartScreen.position.set(lockX - 0.14, lockY + 0.01, lockZ + 0.007);
    smartLockGroup.add(smartScreen);

    const keypadCols = 4;
    const keypadRows = 3;
    const keypadStartX = lockX - 0.03;
    const keypadStartY = lockY + 0.02;
    const keypadStepX = 0.035;
    const keypadStepY = 0.024;
    for (let row = 0; row < keypadRows; row += 1) {
        for (let col = 0; col < keypadCols; col += 1) {
            const key = new THREE.Mesh(
                new THREE.BoxGeometry(0.024, 0.014, 0.003),
                materials.smartKey
            );
            key.position.set(
                keypadStartX + col * keypadStepX,
                keypadStartY - row * keypadStepY,
                lockZ + 0.007
            );
            smartLockGroup.add(key);
        }
    }

    const fingerprintRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.013, 0.0032, 16, 30),
        materials.lockPlate
    );
    fingerprintRing.position.set(lockX + 0.165, lockY + 0.002, lockZ + 0.007);
    smartLockGroup.add(fingerprintRing);

    const fingerprintCore = new THREE.Mesh(
        new THREE.CircleGeometry(0.008, 20),
        materials.smartKey
    );
    fingerprintCore.position.set(lockX + 0.165, lockY + 0.002, lockZ + 0.0074);
    smartLockGroup.add(fingerprintCore);

    const statusLed = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.003, 16),
        materials.smartLed
    );
    statusLed.position.set(lockX + 0.185, lockY - 0.028, lockZ + 0.007);
    statusLed.rotation.x = Math.PI / 2;
    smartLockGroup.add(statusLed);
    cabinetRoot.add(smartLockGroup);

    const standardLockGroup = new THREE.Group();
    const lockMount = new THREE.Mesh(
        new THREE.BoxGeometry(0.17, 0.12, 0.01),
        materials.lockPlate
    );
    lockMount.position.set(lockX, lockY, lockZ);
    lockMount.castShadow = true;
    standardLockGroup.add(lockMount);

    const lockRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.032, 0.008, 16, 30),
        materials.lockHole
    );
    lockRing.position.set(lockX, lockY, lockZ + 0.004);
    standardLockGroup.add(lockRing);

    const lockCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.013, 0.01, 20),
        materials.lockHole
    );
    lockCore.rotation.x = Math.PI / 2;
    lockCore.position.set(lockX, lockY, lockZ + 0.005);
    standardLockGroup.add(lockCore);

    const lockSlot = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, 0.005, 0.008),
        materials.lockPlate
    );
    lockSlot.position.set(lockX, lockY, lockZ + 0.006);
    standardLockGroup.add(lockSlot);
    cabinetRoot.add(standardLockGroup);

    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 1024;
    logoCanvas.height = 256;
    const logoContext = logoCanvas.getContext('2d');
    const logoTexture = new THREE.CanvasTexture(logoCanvas);
    logoTexture.colorSpace = THREE.SRGBColorSpace;
    logoTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

    const logoPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.56, 0.16),
        new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true })
    );
    logoPlate.position.set(cabinetSize.width / 2 - 0.3, cabinetSize.height / 2 - 0.12, cabinetSize.depth / 2 + 0.09);
    cabinetRoot.add(logoPlate);

    const powerAddonGroup = new THREE.Group();
    const powerModuleCenter = {
        x: cabinetSize.width / 2 + 0.035,
        y: cabinetSize.height / 2 - 0.27,
        z: 0.02
    };

    const powerBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.11, 0.8),
        materials.addon
    );
    powerBody.position.set(powerModuleCenter.x, powerModuleCenter.y, powerModuleCenter.z);
    powerBody.castShadow = true;
    powerAddonGroup.add(powerBody);

    const powerFace = new THREE.Mesh(
        new THREE.BoxGeometry(0.006, 0.095, 0.76),
        materials.lockPlate
    );
    powerFace.position.set(powerModuleCenter.x + 0.026, powerModuleCenter.y, powerModuleCenter.z);
    powerAddonGroup.add(powerFace);

    const powerUsbHub = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.045, 0.1),
        materials.smartPanel
    );
    powerUsbHub.position.set(powerModuleCenter.x + 0.03, powerModuleCenter.y + 0.027, powerModuleCenter.z + 0.3);
    powerAddonGroup.add(powerUsbHub);

    const usbPortA = new THREE.Mesh(
        new THREE.BoxGeometry(0.006, 0.014, 0.03),
        materials.lockPlate
    );
    usbPortA.position.set(powerModuleCenter.x + 0.034, powerModuleCenter.y + 0.037, powerModuleCenter.z + 0.3);
    powerAddonGroup.add(usbPortA);

    const usbPortC = usbPortA.clone();
    usbPortC.position.y = powerModuleCenter.y + 0.017;
    usbPortC.scale.z = 0.72;
    powerAddonGroup.add(usbPortC);

    const powerStatus = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.006, 16),
        materials.smartLed
    );
    powerStatus.rotation.x = Math.PI / 2;
    powerStatus.position.set(powerModuleCenter.x + 0.034, powerModuleCenter.y - 0.032, powerModuleCenter.z + 0.3);
    powerAddonGroup.add(powerStatus);

    const socketVariantMaterial = materials.smartPanel;
    const powerStandardGroups = {
        us: new THREE.Group(),
        uk: new THREE.Group(),
        eu: new THREE.Group(),
        au: new THREE.Group()
    };

    const addSocketBackplate = (group, zCenter) => {
        const backplate = new THREE.Mesh(
            new THREE.BoxGeometry(0.006, 0.058, 0.11),
            materials.casterFork
        );
        backplate.position.set(powerModuleCenter.x + 0.032, powerModuleCenter.y - 0.002, zCenter);
        group.add(backplate);
    };

    const socketPositions = [powerModuleCenter.z + 0.14, powerModuleCenter.z - 0.14];

    socketPositions.forEach((zCenter) => {
        addSocketBackplate(powerStandardGroups.us, zCenter);
        const usLeft = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.02, 0.006), socketVariantMaterial);
        usLeft.position.set(powerModuleCenter.x + 0.036, powerModuleCenter.y + 0.008, zCenter - 0.014);
        powerStandardGroups.us.add(usLeft);
        const usRight = usLeft.clone();
        usRight.position.z = zCenter + 0.014;
        powerStandardGroups.us.add(usRight);
        const usGround = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.005, 12), socketVariantMaterial);
        usGround.rotation.x = Math.PI / 2;
        usGround.position.set(powerModuleCenter.x + 0.036, powerModuleCenter.y - 0.014, zCenter);
        powerStandardGroups.us.add(usGround);

        addSocketBackplate(powerStandardGroups.uk, zCenter);
        const ukTop = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.013, 0.008), socketVariantMaterial);
        ukTop.position.set(powerModuleCenter.x + 0.036, powerModuleCenter.y + 0.016, zCenter);
        powerStandardGroups.uk.add(ukTop);
        const ukLeft = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.02, 0.006), socketVariantMaterial);
        ukLeft.position.set(powerModuleCenter.x + 0.036, powerModuleCenter.y - 0.004, zCenter - 0.012);
        powerStandardGroups.uk.add(ukLeft);
        const ukRight = ukLeft.clone();
        ukRight.position.z = zCenter + 0.012;
        powerStandardGroups.uk.add(ukRight);

        addSocketBackplate(powerStandardGroups.eu, zCenter);
        const euLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.005, 14), socketVariantMaterial);
        euLeft.rotation.x = Math.PI / 2;
        euLeft.position.set(powerModuleCenter.x + 0.036, powerModuleCenter.y, zCenter - 0.013);
        powerStandardGroups.eu.add(euLeft);
        const euRight = euLeft.clone();
        euRight.position.z = zCenter + 0.013;
        powerStandardGroups.eu.add(euRight);

        addSocketBackplate(powerStandardGroups.au, zCenter);
        const auLeft = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.017, 0.006), socketVariantMaterial);
        auLeft.position.set(powerModuleCenter.x + 0.036, powerModuleCenter.y + 0.006, zCenter - 0.011);
        auLeft.rotation.x = -0.42;
        powerStandardGroups.au.add(auLeft);
        const auRight = auLeft.clone();
        auRight.position.z = zCenter + 0.011;
        auRight.rotation.x = 0.42;
        powerStandardGroups.au.add(auRight);
        const auGround = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.012, 0.006), socketVariantMaterial);
        auGround.position.set(powerModuleCenter.x + 0.036, powerModuleCenter.y - 0.013, zCenter);
        powerStandardGroups.au.add(auGround);
    });

    Object.values(powerStandardGroups).forEach((group) => {
        powerAddonGroup.add(group);
    });
    cabinetRoot.add(powerAddonGroup);

    const pegboardAddonGroup = new THREE.Group();
    const pegboardPanel = new THREE.Mesh(
        new THREE.BoxGeometry(cabinetSize.width * 0.88, cabinetSize.height * 0.7, 0.03),
        materials.pegboard
    );
    pegboardPanel.position.set(0, 0.02, -cabinetSize.depth / 2 - 0.03);
    pegboardPanel.castShadow = true;
    pegboardAddonGroup.add(pegboardPanel);

    const holeGeometry = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12);
    const holeRows = 6;
    const holeCols = 14;
    const boardWidth = cabinetSize.width * 0.78;
    const boardHeight = cabinetSize.height * 0.56;
    for (let row = 0; row < holeRows; row += 1) {
        for (let col = 0; col < holeCols; col += 1) {
            const hole = new THREE.Mesh(holeGeometry, materials.pegboardHole);
            hole.rotation.x = Math.PI / 2;
            hole.position.set(
                -boardWidth / 2 + (col / (holeCols - 1)) * boardWidth,
                boardHeight / 2 - (row / (holeRows - 1)) * boardHeight + 0.02,
                -cabinetSize.depth / 2 - 0.008
            );
            pegboardAddonGroup.add(hole);
        }
    }
    cabinetRoot.add(pegboardAddonGroup);

    const disposeGroupGeometry = (group) => {
        while (group.children.length > 0) {
            const child = group.children[0];
            group.remove(child);
            child.traverse((node) => {
                if (node.geometry) {
                    node.geometry.dispose();
                }
            });
        }
    };

    const getColorConfig = () => {
        if (state.color === 'custom') {
            const rgb = hexToRgb(state.customHex);
            return {
                label: `Custom RGB (${rgb.r}, ${rgb.g}, ${rgb.b})`,
                drawer: state.customHex,
                accent: darkenHex(state.customHex)
            };
        }

        return CABINET_COLOR_MAP[state.color] || CABINET_COLOR_MAP.navy;
    };

    const syncRgbInputsFromHex = (hex) => {
        const rgb = hexToRgb(hex);
        colorRInput.value = String(rgb.r);
        colorGInput.value = String(rgb.g);
        colorBInput.value = String(rgb.b);
    };

    const syncCustomColorUi = () => {
        customColorInput.value = state.customHex;
        customColorChip.style.backgroundColor = state.customHex;
        syncRgbInputsFromHex(state.customHex);
    };

    const getPowerStandardConfig = () => POWER_STANDARD_MAP[state.powerStandard] || POWER_STANDARD_MAP.us;

    const getActiveAddons = () => {
        const addons = [];
        if (state.addons.power) {
            const powerStandard = getPowerStandardConfig();
            addons.push(`PDU + USB (${powerStandard.shortLabel})`);
        }
        if (state.addons.pegboard) {
            addons.push('Pegboard Wall');
        }
        return addons;
    };

    const renderDrawers = () => {
        disposeGroupGeometry(drawersGroup);

        const drawerDepth = 0.07;
        const drawerFaceZ = cabinetSize.depth / 2 + 0.04;
        const rowGap = 0.03;
        const fullWidth = cabinetSize.width - 0.24;

        const addDrawer = (x, y, width, height) => {
            const drawerMesh = new THREE.Mesh(
                new THREE.BoxGeometry(width, height, drawerDepth),
                materials.drawer
            );
            drawerMesh.position.set(x, y, drawerFaceZ);
            drawerMesh.castShadow = true;
            drawerMesh.receiveShadow = true;
            drawersGroup.add(drawerMesh);

            const handleWidth = Math.max(0.16, Math.min(width - 0.12, width * 0.58));
            const handleHeight = Math.max(0.016, Math.min(0.028, height * 0.24));
            const handleMesh = new THREE.Mesh(
                new THREE.BoxGeometry(handleWidth, handleHeight, 0.06),
                materials.handle
            );
            handleMesh.position.set(x, y, drawerFaceZ + drawerDepth / 2 + 0.02);
            handleMesh.castShadow = true;
            drawersGroup.add(handleMesh);
        };

        const firstRowHeight = 0.14;
        const secondRowHeight = 0.22;
        const firstRowTop = cabinetSize.height / 2 - 0.18;
        addDrawer(0, firstRowTop - firstRowHeight / 2, fullWidth, firstRowHeight);

        const secondRowTop = firstRowTop - firstRowHeight - rowGap;
        addDrawer(0, secondRowTop - secondRowHeight / 2, fullWidth, secondRowHeight);

        const totalDrawers = Math.max(7, Math.min(13, state.drawers));
        const remainingDrawers = totalDrawers - 2;
        let leftCount = Math.max(2, Math.round(remainingDrawers * 0.35));
        leftCount = Math.min(leftCount, remainingDrawers - 3);
        let rightCount = remainingDrawers - leftCount;
        if (rightCount < 3) {
            rightCount = 3;
            leftCount = remainingDrawers - rightCount;
        }

        const columnTop = secondRowTop - secondRowHeight - rowGap;
        const columnBottom = -cabinetSize.height / 2 + 0.14;
        const columnHeight = columnTop - columnBottom;
        if (columnHeight <= 0) {
            return;
        }

        const columnGap = 0.08;
        const leftWidth = 0.84;
        const rightWidth = fullWidth - leftWidth - columnGap;
        const leftCenterX = -fullWidth / 2 + leftWidth / 2;
        const rightCenterX = -fullWidth / 2 + leftWidth + columnGap + rightWidth / 2;

        const addDrawerColumn = (centerX, width, count) => {
            const verticalGap = 0.026;
            const rowHeight = (columnHeight - verticalGap * (count - 1)) / count;
            for (let i = 0; i < count; i += 1) {
                const y = columnTop - rowHeight / 2 - i * (rowHeight + verticalGap);
                addDrawer(centerX, y, width, rowHeight);
            }
        };

        addDrawerColumn(leftCenterX, leftWidth, leftCount);
        addDrawerColumn(rightCenterX, rightWidth, rightCount);
    };

    const renderBrandTexture = (brandText, lockType) => {
        if (!logoContext) {
            return;
        }

        logoContext.clearRect(0, 0, logoCanvas.width, logoCanvas.height);
        const darkTheme = lockType === 'smart';
        logoContext.fillStyle = darkTheme ? '#0e1724' : '#f8fafc';
        logoContext.fillRect(0, 0, logoCanvas.width, logoCanvas.height);
        logoContext.strokeStyle = darkTheme ? '#2d8dff' : '#9aa3b0';
        logoContext.lineWidth = 10;
        logoContext.strokeRect(8, 8, logoCanvas.width - 16, logoCanvas.height - 16);
        logoContext.fillStyle = darkTheme ? '#e5edf7' : '#111827';
        logoContext.textAlign = 'center';
        logoContext.textBaseline = 'middle';
        logoContext.font = "700 116px 'Oswald', Arial, sans-serif";
        logoContext.fillText(brandText, logoCanvas.width / 2, logoCanvas.height / 2 + 5);
        logoTexture.needsUpdate = true;
    };

    const updateConfigurator = () => {
        const colorConfig = getColorConfig();
        const addons = getActiveAddons();
        const powerStandard = getPowerStandardConfig();
        const brandText = (state.brand || 'YOUR BRAND').toUpperCase().slice(0, 16);

        materials.body.color.set(colorConfig.drawer);
        materials.drawer.color.set(colorConfig.drawer);
        materials.accent.color.set(colorConfig.accent);

        renderDrawers();
        smartLockGroup.visible = state.lock === 'smart';
        standardLockGroup.visible = state.lock !== 'smart';
        renderBrandTexture(brandText, state.lock);
        powerAddonGroup.visible = state.addons.power;
        Object.entries(powerStandardGroups).forEach(([standardCode, group]) => {
            group.visible = state.addons.power && standardCode === state.powerStandard;
        });
        pegboardAddonGroup.visible = state.addons.pegboard;

        colorButtons.forEach((button) => {
            const isActive = button.getAttribute('data-config-color') === state.color;
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            button.style.borderColor = isActive ? '#004791' : '#e5e7eb';
            button.style.backgroundColor = isActive ? '#eef4fb' : '#ffffff';
        });

        summaryEl.textContent = `Brand: ${brandText} | Color: ${colorConfig.label} (${colorConfig.drawer.toUpperCase()}) | Drawers: ${state.drawers} | Lock: ${state.lock === 'smart' ? 'Smart Lock' : 'Standard Lock'} | Add-ons: ${addons.length > 0 ? addons.join(', ') : 'None'}`;

        badgeColor.textContent = state.color === 'custom' ? 'Custom RGB' : colorConfig.label;
        badgeColor.style.backgroundColor = colorConfig.drawer;
        const badgeRgb = hexToRgb(colorConfig.drawer);
        const luminance = (0.2126 * badgeRgb.r + 0.7152 * badgeRgb.g + 0.0722 * badgeRgb.b) / 255;
        badgeColor.style.color = luminance > 0.6 ? '#0f172a' : '#ffffff';
        badgeDrawers.textContent = `${state.drawers} Drawers`;
        badgeLock.textContent = state.lock === 'smart' ? 'Smart Lock' : 'Standard Lock';
        badgeAddons.textContent = addons.length > 0 ? addons.join(' + ') : 'No Add-ons';

        powerStandardSelect.value = state.powerStandard;
        powerStandardSelect.disabled = !state.addons.power;
        powerStandardSelect.classList.toggle('opacity-50', !state.addons.power);

        if (state.addons.power) {
            powerAddonInput.title = `Power module standard: ${powerStandard.label}`;
        } else {
            powerAddonInput.title = '';
        }

        syncCustomColorUi();
    };

    colorButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const selectedColor = button.getAttribute('data-config-color') || 'navy';
            state.color = selectedColor;
            updateConfigurator();
        });
    });

    customColorInput.addEventListener('input', () => {
        state.color = 'custom';
        state.customHex = customColorInput.value.toLowerCase();
        updateConfigurator();
    });

    const onRgbInputChange = () => {
        const r = clampRgbValue(colorRInput.value);
        const g = clampRgbValue(colorGInput.value);
        const b = clampRgbValue(colorBInput.value);
        colorRInput.value = String(r);
        colorGInput.value = String(g);
        colorBInput.value = String(b);
        state.color = 'custom';
        state.customHex = rgbToHex(r, g, b);
        updateConfigurator();
    };

    colorRInput.addEventListener('input', onRgbInputChange);
    colorGInput.addEventListener('input', onRgbInputChange);
    colorBInput.addEventListener('input', onRgbInputChange);

    drawerCountSelect.addEventListener('change', () => {
        state.drawers = Number.parseInt(drawerCountSelect.value, 10) || 11;
        updateConfigurator();
    });

    lockInputs.forEach((input) => {
        input.addEventListener('change', () => {
            if (input.checked) {
                state.lock = input.value;
                updateConfigurator();
            }
        });
    });

    powerAddonInput.addEventListener('change', () => {
        state.addons.power = powerAddonInput.checked;
        updateConfigurator();
    });

    powerStandardSelect.addEventListener('change', () => {
        const selectedStandard = powerStandardSelect.value;
        state.powerStandard = POWER_STANDARD_MAP[selectedStandard] ? selectedStandard : 'us';
        updateConfigurator();
    });

    pegboardAddonInput.addEventListener('change', () => {
        state.addons.pegboard = pegboardAddonInput.checked;
        updateConfigurator();
    });

    brandNameInput.addEventListener('input', () => {
        state.brand = brandNameInput.value.trim();
        updateConfigurator();
    });

    if (applyQuoteBtn) {
        applyQuoteBtn.addEventListener('click', () => {
            const colorConfig = getColorConfig();
            const addons = getActiveAddons();
            const powerStandard = getPowerStandardConfig();
            const brandText = (state.brand || 'YOUR BRAND').toUpperCase().slice(0, 16);
            const quoteMessage = [
                'Custom Tool Cabinet Configuration Request:',
                `- Brand Logo Text: ${brandText}`,
                `- Color: ${colorConfig.label} (${colorConfig.drawer.toUpperCase()})`,
                `- Drawer Count: ${state.drawers}`,
                `- Lock Type: ${state.lock === 'smart' ? 'Smart Lock' : 'Standard Lock'}`,
                state.addons.power ? `- Power Module Standard: ${powerStandard.label}` : null,
                `- Add-ons: ${addons.length > 0 ? addons.join(', ') : 'None'}`
            ].filter(Boolean).join('\n');

            const modal = document.getElementById('quote-modal');
            if (modal) {
                modal.classList.add('open');
            }

            const quoteCompany = document.getElementById('quote-company');
            if (quoteCompany && !quoteCompany.value) {
                quoteCompany.value = 'Customized Cabinet Inquiry';
            }

            const quoteMessageField = document.getElementById('quote-message');
            if (quoteMessageField) {
                quoteMessageField.value = quoteMessage;
                quoteMessageField.focus();
            }
        });
    }

    const resize = () => {
        const width = preview3dView.clientWidth;
        const height = preview3dView.clientHeight;
        if (width <= 0 || height <= 0) {
            return;
        }
        applyResponsiveCamera();
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
            resize();
        });
        resizeObserver.observe(preview3dView);
    }

    let animationFrameId = 0;
    const animate = () => {
        animationFrameId = window.requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };

    const cleanup = () => {
        window.cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', resize);
        window.removeEventListener('orientationchange', resize);
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        disposeGroupGeometry(drawersGroup);
        controls.dispose();
        logoTexture.dispose();
        renderer.dispose();
        holeGeometry.dispose();
    };

    window.addEventListener('pagehide', cleanup, { once: true });

    updateConfigurator();
    applyResponsiveCamera(true);
    resize();
    animate();
};

const renderHomeProducts = async () => {
    const container = document.getElementById('home-featured-products');
    if (!container) {
        return;
    }

    try {
        const { products } = await import('./js/products-data.js');

        const featuredIds = ['lz001', 'strb5624w120', 'tsdm7219w102'];
        const highlights = products.filter((product) => featuredIds.includes(product.id));

        container.innerHTML = highlights.map((product) => `
            <a href="/products/detail.html?id=${product.id}" class="group block bg-white border border-gray-100 hover:border-accent transition-all duration-500 hover:shadow-2xl reveal-on-scroll">
                <div class="aspect-square overflow-hidden relative p-8 flex items-center justify-center" style="background: radial-gradient(circle, #ffffff 0%, #f0f0f0 100%)">
                    <img src="${product.images[0]}" alt="${product.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-700">
                    <div class="absolute top-4 left-4">
                        <span class="px-3 py-1 bg-[#0a0a0a] text-white text-[9px] font-bold uppercase tracking-widest">${product.id.toUpperCase()}</span>
                    </div>
                </div>
                <div class="p-8">
                    <h3 class="font-oswald text-2xl font-bold text-[#0a0a0a] uppercase mb-4 leading-tight group-hover:text-accent transition-colors">${product.name}</h3>

                    <table class="w-full text-[11px] text-gray-400 border-t border-gray-50 mt-4">
                        <tr class="border-b border-gray-50">
                            <td class="py-3 font-bold uppercase">Dimensions</td>
                            <td class="py-3 text-right text-[#0a0a0a] font-semibold">${product.specs['Product Size'] || '-'}</td>
                        </tr>
                        <tr class="border-b border-gray-50">
                            <td class="py-3 font-bold uppercase">Load Rating</td>
                            <td class="py-3 text-right text-[#0a0a0a] font-semibold">${product.specs['Total Capacity'] || '-'}</td>
                        </tr>
                        <tr class="border-b border-gray-50">
                            <td class="py-3 font-bold uppercase">Series</td>
                            <td class="py-3 text-right text-[#0a0a0a] font-semibold">${product.category.replace('TOOL CABINET/CART', 'PREMIUM')}</td>
                        </tr>
                    </table>
                </div>
            </a>
        `).join('');
    } catch (error) {
        console.error('Error rendering home products:', error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    const backToTop = document.getElementById('back-to-top');
    setupMobileNavigation();

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY > 50;

        if (navbar) {
            if (scrolled) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }

        if (backToTop) {
            if (window.scrollY > 500) {
                backToTop.classList.add('show');
            } else {
                backToTop.classList.remove('show');
            }
        }
    });

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    renderHomeProducts();
    setupRevealObserver();
    setupCounter();
    setupMagneticButtons();
    setupContactForm();
    setupCabinetConfigurator();
});
