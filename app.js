class StoryGenerator {
  constructor() {
    // Initialize the form and result elements
    this.form = document.getElementById('storyForm');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.storyResult = document.getElementById('storyResult');
    this.storyContent = document.getElementById('storyContent');
    this.resetBtn = document.getElementById('resetBtn');
    this.themeToggle = document.getElementById('themeToggle');
    
    // Initialize other properties
    this.characters = {};
    this.currentSeed = null;
    this.storySeed = null;
    this.activeModal = null;

    // Setup event listeners only after ensuring elements exist
    if (this.form && this.resetBtn && this.themeToggle) {
      this.setupEventListeners();
      this.setupThemeToggle();
    } else {
      console.error('Required DOM elements not found');
    }
  }

  setupEventListeners() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.resetForm());
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const theme = document.getElementById('theme').value;
    const description = document.getElementById('description').value;
    const characters = document.getElementById('characters').value;
    const aspectRatio = document.getElementById('aspectRatio').value;
    const paragraphCount = parseInt(document.getElementById('paragraphCount').value);
    const storySeedInput = document.getElementById('storySeed').value;
    const imageSeedInput = document.getElementById('imageSeed').value;

    // Use provided seeds or generate random ones
    this.storySeed = storySeedInput ? parseInt(storySeedInput) : Math.floor(Math.random() * 1000000);
    this.currentSeed = imageSeedInput ? parseInt(imageSeedInput) : null;

    this.parseCharacters(characters);

    this.showLoading(true);
    
    try {
      const story = await this.generateStory(theme, description);
      const storyParagraphs = this.splitIntoShortParagraphs(story, paragraphCount);
      await this.generateAndDisplayContent(storyParagraphs, aspectRatio);
    } catch (error) {
      console.error('Error:', error);
      alert('Hubo un error al generar la historia. Por favor, intenta nuevamente.');
    }

    this.showLoading(false);
  }

  parseCharacters(charactersText) {
    this.characters = {};
    if (!charactersText.trim()) return;

    const charactersList = charactersText.split(',').map(c => c.trim());
    for (const char of charactersList) {
      const [name, description] = char.split(':').map(s => s.trim());
      if (name && description) {
        this.characters[name.toLowerCase()] = description;
      }
    }
  }

  async generateStory(theme, description) {
    const charactersContext = Object.entries(this.characters)
      .map(([name, desc]) => `${name}: ${desc}`)
      .join('. ');

    // Enhanced prompt for better coherence and narrative flow
    const prompt = `Write a coherent, engaging, and logically connected story about ${theme}. 
    Context: ${description}. 
    Characters: ${charactersContext}. 
    Important guidelines:
    - Create a clear narrative flow with proper transitions between scenes
    - Maintain consistent character descriptions and personalities throughout
    - Use natural language without special characters like # or *
    - Focus on vivid visual descriptions to help with image generation
    - Keep each paragraph between 100-150 characters
    - Ensure logical cause and effect in story progression
    - Create smooth transitions between paragraphs
    Seed: ${this.storySeed}`;
    
    const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
    if (!response.ok) throw new Error('Error generando la historia');
    const text = await response.text();
    
    // Clean up any potential special characters and format text
    return text
      .replace(/[#*]/g, '') // Remove # and * characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  splitIntoShortParagraphs(story, desiredParagraphs) {
    // Enhanced paragraph splitting for better coherence
    let paragraphs = story
      .split(/(?<=[.!?])\s+/)
      .filter(para => para.trim().length > 0);
    
    let result = [];
    let currentParagraph = '';
    
    const transitionPhrases = [
      'Mientras tanto',
      'En ese momento',
      'Al mismo tiempo',
      'Poco después',
      'En consecuencia',
      'Como resultado',
      'De esta manera',
      'A continuación',
      'Posteriormente',
      'Seguidamente'
    ];
    
    for (let sentence of paragraphs) {
      if ((currentParagraph + ' ' + sentence).length <= 150) {
        currentParagraph = currentParagraph ? 
          currentParagraph + ' ' + sentence : sentence;
      } else {
        if (currentParagraph) {
          result.push(currentParagraph);
        }
        // Add transition phrase for smoother flow
        const transition = transitionPhrases[Math.floor(Math.random() * transitionPhrases.length)];
        currentParagraph = `${transition}, ${sentence}`;
      }
      
      if (currentParagraph.length >= 100) {
        result.push(currentParagraph);
        currentParagraph = '';
      }
    }
    
    if (currentParagraph) {
      result.push(currentParagraph);
    }
    
    // Ensure we have exactly the desired number of paragraphs
    while (result.length < desiredParagraphs) {
      const lastParagraph = result[result.length - 1];
      const transition = transitionPhrases[Math.floor(Math.random() * transitionPhrases.length)];
      result.push(`${transition}, la historia continuó desarrollándose con nuevos acontecimientos y revelaciones.`);
    }
    
    if (result.length > desiredParagraphs) {
      result = result.slice(0, desiredParagraphs);
    }
    
    return result;
  }

  async generateAndDisplayContent(paragraphs, aspectRatio) {
    this.storyContent.innerHTML = '';
    this.storyResult.classList.remove('d-none');
    
    const firstSection = await this.createStorySection(paragraphs[0], aspectRatio, true);
    this.storyContent.appendChild(firstSection);
    
    for (let i = 1; i < paragraphs.length; i++) {
      const section = await this.createStorySection(paragraphs[i], aspectRatio, false);
      this.storyContent.appendChild(section);
    }

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'd-flex align-items-center justify-content-between mt-4';
    
    const leftButtons = document.createElement('div');
    leftButtons.className = 'd-flex gap-2';
    
    const downloadAllBtn = document.createElement('button');
    downloadAllBtn.className = 'btn btn-primary';
    downloadAllBtn.innerHTML = '<i class="bi bi-file-earmark-zip"></i> Descargar Todas las Imágenes (ZIP)';
    downloadAllBtn.addEventListener('click', () => this.downloadAllImages());
    
    const copyStoryBtn = document.createElement('button');
    copyStoryBtn.className = 'btn btn-primary';
    copyStoryBtn.innerHTML = '<i class="bi bi-clipboard"></i> Copiar Historia';
    copyStoryBtn.addEventListener('click', () => this.copyStory());
    
    leftButtons.appendChild(downloadAllBtn);
    leftButtons.appendChild(copyStoryBtn);
    
    const seedInfo = document.createElement('div');
    seedInfo.className = 'text-end ms-3';
    seedInfo.innerHTML = `
      <p class="mb-1">
        <strong>Semilla de Historia:</strong> ${this.storySeed}
        <button class="btn btn-link p-0 ms-2" onclick="navigator.clipboard.writeText('${this.storySeed}')">
          <i class="bi bi-clipboard" title="Copiar semilla de historia"></i>
        </button>
      </p>
      <p class="mb-0">
        <strong>Semilla de Imágenes:</strong> ${this.currentSeed}
        <button class="btn btn-link p-0 ms-2" onclick="navigator.clipboard.writeText('${this.currentSeed}')">
          <i class="bi bi-clipboard" title="Copiar semilla de imágenes"></i>
        </button>
      </p>
    `;
    
    buttonContainer.appendChild(leftButtons);
    buttonContainer.appendChild(seedInfo);
    this.storyContent.appendChild(buttonContainer);
  }

  async createStorySection(paragraph, aspectRatio, isFirst) {
    const section = document.createElement('div');
    section.className = 'story-section';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'image-wrapper';

    const imageStyle = document.getElementById('imageStyle').value;
    const stylePrompt = this.getStylePrompt(imageStyle);
    
    let characterDescriptions = '';
    for (const [name, desc] of Object.entries(this.characters)) {
      if (paragraph.toLowerCase().includes(name.toLowerCase())) {
        characterDescriptions += `${name} appears as ${desc}. `;
      }
    }
    
    const imagePrompt = `${stylePrompt}, ${characterDescriptions} Scene: ${paragraph}`;
    
    const [width, height] = aspectRatio.split('x').map(Number);
    let imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=${width}&height=${height}&nologo=true`;
    
    if (isFirst && !this.currentSeed) {
      const response = await fetch(imageUrl);
      const urlParts = new URL(response.url);
      this.currentSeed = urlParts.searchParams.get('seed') || Math.floor(Math.random() * 1000000);
    }
    
    imageUrl += `&seed=${this.currentSeed}`;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Ilustración de la historia';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.innerHTML = '<i class="bi bi-download"></i>';
    downloadBtn.addEventListener('click', () => this.downloadImage(imageUrl, width, height));

    const regenerateBtn = document.createElement('button');
    regenerateBtn.className = 'regenerate-btn';
    regenerateBtn.textContent = 'R';
    regenerateBtn.addEventListener('click', () => this.showRegenerateModal(img, width, height));

    imageWrapper.appendChild(img);
    imageWrapper.appendChild(downloadBtn);
    imageWrapper.appendChild(regenerateBtn);
    imageContainer.appendChild(imageWrapper);

    const paragraphContainer = document.createElement('div');
    paragraphContainer.className = 'paragraph-container';
    paragraphContainer.textContent = paragraph;

    section.appendChild(imageContainer);
    section.appendChild(paragraphContainer);

    return section;
  }

  getStylePrompt(style) {
    const stylePrompts = {
      'realistic': 'high-quality photorealistic image, highly detailed, sharp focus, 4K resolution',
      'anime': 'high-quality anime illustration, Studio Ghibli style, detailed, vibrant colors',
      'cartoon': 'high-quality cartoon illustration, Disney/Pixar style, colorful, detailed',
      'watercolor': 'beautiful watercolor painting, artistic, detailed brushstrokes, vibrant colors',
      'oil-painting': 'detailed oil painting, classical style, rich colors, masterful technique',
      'digital-art': 'professional digital art, detailed, modern style, vibrant colors',
      'sketch': 'detailed pencil sketch, professional drawing, high contrast, artistic',
      '3d-render': 'photorealistic 3D render, octane render, high detail, professional lighting',
      'minimalist': 'clean minimalist illustration, simple shapes, elegant design, modern style',
      'comic': 'professional comic book art, detailed illustration, dynamic composition'
    };
    
    return stylePrompts[style] || stylePrompts['realistic'];
  }

  async downloadImage(url, width, height) {
    try {
      const downloadUrl = new URL(url);
      downloadUrl.searchParams.set('width', width);
      downloadUrl.searchParams.set('height', height);
      downloadUrl.searchParams.set('nologo', 'true');
      
      const response = await fetch(downloadUrl.toString());
      if (!response.ok) throw new Error('Failed to download image');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `historia-imagen-${width}x${height}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Error al descargar la imagen. Por favor, intente nuevamente.');
    }
  }

  async downloadAllImages() {
    try {
      this.showLoading(true);

      const zip = new JSZip();
      const images = Array.from(document.querySelectorAll('.story-section img'));
      const aspectRatio = document.getElementById('aspectRatio').value;
      const [width, height] = aspectRatio.split('x').map(Number);

      const downloads = images.map(async (img, index) => {
        const imageUrl = new URL(img.src);
        imageUrl.searchParams.set('width', width);
        imageUrl.searchParams.set('height', height);
        
        const response = await fetch(imageUrl.toString());
        const blob = await response.blob();
        zip.file(`historia-imagen-${index + 1}-${width}x${height}.jpg`, blob);
      });

      await Promise.all(downloads);

      const content = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(content);
      
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `historia-imagenes-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error('Error downloading images:', error);
      alert('Error al descargar las imágenes. Por favor, intente nuevamente.');
    } finally {
      this.showLoading(false);
    }
  }

  copyStory() {
    const paragraphs = Array.from(document.querySelectorAll('.paragraph-container'))
      .map(p => p.textContent)
      .join('\n\n');
    
    navigator.clipboard.writeText(paragraphs)
      .then(() => alert('Historia copiada al portapapeles'))
      .catch(err => console.error('Error al copiar:', err));
  }

  resetForm() {
    this.form.reset();
    this.storyResult.classList.add('d-none');
    this.storyContent.innerHTML = '';
  }

  showLoading(show) {
    this.loadingIndicator.classList.toggle('d-none', !show);
    this.form.querySelector('button[type="submit"]').disabled = show;
  }

  setupThemeToggle() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    this.updateThemeButton(savedTheme);

    this.themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-bs-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      document.documentElement.setAttribute('data-bs-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      this.updateThemeButton(newTheme);
    });
  }

  updateThemeButton(theme) {
    const icon = this.themeToggle.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'bi bi-sun-fill';
      this.themeToggle.title = 'Cambiar a modo claro';
    } else {
      icon.className = 'bi bi-moon-fill';
      this.themeToggle.title = 'Cambiar a modo oscuro';
    }
  }

  showRegenerateModal(img, width, height) {
    this.closeActiveModal();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.addEventListener('click', () => this.closeActiveModal());

    const modal = document.createElement('div');
    modal.className = 'regenerate-modal';
    modal.onclick = (e) => e.stopPropagation();

    const content = document.createElement('div');
    content.innerHTML = `
      <h5 class="mb-3">Regenerar Imagen</h5>
      <div class="mb-3">
        <label for="modalImageStyle" class="form-label">Estilo de Imagen</label>
        <select class="form-select" id="modalImageStyle">
          <option value="realistic">Realista</option>
          <option value="anime">Anime</option>
          <option value="cartoon">Dibujos Animados</option>
          <option value="watercolor">Acuarela</option>
          <option value="oil-painting">Pintura al Óleo</option>
          <option value="digital-art">Arte Digital</option>
          <option value="sketch">Boceto</option>
          <option value="3d-render">Renderizado 3D</option>
          <option value="minimalist">Minimalista</option>
          <option value="comic">Cómic</option>
        </select>
      </div>
      <div class="mb-3">
        <label for="customPrompt" class="form-label">Prompt Personalizado</label>
        <textarea class="form-control" id="customPrompt" rows="3"></textarea>
      </div>
      <div class="mb-3">
        <label for="customSeed" class="form-label">Semilla de Imagen (opcional)</label>
        <input type="number" class="form-control" id="customSeed" placeholder="Dejar vacío para usar la semilla actual">
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-secondary" id="cancelBtn">Cancelar</button>
        <button class="btn btn-primary" id="regenerateBtn">Regenerar Imagen</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    this.activeModal = { backdrop, modal };

    const cancelBtn = modal.querySelector('#cancelBtn');
    const regenerateBtn = modal.querySelector('#regenerateBtn');
    const promptInput = modal.querySelector('#customPrompt');
    const seedInput = modal.querySelector('#customSeed');
    const styleSelect = modal.querySelector('#modalImageStyle');

    seedInput.value = this.currentSeed; // Pre-fill with current seed
    styleSelect.value = document.getElementById('imageStyle').value; // Pre-fill with current style

    cancelBtn.addEventListener('click', () => this.closeActiveModal());
    regenerateBtn.addEventListener('click', async () => {
      const customPrompt = promptInput.value.trim();
      const imageStyle = styleSelect.value;
      if (customPrompt) {
        const stylePrompt = this.getStylePrompt(imageStyle);
        const fullPrompt = `${stylePrompt}, ${customPrompt}`;
        const customSeed = seedInput.value.trim() ? parseInt(seedInput.value) : this.currentSeed;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&nologo=true&seed=${customSeed}`;
        img.src = imageUrl;
        if (seedInput.value.trim()) {
          this.currentSeed = customSeed; // Update current seed if a new one was provided
        }
        this.closeActiveModal();
      }
    });
  }

  closeActiveModal() {
    if (this.activeModal) {
      this.activeModal.backdrop.remove();
      this.activeModal.modal.remove();
      this.activeModal = null;
    }
  }

}

// Initialize after DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
  window.storyGenerator = new StoryGenerator();
});