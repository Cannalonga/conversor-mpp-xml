class NavbarTools {
    constructor() {
        this.element = null;
        this.mobileMenuOpen = false;
        this.init();
    }

    init() {
        this.element = this.createElement();
        this.attachEventListeners();
    }

    createElement() {
        const nav = document.createElement('nav');
        nav.className = 'navbar';
        nav.innerHTML = this.getHTML();
        return nav;
    }

    getHTML() {
        return `
            <div class="navbar-container">
                <div class="navbar-brand">
                    <a href="/" class="brand-link">
                        <span class="brand-icon">🔄</span>
                        <span class="brand-text">ConversorPro</span>
                    </a>
                </div>

                <div class="navbar-menu" id="navbar-menu">
                    <div class="navbar-nav">
                        <div class="nav-item dropdown">
                            <button class="nav-link dropdown-toggle" id="pdf-dropdown">
                                <span>📄 PDF</span>
                                <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12">
                                    <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none"/>
                                </svg>
                            </button>
                            <div class="dropdown-menu" id="pdf-menu">
                                <a href="/convert/pdf-to-text" class="dropdown-item">
                                    <span class="item-icon">📄</span>
                                    <span class="item-text">PDF para Texto</span>
                                </a>
                                <a href="/convert/pdf-merge" class="dropdown-item">
                                    <span class="item-icon">📑</span>
                                    <span class="item-text">Juntar PDFs</span>
                                </a>
                                <a href="/convert/pdf-split" class="dropdown-item">
                                    <span class="item-icon">✂️</span>
                                    <span class="item-text">Dividir PDF</span>
                                </a>
                                <a href="/convert/pdf-compress" class="dropdown-item">
                                    <span class="item-icon">🗜️</span>
                                    <span class="item-text">Comprimir PDF</span>
                                </a>
                                <a href="/convert/pdf-ocr" class="dropdown-item">
                                    <span class="item-icon">🔍</span>
                                    <span class="item-text">PDF OCR</span>
                                </a>
                                <a href="/convert/pdf-to-word" class="dropdown-item">
                                    <span class="item-icon">📝</span>
                                    <span class="item-text">PDF para Word</span>
                                </a>
                            </div>
                        </div>

                        <div class="nav-item dropdown">
                            <button class="nav-link dropdown-toggle" id="image-dropdown">
                                <span>🖼️ Imagens</span>
                                <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12">
                                    <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none"/>
                                </svg>
                            </button>
                            <div class="dropdown-menu" id="image-menu">
                                <a href="/convert/image-to-pdf" class="dropdown-item">
                                    <span class="item-icon">🖼️</span>
                                    <span class="item-text">Imagem para PDF</span>
                                </a>
                                <a href="/convert/image-format" class="dropdown-item">
                                    <span class="item-icon">🎨</span>
                                    <span class="item-text">Converter Formato</span>
                                </a>
                            </div>
                        </div>

                        <div class="nav-item dropdown">
                            <button class="nav-link dropdown-toggle" id="document-dropdown">
                                <span>📄 Documentos</span>
                                <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12">
                                    <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none"/>
                                </svg>
                            </button>
                            <div class="dropdown-menu" id="document-menu">
                                <a href="/convert/mpp-to-xml" class="dropdown-item">
                                    <span class="item-icon">📊</span>
                                    <span class="item-text">MPP para XML</span>
                                </a>
                                <a href="/convert/docx-to-pdf" class="dropdown-item">
                                    <span class="item-icon">📄</span>
                                    <span class="item-text">Word para PDF</span>
                                </a>
                                <a href="/convert/xlsx-to-csv" class="dropdown-item">
                                    <span class="item-icon">📊</span>
                                    <span class="item-text">Excel para CSV</span>
                                </a>
                                <a href="/convert/csv-to-xlsx" class="dropdown-item">
                                    <span class="item-icon">📈</span>
                                    <span class="item-text">CSV para Excel</span>
                                </a>
                            </div>
                        </div>

                        <a href="/pricing" class="nav-link">💰 Preços</a>
                        <a href="/help" class="nav-link">❓ Ajuda</a>
                    </div>
                </div>

                <button class="mobile-menu-toggle" id="mobile-menu-toggle">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        `;
    }

    attachEventListeners() {
        // Toggle mobile menu
        const mobileToggle = this.element.querySelector('#mobile-menu-toggle');
        mobileToggle?.addEventListener('click', () => this.toggleMobileMenu());

        // Dropdown toggles
        const dropdownToggles = this.element.querySelectorAll('.dropdown-toggle');
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => this.toggleDropdown(e));
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => this.closeDropdowns(e));

        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
        const menu = this.element.querySelector('#navbar-menu');
        const toggle = this.element.querySelector('#mobile-menu-toggle');
        
        if (this.mobileMenuOpen) {
            menu?.classList.add('mobile-open');
            toggle?.classList.add('active');
        } else {
            menu?.classList.remove('mobile-open');
            toggle?.classList.remove('active');
        }
    }

    toggleDropdown(event) {
        event.preventDefault();
        const toggle = event.currentTarget;
        const dropdownId = toggle.id.replace('-dropdown', '-menu');
        const dropdown = this.element.querySelector(`#${dropdownId}`);
        
        // Close other dropdowns
        const allDropdowns = this.element.querySelectorAll('.dropdown-menu');
        const allToggles = this.element.querySelectorAll('.dropdown-toggle');
        
        allDropdowns.forEach(menu => {
            if (menu.id !== dropdownId) {
                menu.classList.remove('active');
            }
        });
        
        allToggles.forEach(btn => {
            if (btn.id !== toggle.id) {
                btn.classList.remove('active');
            }
        });

        // Toggle current dropdown
        dropdown?.classList.toggle('active');
        toggle.classList.toggle('active');
    }

    closeDropdowns(event) {
        if (!event.target.closest('.dropdown')) {
            const dropdowns = this.element.querySelectorAll('.dropdown-menu');
            const toggles = this.element.querySelectorAll('.dropdown-toggle');
            
            dropdowns.forEach(menu => menu.classList.remove('active'));
            toggles.forEach(toggle => toggle.classList.remove('active'));
        }
    }

    handleKeyboard(event) {
        if (event.key === 'Escape') {
            this.closeDropdowns(event);
            if (this.mobileMenuOpen) {
                this.toggleMobileMenu();
            }
        }
    }

    render(container) {
        container.appendChild(this.element);
    }

    setActiveItem(path) {
        // Remove active class from all items
        const allLinks = this.element.querySelectorAll('.nav-link, .dropdown-item');
        allLinks.forEach(link => link.classList.remove('active'));

        // Add active class to current page
        const activeLink = this.element.querySelector(`[href="${path}"]`);
        activeLink?.classList.add('active');

        // If it's a dropdown item, also mark the parent dropdown as active
        const parentDropdown = activeLink?.closest('.dropdown');
        if (parentDropdown) {
            const parentToggle = parentDropdown.querySelector('.dropdown-toggle');
            parentToggle?.classList.add('active-parent');
        }
    }
}

// Export para uso modular
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavbarTools;
}