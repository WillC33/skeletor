class TemplateInjector {
  constructor() {
    this.activeInput = null
    this.templates = []
    this.selectorVisible = false
    this.selectedIndex = -1
    this.init()
  }

  async init() {
    await this.loadTemplates()
    this.bindEvents()
    this.createTemplateSelector()
    this.injectCSS()
  }

  injectCSS() {
    if (document.getElementById('template-injector-styles')) {
      return
    }

    const style = document.createElement('style')
    style.id = 'template-injector-styles'
    style.textContent = `
            body #template-selector .template-option.hidden,
            html #template-selector .template-option.hidden,
            #template-selector .template-option.hidden {
                display: none !important;
            }
            
            body #template-selector .template-option.visible,
            html #template-selector .template-option.visible,
            #template-selector .template-option.visible {
                display: block !important;
            }
            
            #template-selector .search-empty {
                display: block !important;
            }
        `
    document.head.appendChild(style)
  }

  async loadTemplates() {
    try {
      const result = await browser.storage.local.get('templates')
      this.templates = result.templates || []
    } catch (error) {
      console.error('Error loading templates:', error)
      this.templates = []
    }
  }

  bindEvents() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'triggerTemplateSelector') {
        this.handleShortcut()
        sendResponse({ success: true })
      }
      return true
    })

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.selectorVisible) {
        this.hideSelector()
      }
    })

    document.addEventListener('focusin', e => {
      if (this.selectorVisible) {
        return
      }
      if (this.isTextInput(e.target)) {
        this.activeInput = e.target
      }
    })

    if (window.location.hostname.includes('linkedin.com')) {
      document.addEventListener('click', e => {
        if (this.selectorVisible) {
          return
        }
        const messageComposer = e.target.closest('.msg-form__contenteditable')
        if (messageComposer) {
          this.activeInput = messageComposer
        }
      })
    }

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.templates) {
        this.loadTemplates()
      }
    })
  }

  isTextInput(element) {
    const tagName = element.tagName.toLowerCase()
    const inputTypes = ['text', 'email', 'search', 'url', 'tel']

    if (tagName === 'textarea' ||
      (tagName === 'input' && inputTypes.includes(element.type))) {
      return true
    }

    if (element.contentEditable === 'true' ||
      element.hasAttribute('contenteditable')) {
      return true
    }

    if (window.location.hostname.includes('linkedin.com')) {
      if (element.classList.contains('msg-form__contenteditable') ||
        element.closest('.msg-form__contenteditable') ||
        element.classList.contains('ql-editor') ||
        element.closest('.ql-editor')) {
        return true
      }
    }

    return false
  }

  handleShortcut() {
    if (window.location.hostname.includes('linkedin.com')) {
      const linkedinComposer = document.querySelector(
        '.msg-form__contenteditable[contenteditable="true"]'
      )
      if (linkedinComposer) {
        this.activeInput = linkedinComposer
      }
    }

    if (!this.activeInput) {
      this.activeInput = document.activeElement
      if (!this.isTextInput(this.activeInput)) {
        this.showMessage(
          'Please click in a text input field first, then press Ctrl+Alt+I'
        )
        return
      }
    }

    if (!this.isTextInput(this.activeInput)) {
      this.showMessage(
        'Please click in a text input field first, then press Ctrl+Alt+I'
      )
      return
    }

    if (this.templates.length === 0) {
      this.showMessage('No templates available. Add some templates first!')
      return
    }

    this.showSelector()
  }

  createTemplateSelector() {
    const existingSelector = document.getElementById('template-selector')
    if (existingSelector) {
      existingSelector.remove()
    }

    const selector = document.createElement('div')
    selector.id = 'template-selector'
    selector.className = 'template-selector'

    const modal = document.createElement('div')
    modal.className = 'template-selector-modal'

    const header = document.createElement('div')
    header.className = 'template-selector-header'

    const title = document.createElement('h3')
    title.textContent = 'Select a Template'

    const closeBtn = document.createElement('button')
    closeBtn.className = 'template-close-btn'
    closeBtn.type = 'button'
    closeBtn.textContent = '×'

    header.appendChild(title)
    header.appendChild(closeBtn)

    const searchDiv = document.createElement('div')
    searchDiv.className = 'template-search'

    const searchInput = document.createElement('input')
    searchInput.type = 'text'
    searchInput.placeholder = 'Search templates...'
    searchInput.id = 'template-search-input'

    searchDiv.appendChild(searchInput)

    const optionsDiv = document.createElement('div')
    optionsDiv.className = 'template-options'
    optionsDiv.id = 'template-options'

    modal.appendChild(header)
    modal.appendChild(searchDiv)
    modal.appendChild(optionsDiv)
    selector.appendChild(modal)

    document.body.appendChild(selector)
    this.bindCloseEvents(selector)
    this.bindSearchEvents(selector)
  }

  bindCloseEvents(selector) {
    const closeBtn = selector.querySelector('.template-close-btn')
    closeBtn.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      this.hideSelector()
    })

    selector.addEventListener('click', e => {
      if (e.target === selector) {
        this.hideSelector()
      }
    })

    const modal = selector.querySelector('.template-selector-modal')
    modal.addEventListener('click', e => {
      e.stopPropagation()
    })
  }

  bindSearchEvents(selector) {
    const searchInput = selector.querySelector('#template-search-input')

    const doSearch = () => {
      const query = searchInput.value.toLowerCase().trim()
      const options = selector.querySelectorAll('.template-option')

      let visibleCount = 0
      let firstVisibleFound = false

      options.forEach((option, index) => {
        if (index < this.templates.length) {
          const template = this.templates[index]
          const nameMatch = template.name.toLowerCase().includes(query)
          const contentMatch = template.content.toLowerCase().includes(query)
          const shouldShow = query === '' || nameMatch || contentMatch

          if (shouldShow) {
            option.style.setProperty('display', 'block', 'important')
            option.style.setProperty('visibility', 'visible', 'important')
            option.style.setProperty('opacity', '1', 'important')
            option.style.removeProperty('height')
            option.style.setProperty('overflow', 'visible', 'important')
            option.classList.remove('hidden')
            option.classList.add('visible')
            option.removeAttribute('hidden')

            if (!firstVisibleFound) {
              option.style.setProperty('padding-top', '24px', 'important')
              firstVisibleFound = true
            } else {
              option.style.setProperty('padding-top', '12px', 'important')
            }
            visibleCount++
          } else {
            option.style.setProperty('display', 'none', 'important')
            option.style.setProperty('visibility', 'hidden', 'important')
            option.style.setProperty('opacity', '0', 'important')
            option.classList.remove('visible')
            option.classList.add('hidden')
            option.setAttribute('hidden', 'true')
          }
        }
      })

      this.updateEmptyState(visibleCount === 0 && query !== '')
      this.selectedIndex = -1
      this.updateSelection()
    }

    // Keyboard navigation
    searchInput.addEventListener('keydown', e => {
      const visibleOptions = Array.from(selector.querySelectorAll('.template-option.visible'))

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (visibleOptions.length > 0) {
          this.selectedIndex = Math.min(this.selectedIndex + 1, visibleOptions.length - 1)
          this.updateSelection()
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (visibleOptions.length > 0) {
          this.selectedIndex = Math.max(this.selectedIndex - 1, -1)
          this.updateSelection()
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (this.selectedIndex >= 0 && this.selectedIndex < visibleOptions.length) {
          const selectedOption = visibleOptions[this.selectedIndex]
          const templateIndex = Array.from(selector.querySelectorAll('.template-option')).indexOf(selectedOption)
          if (templateIndex >= 0 && templateIndex < this.templates.length) {
            this.insertTemplate(this.templates[templateIndex])
          }
        }
      } else if (e.key === 'Tab') {
        e.preventDefault()
        // Tab cycles through templates
        if (visibleOptions.length > 0) {
          this.selectedIndex = (this.selectedIndex + 1) % visibleOptions.length
          this.updateSelection()
        }
      } else if (!['Escape'].includes(e.key)) {
        setTimeout(() => doSearch(), 1)
      }
    })

    searchInput.addEventListener('input', e => {
      e.preventDefault()
      doSearch()
    })

    searchInput.addEventListener('keyup', e => {
      if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
        e.preventDefault()
        doSearch()
      }
    })

    searchInput.addEventListener('change', e => {
      e.preventDefault()
      doSearch()
    })

    searchInput.addEventListener('paste', e => {
      setTimeout(() => doSearch(), 10)
    })
  }

  updateEmptyState(showEmpty) {
    const optionsContainer = document.getElementById('template-options')
    let emptyMessage = optionsContainer.querySelector('.search-empty')

    if (showEmpty && !emptyMessage) {
      emptyMessage = document.createElement('div')
      emptyMessage.className = 'search-empty'
      emptyMessage.style.cssText = `
                padding: 20px !important;
                text-align: center !important;
                color: #aaa !important;
                font-family: 'Courier New', monospace !important;
                font-size: 12px !important;
                text-transform: uppercase !important;
                letter-spacing: 1px !important;
            `
      emptyMessage.textContent = 'NO TEMPLATES MATCH YOUR SEARCH'
      optionsContainer.appendChild(emptyMessage)
    } else if (!showEmpty && emptyMessage) {
      emptyMessage.remove()
    }
  }

  showSelector() {
    const selector = document.getElementById('template-selector')
    this.renderTemplateOptions()
    selector.style.display = 'flex'
    this.selectorVisible = true
    this.selectedIndex = -1

    setTimeout(() => {
      const searchInput = document.getElementById('template-search-input')
      if (searchInput) {
        searchInput.focus()
        searchInput.value = ''
      }
    }, 100)
  }

  updateSelection() {
    const selector = document.getElementById('template-selector')
    if (!selector) return

    const visibleOptions = selector.querySelectorAll('.template-option.visible')

    visibleOptions.forEach((option, index) => {
      if (index === this.selectedIndex) {
        option.style.setProperty('background', '#252525', 'important')
        option.style.setProperty('border-left', '3px solid #f3ed28', 'important')
        option.style.setProperty('padding-left', '11px', 'important')
        option.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      } else {
        option.style.removeProperty('background')
        option.style.removeProperty('border-left')
        option.style.setProperty('padding-left', '12px', 'important')
      }
    })
  }

  hideSelector() {
    const selector = document.getElementById('template-selector')
    if (selector) {
      selector.style.display = 'none'
      this.selectorVisible = false
      this.selectedIndex = -1

      const searchInput = document.getElementById('template-search-input')
      if (searchInput) {
        searchInput.value = ''
      }

      const options = selector.querySelectorAll('.template-option')
      options.forEach((option, index) => {
        option.style.setProperty('display', 'block', 'important')
        option.style.setProperty('visibility', 'visible', 'important')
        option.style.setProperty('opacity', '1', 'important')
        option.style.removeProperty('height')
        option.style.removeProperty('background')
        option.style.removeProperty('border-left')
        option.classList.remove('hidden')
        option.classList.add('visible')
        option.removeAttribute('hidden')

        if (index === 0) {
          option.style.setProperty('padding-top', '24px', 'important')
        } else {
          option.style.setProperty('padding-top', '12px', 'important')
        }
        option.style.setProperty('padding-left', '12px', 'important')
      })

      const emptyMessage = selector.querySelector('.search-empty')
      if (emptyMessage) {
        emptyMessage.remove()
      }

      if (this.activeInput) {
        try {
          this.activeInput.focus()
        } catch (error) {
          // Focus might fail
        }
      }
    }
  }

  renderTemplateOptions() {
    const container = document.getElementById('template-options')
    container.textContent = ''

    this.templates.forEach((template) => {
      const option = document.createElement('div')
      option.className = 'template-option visible'

      const nameDiv = document.createElement('div')
      nameDiv.className = 'template-option-name'
      nameDiv.textContent = template.name

      const previewDiv = document.createElement('div')
      previewDiv.className = 'template-option-preview'
      previewDiv.textContent = this.getPreview(template.content)

      option.appendChild(nameDiv)
      option.appendChild(previewDiv)

      option.addEventListener('click', () => {
        this.insertTemplate(template)
      })

      container.appendChild(option)
    })
  }

  insertTemplate(template) {
    if (!this.activeInput) {
      this.hideSelector()
      this.showMessage('No input field selected')
      return
    }

    let content = template.content
    if (content) {
      content = this.replaceVariables(content)
    }

    let insertionSuccessful = false

    if (window.location.hostname.includes('linkedin.com') &&
      this.activeInput.classList &&
      this.activeInput.classList.contains('msg-form__contenteditable')) {
      try {
        this.activeInput.focus()

        // Clear all existing content
        while (this.activeInput.firstChild) {
          this.activeInput.removeChild(this.activeInput.firstChild)
        }

        if (content) {
          const paragraphs = content.split('\n').filter(p => p.trim() !== '')

          if (paragraphs.length === 0) {
            const p = document.createElement('p')
            p.appendChild(document.createElement('br'))
            this.activeInput.appendChild(p)
          } else {
            // LinkedIn needs paragraphs for proper formatting
            paragraphs.forEach(text => {
              const p = document.createElement('p')
              p.textContent = text
              this.activeInput.appendChild(p)
            })
          }
        } else {
          const p = document.createElement('p')
          p.appendChild(document.createElement('br'))
          this.activeInput.appendChild(p)
        }

        // Hide placeholder
        const placeholder = this.activeInput.parentNode.querySelector('.msg-form__placeholder')
        if (placeholder) {
          placeholder.style.display = 'none'
        }

        // Move cursor to end and trigger all LinkedIn events
        const range = document.createRange()
        const selection = window.getSelection()

        // Select all content first
        range.selectNodeContents(this.activeInput)
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)

        // Trigger multiple events to ensure LinkedIn recognizes the change
        this.activeInput.dispatchEvent(new Event('focus', { bubbles: true }))
        this.activeInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
        this.activeInput.dispatchEvent(new Event('change', { bubbles: true }))
        this.activeInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }))
        this.activeInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
        this.activeInput.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true }))

        // Force LinkedIn to notice the content change
        this.activeInput.blur()
        this.activeInput.focus()

        insertionSuccessful = true
      } catch (error) {
        console.error('LinkedIn insertion failed:', error)
      }
    }
    else if (this.activeInput.tagName.toLowerCase() === 'textarea' ||
      (this.activeInput.tagName.toLowerCase() === 'input' &&
        ['text', 'email', 'search', 'url', 'tel'].includes(this.activeInput.type))) {
      try {
        const start = this.activeInput.selectionStart || 0
        const end = this.activeInput.selectionEnd || 0
        const currentValue = this.activeInput.value || ''

        this.activeInput.value =
          currentValue.substring(0, start) +
          content +
          currentValue.substring(end)
        this.activeInput.selectionStart = this.activeInput.selectionEnd = start + content.length

        this.activeInput.dispatchEvent(new Event('input', { bubbles: true }))
        this.activeInput.dispatchEvent(new Event('change', { bubbles: true }))

        insertionSuccessful = true
      } catch (error) {
        console.error('Standard input insertion failed:', error)
      }
    }
    else if (this.activeInput.contentEditable === 'true' ||
      this.activeInput.hasAttribute('contenteditable')) {
      try {
        this.activeInput.focus()

        try {
          const success = document.execCommand('insertText', false, content)
          if (success) {
            insertionSuccessful = true
          } else {
            throw new Error('execCommand returned false')
          }
        } catch (execError) {
          const isEmpty = this.activeInput.textContent.trim() === ''

          if (isEmpty) {
            this.activeInput.textContent = ''
            const lines = content.split('\n')
            lines.forEach((line, index) => {
              if (index > 0) {
                this.activeInput.appendChild(document.createElement('br'))
              }
              this.activeInput.appendChild(document.createTextNode(line))
            })
          } else {
            this.activeInput.appendChild(document.createElement('br'))
            const lines = content.split('\n')
            lines.forEach((line, index) => {
              if (index > 0) {
                this.activeInput.appendChild(document.createElement('br'))
              }
              this.activeInput.appendChild(document.createTextNode(line))
            })
          }
          insertionSuccessful = true
        }

        this.activeInput.dispatchEvent(new Event('input', { bubbles: true }))
        this.activeInput.dispatchEvent(new Event('change', { bubbles: true }))
      } catch (error) {
        console.error('ContentEditable insertion failed:', error)
      }
    }

    this.hideSelector()

    if (insertionSuccessful && content && content.trim() !== '') {
      this.showMessage(`Template "${template.name}" inserted!`)
    } else if (!insertionSuccessful && content && content.trim() !== '') {
      this.showMessage(`Failed to insert template "${template.name}"`)
    }
  }

  replaceVariables(content) {
    const variables = {
      '{name}': this.extractNameFromPage(),
      '{date}': new Date().toLocaleDateString(),
      '{time}': new Date().toLocaleTimeString(),
    }

    let result = content
    Object.keys(variables).forEach(key => {
      result = result.replace(new RegExp(key, 'g'), variables[key])
    })

    return result
  }

  extractNameFromPage() {
    if (window.location.hostname.includes('linkedin.com')) {
      const nameSelectors = [
        'h1.text-heading-xlarge',
        '.pv-text-details__left-panel h1',
        '.profile-photo-edit__preview-container + div h1',
      ]

      for (let selector of nameSelectors) {
        const element = document.querySelector(selector)
        if (element) {
          return element.textContent.trim().split(' ')[0]
        }
      }
    }

    return '[Name]'
  }

  getPreview(content) {
    return content.length > 60 ? content.substring(0, 60) + '...' : content
  }

  showMessage(message) {
    const messageEl = document.createElement('div')
    messageEl.className = 'template-message'
    messageEl.textContent = message
    document.body.appendChild(messageEl)

    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl)
      }
    }, 3000)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TemplateInjector()
  })
} else {
  new TemplateInjector()
}
