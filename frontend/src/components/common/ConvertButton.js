class ConvertButton {
    constructor(options = {}) {
        this.options = {
            text: 'Converter',
            loadingText: 'Convertendo...',
            successText: 'Convertido!',
            errorText: 'Erro na Conversão',
            icon: '🔄',
            loadingIcon: '⏳',
            successIcon: '✅',
            errorIcon: '❌',
            disabled: false,
            size: 'normal', // sm, normal, lg
            variant: 'primary', // primary, secondary, success, outline
            onClick: null,
            ...options
        };
        
        this.state = 'idle'; // idle, loading, success, error
        this.element = null;
        this.init();
    }

    init() {
        this.element = this.createElement();
        this.attachEventListeners();
    }

    createElement() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = this.getButtonClasses();
        button.innerHTML = this.getButtonContent();
        
        if (this.options.disabled) {
            button.disabled = true;
        }
        
        return button;
    }

    getButtonClasses() {
        const classes = ['btn', 'convert-button'];
        
        // Add variant class
        classes.push(`btn-${this.options.variant}`);
        
        // Add size class
        if (this.options.size !== 'normal') {
            classes.push(`btn-${this.options.size}`);
        }
        
        // Add state classes
        classes.push(`btn-${this.state}`);
        
        return classes.join(' ');
    }

    getButtonContent() {
        const config = this.getStateConfig();
        
        return `
            <span class="btn-icon">${config.icon}</span>
            <span class="btn-text">${config.text}</span>
            ${this.state === 'loading' ? '<span class="btn-spinner"></span>' : ''}
        `;
    }

    getStateConfig() {
        switch (this.state) {
            case 'loading':
                return {
                    text: this.options.loadingText,
                    icon: this.options.loadingIcon
                };
            case 'success':
                return {
                    text: this.options.successText,
                    icon: this.options.successIcon
                };
            case 'error':
                return {
                    text: this.options.errorText,
                    icon: this.options.errorIcon
                };
            default:
                return {
                    text: this.options.text,
                    icon: this.options.icon
                };
        }
    }

    attachEventListeners() {
        this.element.addEventListener('click', (e) => this.handleClick(e));
    }

    async handleClick(e) {
        e.preventDefault();
        
        if (this.state === 'loading' || this.element.disabled) {
            return;
        }

        if (this.options.onClick) {
            try {
                this.setLoading();
                const result = await this.options.onClick(e);
                
                if (result === false) {
                    this.setIdle();
                } else {
                    this.setSuccess();
                    
                    // Auto-reset after 2 seconds
                    setTimeout(() => {
                        if (this.state === 'success') {
                            this.setIdle();
                        }
                    }, 2000);
                }
            } catch (error) {
                this.setError();
                console.error('Convert button error:', error);
                
                // Auto-reset after 3 seconds
                setTimeout(() => {
                    if (this.state === 'error') {
                        this.setIdle();
                    }
                }, 3000);
            }
        }
    }

    setLoading() {
        this.state = 'loading';
        this.updateButton();
        this.element.disabled = true;
    }

    setSuccess() {
        this.state = 'success';
        this.updateButton();
        this.element.disabled = false;
    }

    setError() {
        this.state = 'error';
        this.updateButton();
        this.element.disabled = false;
    }

    setIdle() {
        this.state = 'idle';
        this.updateButton();
        this.element.disabled = this.options.disabled;
    }

    updateButton() {
        this.element.className = this.getButtonClasses();
        this.element.innerHTML = this.getButtonContent();
    }

    setDisabled(disabled) {
        this.options.disabled = disabled;
        this.element.disabled = disabled || this.state === 'loading';
    }

    setText(text) {
        this.options.text = text;
        if (this.state === 'idle') {
            this.updateButton();
        }
    }

    setIcon(icon) {
        this.options.icon = icon;
        if (this.state === 'idle') {
            this.updateButton();
        }
    }

    setVariant(variant) {
        this.options.variant = variant;
        this.updateButton();
    }

    setSize(size) {
        this.options.size = size;
        this.updateButton();
    }

    getState() {
        return this.state;
    }

    isLoading() {
        return this.state === 'loading';
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    render(container) {
        container.appendChild(this.element);
        return this.element;
    }

    // Static method to create a simple convert button
    static create(options) {
        return new ConvertButton(options);
    }

    // Static method to create a download button variant
    static createDownload(options = {}) {
        return new ConvertButton({
            text: 'Download',
            icon: '⬇️',
            loadingText: 'Preparando...',
            successText: 'Baixado!',
            variant: 'success',
            ...options
        });
    }

    // Static method to create an upload button variant
    static createUpload(options = {}) {
        return new ConvertButton({
            text: 'Fazer Upload',
            icon: '⬆️',
            loadingText: 'Enviando...',
            successText: 'Enviado!',
            variant: 'secondary',
            ...options
        });
    }
}

// Export para uso modular
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConvertButton;
}