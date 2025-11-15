// Homepage Controller
class HomePage {
    constructor() {
        this.currentCategory = 'all';
        this.init();
    }

    async init() {
        // Initialize components
        this.initNavbar();
        this.initPopularTools();
        this.initAllTools();
        this.initCategoryFilters();
        this.initAnimations();
        
        console.log('Homepage initialized');
    }

    initNavbar() {
        const navbarContainer = document.getElementById('navbar-container');
        const navbar = new NavbarTools();
        navbar.render(navbarContainer);
        navbar.setActiveItem('/');
    }

    initPopularTools() {
        const popularContainer = document.getElementById('popular-tools');
        const popularTools = getPopularTools();

        popularContainer.innerHTML = popularTools.map(tool => this.createToolCard(tool, 'popular')).join('');
    }

    initAllTools() {
        const toolsContainer = document.getElementById('tools-grid');
        const allTools = CONVERSION_TOOLS;

        toolsContainer.innerHTML = allTools.map(tool => this.createToolCard(tool, 'standard')).join('');
    }

    initCategoryFilters() {
        const categoryButtons = document.querySelectorAll('.category-btn');
        
        categoryButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const category = e.target.getAttribute('data-category');
                this.filterByCategory(category);
            });
        });
    }

    createToolCard(tool, variant = 'standard') {
        const isPopular = variant === 'popular';
        const cardClass = isPopular ? 'tool-card popular-card' : 'tool-card';
        
        return `
            <div class="${cardClass}" data-category="${tool.category}">
                ${tool.popular && !isPopular ? '<div class="popular-badge">Popular</div>' : ''}
                <div class="tool-header">
                    <div class="tool-icon">${tool.icon}</div>
                    <div class="tool-info">
                        <h3 class="tool-title">${tool.title}</h3>
                        <p class="tool-description">${tool.description}</p>
                    </div>
                </div>
                
                <div class="tool-meta">
                    <div class="tool-formats">
                        <span class="format-input">
                            <span class="format-label">De:</span>
                            <span class="format-value">${tool.inputFormat.join(', ').toUpperCase()}</span>
                        </span>
                        <span class="format-arrow">→</span>
                        <span class="format-output">
                            <span class="format-label">Para:</span>
                            <span class="format-value">${tool.outputFormat}</span>
                        </span>
                    </div>
                    
                    <div class="tool-price">
                        <span class="price-value">${tool.price}</span>
                    </div>
                </div>
                
                <div class="tool-actions">
                    <a href="${tool.route}" class="btn btn-primary tool-btn">
                        <span class="btn-icon">${tool.icon}</span>
                        <span class="btn-text">Converter Agora</span>
                    </a>
                    
                    ${isPopular ? `
                        <div class="tool-stats">
                            <span class="stat-item">
                                <span class="stat-icon">⚡</span>
                                <span class="stat-text">Rápido</span>
                            </span>
                            <span class="stat-item">
                                <span class="stat-icon">🔒</span>
                                <span class="stat-text">Seguro</span>
                            </span>
                        </div>
                    ` : ''}
                </div>
                
                ${isPopular && tool.id === 'pdf-to-text' ? this.createDemoProgress() : ''}
            </div>
        `;
    }

    createDemoProgress() {
        return `
            <div class="demo-progress">
                <div class="progress-header">
                    <span class="progress-icon">📄</span>
                    <span class="progress-text">exemplo.pdf</span>
                    <span class="progress-status">Convertendo...</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill demo-fill"></div>
                </div>
            </div>
        `;
    }

    filterByCategory(category) {
        this.currentCategory = category;
        
        // Update active button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Filter tools
        const toolCards = document.querySelectorAll('.tool-card');
        
        toolCards.forEach(card => {
            const cardCategory = card.getAttribute('data-category');
            const shouldShow = category === 'all' || cardCategory === category;
            
            if (shouldShow) {
                card.style.display = 'block';
                card.classList.add('animate-fade-in');
            } else {
                card.style.display = 'none';
                card.classList.remove('animate-fade-in');
            }
        });

        // Update tools count
        this.updateToolsCount(category);
    }

    updateToolsCount(category) {
        const visibleTools = document.querySelectorAll('.tool-card[style*="block"], .tool-card:not([style])').length;
        const categoryName = category === 'all' ? 'Todas as ferramentas' : this.getCategoryName(category);
        
        // Update section header if exists
        const sectionHeader = document.querySelector('.tools-section .section-header p');
        if (sectionHeader) {
            sectionHeader.textContent = `${visibleTools} ferramentas em ${categoryName}`;
        }
    }

    getCategoryName(category) {
        const categoryNames = {
            pdf: 'PDF',
            image: 'Imagens', 
            document: 'Documentos',
            spreadsheet: 'Planilhas',
            project: 'Projetos'
        };
        return categoryNames[category] || category;
    }

    initAnimations() {
        // Animate hero visual card
        this.animateHeroCard();
        
        // Intersection Observer for scroll animations
        this.initScrollAnimations();
        
        // Demo progress bar animation
        this.animateDemoProgress();
    }

    animateHeroCard() {
        const heroCard = document.querySelector('.visual-card');
        if (heroCard) {
            // Add entrance animation
            setTimeout(() => {
                heroCard.classList.add('animate-fade-in');
            }, 500);

            // Animate progress bar
            const progressFill = heroCard.querySelector('.progress-fill');
            if (progressFill) {
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 1;
                    progressFill.style.width = `${Math.min(progress, 85)}%`;
                    
                    if (progress >= 85) {
                        clearInterval(interval);
                        
                        // Show completion after delay
                        setTimeout(() => {
                            progressFill.style.width = '100%';
                            const progressText = heroCard.querySelector('.progress-text');
                            if (progressText) {
                                progressText.textContent = 'Conversão concluída!';
                                progressText.style.color = 'var(--success-color)';
                            }
                        }, 1000);
                    }
                }, 50);
            }
        }
    }

    animateDemoProgress() {
        const demoProgress = document.querySelector('.demo-fill');
        if (demoProgress) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 2;
                demoProgress.style.width = `${Math.min(progress, 100)}%`;
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // Reset and repeat
                    setTimeout(() => {
                        progress = 0;
                        demoProgress.style.width = '0%';
                        
                        // Restart animation
                        setTimeout(() => {
                            this.animateDemoProgress();
                        }, 2000);
                    }, 1000);
                }
            }, 100);
        }
    }

    initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in');
                }
            });
        }, observerOptions);

        // Observe sections
        const sections = document.querySelectorAll('.popular-section, .features-section, .pricing-section, .cta-section');
        sections.forEach(section => {
            observer.observe(section);
        });

        // Observe feature cards with delay
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach((card, index) => {
            setTimeout(() => {
                observer.observe(card);
            }, index * 100);
        });
    }

    // Analytics and tracking
    trackToolClick(toolId, source = 'homepage') {
        // Analytics tracking would go here
        console.log(`Tool clicked: ${toolId} from ${source}`);
        
        // Could send to analytics service
        // analytics.track('tool_click', { tool: toolId, source: source });
    }

    trackCategoryFilter(category) {
        // Analytics tracking would go here
        console.log(`Category filtered: ${category}`);
    }

    // Utility methods
    formatPrice(price) {
        return price.replace('R$', '').trim();
    }

    getToolById(id) {
        return CONVERSION_TOOLS.find(tool => tool.id === id);
    }

    // Public API for external interactions
    showCategory(category) {
        this.filterByCategory(category);
    }

    scrollToTools() {
        const toolsSection = document.getElementById('tools');
        if (toolsSection) {
            toolsSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }
}

// Initialize homepage when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.homePage = new HomePage();
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});