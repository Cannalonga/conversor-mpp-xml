class FileUpload {
    constructor(options = {}) {
        this.options = {
            maxFileSize: 40 * 1024 * 1024, // 40MB default
            acceptedTypes: ['*/*'],
            multiple: false,
            maxFiles: 1,
            uploadText: 'Arraste arquivos aqui ou clique para selecionar',
            uploadIcon: '📁',
            showPreview: true,
            autoUpload: false,
            onFileSelect: null,
            onFileRemove: null,
            onUpload: null,
            onProgress: null,
            onError: null,
            ...options
        };
        
        this.files = [];
        this.element = null;
        this.init();
    }

    init() {
        this.element = this.createElement();
        this.attachEventListeners();
    }

    createElement() {
        const container = document.createElement('div');
        container.className = 'file-upload-container';
        container.innerHTML = this.getHTML();
        return container;
    }

    getHTML() {
        return `
            <div class="file-upload-dropzone" id="dropzone">
                <div class="dropzone-content">
                    <div class="upload-icon">${this.options.uploadIcon}</div>
                    <div class="upload-text">${this.options.uploadText}</div>
                    <div class="upload-hint">
                        ${this.getAcceptedTypesText()} • Máximo ${this.formatFileSize(this.options.maxFileSize)}
                    </div>
                    <button type="button" class="btn btn-outline upload-button">
                        Selecionar Arquivos
                    </button>
                </div>
                <input type="file" 
                       id="file-input" 
                       class="file-input" 
                       ${this.options.multiple ? 'multiple' : ''}
                       accept="${this.options.acceptedTypes.join(',')}">
            </div>
            
            <div class="file-list" id="file-list"></div>
            
            <div class="upload-progress" id="upload-progress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>
                <div class="progress-text" id="progress-text">0%</div>
            </div>
        `;
    }

    attachEventListeners() {
        const dropzone = this.element.querySelector('#dropzone');
        const fileInput = this.element.querySelector('#file-input');
        const uploadButton = this.element.querySelector('.upload-button');

        // Drag and drop events
        dropzone.addEventListener('dragover', (e) => this.handleDragOver(e));
        dropzone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        dropzone.addEventListener('drop', (e) => this.handleDrop(e));
        dropzone.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Upload button
        uploadButton.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.element.querySelector('#dropzone').classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.element.querySelector('#dropzone').classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.element.querySelector('#dropzone').classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }

    addFiles(newFiles) {
        const validFiles = [];
        
        for (const file of newFiles) {
            const validation = this.validateFile(file);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                this.showError(validation.error);
            }
        }

        if (this.options.multiple) {
            if (this.files.length + validFiles.length > this.options.maxFiles) {
                this.showError(`Máximo de ${this.options.maxFiles} arquivos permitidos`);
                return;
            }
            this.files.push(...validFiles);
        } else {
            this.files = validFiles.slice(0, 1);
        }

        this.renderFileList();
        
        if (this.options.onFileSelect) {
            this.options.onFileSelect(this.files);
        }

        if (this.options.autoUpload && this.files.length > 0) {
            this.upload();
        }
    }

    validateFile(file) {
        // Check file size
        if (file.size > this.options.maxFileSize) {
            return {
                valid: false,
                error: `Arquivo muito grande. Tamanho máximo: ${this.formatFileSize(this.options.maxFileSize)}`
            };
        }

        // Check file type
        if (this.options.acceptedTypes[0] !== '*/*') {
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            const mimeType = file.type.toLowerCase();
            
            const isValid = this.options.acceptedTypes.some(type => {
                if (type.startsWith('.')) {
                    return type.toLowerCase() === fileExtension;
                } else {
                    return mimeType.includes(type.replace('*', ''));
                }
            });

            if (!isValid) {
                return {
                    valid: false,
                    error: `Tipo de arquivo não suportado. Aceitos: ${this.getAcceptedTypesText()}`
                };
            }
        }

        return { valid: true };
    }

    renderFileList() {
        const fileList = this.element.querySelector('#file-list');
        
        if (this.files.length === 0) {
            fileList.innerHTML = '';
            return;
        }

        fileList.innerHTML = this.files.map((file, index) => `
            <div class="file-item" data-index="${index}">
                <div class="file-info">
                    <div class="file-icon">${this.getFileIcon(file)}</div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button type="button" class="file-remove" onclick="fileUpload.removeFile(${index})">
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path d="M4 4l8 8M4 12l8-8" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
        `).join('');

        // Show preview if enabled
        if (this.options.showPreview && this.files.length > 0) {
            this.showFilePreview(this.files[0]);
        }
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.renderFileList();
        
        if (this.options.onFileRemove) {
            this.options.onFileRemove(index);
        }
    }

    showFilePreview(file) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                let previewContainer = this.element.querySelector('.file-preview');
                if (!previewContainer) {
                    previewContainer = document.createElement('div');
                    previewContainer.className = 'file-preview';
                    this.element.querySelector('#file-list').appendChild(previewContainer);
                }
                
                previewContainer.innerHTML = `
                    <div class="preview-image">
                        <img src="${e.target.result}" alt="Preview" />
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        }
    }

    async upload() {
        if (this.files.length === 0) {
            this.showError('Nenhum arquivo selecionado para upload');
            return;
        }

        const progressContainer = this.element.querySelector('#upload-progress');
        const progressFill = this.element.querySelector('#progress-fill');
        const progressText = this.element.querySelector('#progress-text');
        
        progressContainer.style.display = 'block';

        try {
            if (this.options.onUpload) {
                await this.options.onUpload(this.files, (progress) => {
                    progressFill.style.width = `${progress}%`;
                    progressText.textContent = `${Math.round(progress)}%`;
                    
                    if (this.options.onProgress) {
                        this.options.onProgress(progress);
                    }
                });
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            progressContainer.style.display = 'none';
        }
    }

    showError(message) {
        if (this.options.onError) {
            this.options.onError(message);
        } else {
            // Default error display
            const existingError = this.element.querySelector('.upload-error');
            if (existingError) {
                existingError.remove();
            }

            const errorDiv = document.createElement('div');
            errorDiv.className = 'upload-error';
            errorDiv.textContent = message;
            this.element.appendChild(errorDiv);

            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }
    }

    clear() {
        this.files = [];
        this.renderFileList();
        this.element.querySelector('#file-input').value = '';
        
        const preview = this.element.querySelector('.file-preview');
        if (preview) preview.remove();
        
        const error = this.element.querySelector('.upload-error');
        if (error) error.remove();
    }

    getFiles() {
        return this.files;
    }

    setFiles(files) {
        this.files = files;
        this.renderFileList();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    getFileIcon(file) {
        const type = file.type.toLowerCase();
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (type.startsWith('image/')) return '🖼️';
        if (type.includes('pdf')) return '📄';
        if (type.includes('word') || extension === 'docx' || extension === 'doc') return '📝';
        if (type.includes('excel') || extension === 'xlsx' || extension === 'xls') return '📊';
        if (extension === 'csv') return '📈';
        if (extension === 'mpp') return '📊';
        if (extension === 'xml') return '📋';
        if (extension === 'txt') return '📄';
        
        return '📎';
    }

    getAcceptedTypesText() {
        if (this.options.acceptedTypes[0] === '*/*') {
            return 'Todos os tipos';
        }
        
        return this.options.acceptedTypes
            .map(type => type.replace('.', '').toUpperCase())
            .join(', ');
    }

    render(container) {
        container.appendChild(this.element);
        
        // Make instance available globally for onclick handlers
        window.fileUpload = this;
        
        return this.element;
    }
}

// Export para uso modular
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileUpload;
}