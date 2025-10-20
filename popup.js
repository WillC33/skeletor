class TemplateManager {
  constructor() {
    this.templates = []
    this.init()
  }

  async init() {
    await this.loadTemplates()
    await this.loadShortcut()
    this.bindEvents()
    this.renderTemplates()
  }

  async loadShortcut() {
    try {
      const response = await browser.runtime.sendMessage({ action: 'getShortcut' })
      const shortcutDisplay = document.getElementById('shortcutDisplay')

      if (response && response.shortcut) {
        shortcutDisplay.textContent = response.shortcut
      } else {
        shortcutDisplay.textContent = 'Not set'
      }
    } catch (error) {
      console.error('Error loading shortcut:', error)
      document.getElementById('shortcutDisplay').textContent = 'Ctrl+Alt+I'
    }
  }

  bindEvents() {
    document.getElementById('addBtn')
      .addEventListener('click', () => this.showAddForm())
    document.getElementById('saveBtn')
      .addEventListener('click', () => this.saveTemplate())
    document.getElementById('cancelBtn')
      .addEventListener('click', () => this.hideAddForm())

    // Shortcut settings link
    const shortcutLink = document.getElementById('shortcutLink')
    shortcutLink.addEventListener('click', (e) => {
      e.preventDefault()
      // Firefox
      if (typeof browser !== 'undefined' && browser.runtime.getBrowserInfo) {
        browser.tabs.create({ url: 'about:addons' })
      }
      // Chrome/Edge
      else if (typeof chrome !== 'undefined') {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })
      }
    })

    // Listen for storage changes from other tabs/scripts
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.templates) {
        console.log('Storage changed, reloading templates')
        this.loadTemplates().then(() => this.renderTemplates())
      }
    })
  }

  async loadTemplates() {
    try {
      console.log('Loading templates from storage...')
      const result = await browser.storage.local.get('templates')
      this.templates = result.templates || []
      console.log('Loaded templates:', this.templates.length, 'items')
    } catch (error) {
      console.error('Error loading templates:', error)
      this.templates = []
    }
  }

  async saveTemplates() {
    try {
      await browser.storage.local.set({ templates: this.templates })
      console.log('Templates saved to storage:', this.templates.length)
    } catch (error) {
      console.error('Error saving templates:', error)
      alert('Error saving template. Please try again.')
    }
  }

  showAddForm() {
    document.getElementById('addForm').classList.remove('hidden')
    document.getElementById('templateName').focus()
  }

  hideAddForm() {
    document.getElementById('addForm').classList.add('hidden')
    this.clearForm()
  }

  clearForm() {
    document.getElementById('templateName').value = ''
    document.getElementById('templateContent').value = ''
  }

  async saveTemplate() {
    const name = document.getElementById('templateName').value.trim()
    const content = document.getElementById('templateContent').value.trim()

    if (!name || !content) {
      alert('Please fill in both name and content')
      return
    }

    const template = {
      id: Date.now().toString(),
      name: name,
      content: content,
      createdAt: new Date().toISOString(),
    }

    console.log('Adding template:', template.name)

    try {
      this.templates.push(template)
      await this.saveTemplates()
      console.log('Saved to storage successfully')

      await this.loadTemplates()
      console.log('Reloaded templates from storage, count:', this.templates.length)

      this.renderTemplates()
      console.log('UI rendered')

      this.hideAddForm()
    } catch (error) {
      console.error('Error in saveTemplate:', error)
      alert('Failed to save template')
    }
  }

  async deleteTemplate(id) {
    console.log('Deleting template:', id)

    if (confirm('Are you sure you want to delete this template?')) {
      try {
        this.templates = this.templates.filter(t => t.id !== id)
        await this.saveTemplates()
        console.log('Deletion saved to storage successfully')

        await this.loadTemplates()
        console.log('Reloaded templates from storage, count:', this.templates.length)

        this.renderTemplates()
        console.log('UI rendered after deletion')
      } catch (error) {
        console.error('Error in deleteTemplate:', error)
        await this.loadTemplates()
        this.renderTemplates()
        alert('Failed to delete template')
      }
    }
  }

  renderTemplates() {
    console.log('=== RENDER TEMPLATES START ===')
    console.log('Current templates array:', this.templates)
    console.log('Number of templates:', this.templates.length)

    const listEl = document.getElementById('templateList')
    const emptyEl = document.getElementById('emptyState')

    if (!listEl) {
      console.error('Could not find templateList element!')
      return
    }

    if (!emptyEl) {
      console.error('Could not find emptyState element!')
      return
    }

    listEl.innerHTML = ''
    console.log('Cleared existing content')

    if (this.templates.length === 0) {
      console.log('No templates, showing empty state')
      emptyEl.classList.remove('hidden')
      listEl.style.display = 'none'
    } else {
      console.log('Rendering', this.templates.length, 'templates')
      emptyEl.classList.add('hidden')
      listEl.style.display = 'block'

      this.templates.forEach((template, index) => {
        console.log(`Rendering template ${index + 1}:`, template.name)

        const item = document.createElement('div')
        item.className = 'template-item'

        const preview = template.content.length > 100 ?
          template.content.substring(0, 100) + '...' :
          template.content

        // Build DOM structure safely
        const info = document.createElement('div')
        info.className = 'template-info'

        const nameDiv = document.createElement('div')
        nameDiv.className = 'template-name'
        nameDiv.textContent = template.name

        const previewDiv = document.createElement('div')
        previewDiv.className = 'template-preview'
        previewDiv.textContent = preview

        info.appendChild(nameDiv)
        info.appendChild(previewDiv)

        const actions = document.createElement('div')
        actions.className = 'template-actions'

        const deleteBtn = document.createElement('button')
        deleteBtn.className = 'btn btn-danger'
        deleteBtn.textContent = 'Delete'
        deleteBtn.dataset.id = template.id

        actions.appendChild(deleteBtn)

        item.appendChild(info)
        item.appendChild(actions)

        deleteBtn.addEventListener('click', e => {
          e.preventDefault()
          e.stopPropagation()
          console.log('Delete button clicked for:', template.id)
          this.deleteTemplate(template.id)
        })

        listEl.appendChild(item)
        console.log(`Template ${index + 1} added to DOM`)
      })
    }

    console.log('=== RENDER TEMPLATES END ===')
    console.log('Final DOM children count:', listEl.children.length)
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', () => {
  new TemplateManager()
})
