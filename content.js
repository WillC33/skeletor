class TemplateInjector {
    constructor() {
        this.activeInput = null
        this.templates = []
        this.selectorVisible = false
        this.init()
    }

    async init() {
        await this.loadTemplates()
        this.bindEvents()
        this.createTemplateSelector()
        this.injectCSS() // Add CSS injection
    }

    // Add CSS injection method
    injectCSS() {
        if (document.getElementById('template-injector-styles')) {
            return // Already injected
        }

        const style = document.createElement('style')
        style.id = 'template-injector-styles'
        style.textContent = `
            /* Match the specificity of your existing CSS */
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
            
            /* Empty search state message */
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
        // Listen for keyboard shortcut
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault()
                this.handleShortcut()
            }

            // Close selector on Escape
            if (e.key === 'Escape') {
                if (this.selectorVisible) {
                    this.hideSelector()
                }
            }
        })

        // Listen for focus on input fields - but not when selector is visible
        document.addEventListener('focusin', e => {
            // Don't change activeInput when template selector is open
            if (this.selectorVisible) {
                return
            }

            if (this.isTextInput(e.target)) {
                this.activeInput = e.target
            }
        })

        // LinkedIn-specific: also listen for clicks on the message area
        if (window.location.hostname.includes('linkedin.com')) {
            document.addEventListener('click', e => {
                // Don't change activeInput when template selector is open
                if (this.selectorVisible) {
                    return
                }

                // Check if clicked inside LinkedIn message composer
                const messageComposer = e.target.closest(
                    '.msg-form__contenteditable'
                )
                if (messageComposer) {
                    this.activeInput = messageComposer
                }
            })
        }

        // Listen for storage changes
        browser.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.templates) {
                this.loadTemplates()
            }
        })
    }

    isTextInput(element) {
        const tagName = element.tagName.toLowerCase()
        const inputTypes = ['text', 'email', 'search', 'url', 'tel']

        // Check for standard input elements
        if (
            tagName === 'textarea' ||
            (tagName === 'input' && inputTypes.includes(element.type))
        ) {
            return true
        }

        // Check for contenteditable elements
        if (
            element.contentEditable === 'true' ||
            element.hasAttribute('contenteditable')
        ) {
            return true
        }

        // LinkedIn specific selectors - be more specific
        if (window.location.hostname.includes('linkedin.com')) {
            // LinkedIn message composer - the exact class from the DOM
            if (
                element.classList.contains('msg-form__contenteditable') ||
                element.closest('.msg-form__contenteditable') ||
                element.classList.contains('ql-editor') ||
                element.closest('.ql-editor')
            ) {
                return true
            }
        }

        return false
    }

    handleShortcut() {
        // Try to find the LinkedIn message composer specifically
        if (window.location.hostname.includes('linkedin.com')) {
            const linkedinComposer = document.querySelector(
                '.msg-form__contenteditable[contenteditable="true"]'
            )
            if (linkedinComposer) {
                this.activeInput = linkedinComposer
            }
        }

        if (!this.activeInput) {
            // Try to find focused input
            this.activeInput = document.activeElement

            if (!this.isTextInput(this.activeInput)) {
                this.showMessage(
                    'Please click in a text input field first, then press Ctrl+Shift+T'
                )
                return
            }
        }

        // Double-check that we have a valid input
        if (!this.isTextInput(this.activeInput)) {
            this.showMessage(
                'Please click in a text input field first, then press Ctrl+Shift+T'
            )
            return
        }

        if (this.templates.length === 0) {
            this.showMessage(
                'No templates available. Add some templates first!'
            )
            return
        }

        this.showSelector()
    }

    createTemplateSelector() {
        // Remove any existing selector
        const existingSelector = document.getElementById('template-selector')
        if (existingSelector) {
            existingSelector.remove()
        }

        const selector = document.createElement('div')
        selector.id = 'template-selector'
        selector.className = 'template-selector'
        selector.innerHTML = `
            <div class="template-selector-modal">
                <div class="template-selector-header">
                    <h3>Select a Template</h3>
                    <button class="template-close-btn" type="button">&times;</button>
                </div>
                <div class="template-search">
                    <input type="text" placeholder="Search templates..." id="template-search-input">
                </div>
                <div class="template-options" id="template-options">
                    <!-- Templates will be inserted here -->
                </div>
            </div>
        `

        document.body.appendChild(selector)

        // Bind close events
        this.bindCloseEvents(selector)

        // Bind search with immediate reactivity
        this.bindSearchEvents(selector)
    }

    bindCloseEvents(selector) {
        const closeBtn = selector.querySelector('.template-close-btn')
        closeBtn.addEventListener('click', e => {
            e.preventDefault()
            e.stopPropagation()
            this.insertTemplate({ name: 'Close', content: '' })
        })

        // Close on overlay click
        selector.addEventListener('click', e => {
            if (e.target === selector) {
                this.insertTemplate({ name: 'Close', content: '' })
            }
        })

        // Prevent modal content clicks from closing
        const modal = selector.querySelector('.template-selector-modal')
        modal.addEventListener('click', e => {
            e.stopPropagation()
        })
    }

    bindSearchEvents(selector) {
        const searchInput = selector.querySelector('#template-search-input')

        // Direct DOM manipulation approach to force visibility changes
        const doSearch = () => {
            const query = searchInput.value.toLowerCase().trim()

            // Get all template options
            const options = selector.querySelectorAll('.template-option')

            let visibleCount = 0
            let firstVisibleFound = false

            options.forEach((option, index) => {
                if (index < this.templates.length) {
                    const template = this.templates[index]
                    const nameMatch = template.name
                        .toLowerCase()
                        .includes(query)
                    const contentMatch = template.content
                        .toLowerCase()
                        .includes(query)
                    const shouldShow = query === '' || nameMatch || contentMatch

                    // Force visibility with multiple approaches
                    if (shouldShow) {
                        // Show the option
                        option.style.setProperty(
                            'display',
                            'block',
                            'important'
                        )
                        option.style.setProperty(
                            'visibility',
                            'visible',
                            'important'
                        )
                        option.style.setProperty('opacity', '1', 'important')
                        option.style.removeProperty('height') // Let it use natural height
                        option.style.setProperty(
                            'overflow',
                            'visible',
                            'important'
                        )
                        option.classList.remove('hidden')
                        option.classList.add('visible')
                        option.removeAttribute('hidden')

                        // Ensure first visible template has proper top padding
                        if (!firstVisibleFound) {
                            option.style.setProperty(
                                'padding-top',
                                '24px',
                                'important'
                            )
                            firstVisibleFound = true
                        } else {
                            option.style.setProperty(
                                'padding-top',
                                '12px',
                                'important'
                            )
                        }

                        visibleCount++
                    } else {
                        // Hide the option using display none to completely remove from layout
                        option.style.setProperty('display', 'none', 'important')
                        option.style.setProperty(
                            'visibility',
                            'hidden',
                            'important'
                        )
                        option.style.setProperty('opacity', '0', 'important')
                        option.classList.remove('visible')
                        option.classList.add('hidden')
                        option.setAttribute('hidden', 'true')
                    }
                }
            })

            // Show/hide empty message
            this.updateEmptyState(visibleCount === 0 && query !== '')
        }

        // Bind to multiple events for maximum coverage
        searchInput.addEventListener('input', e => {
            e.preventDefault()
            doSearch()
        })

        searchInput.addEventListener('keyup', e => {
            e.preventDefault()
            doSearch()
        })

        searchInput.addEventListener('change', e => {
            e.preventDefault()
            doSearch()
        })

        searchInput.addEventListener('paste', e => {
            // For paste, we need a small delay to get the pasted content
            setTimeout(() => {
                doSearch()
            }, 10)
        })

        // Also bind keydown for immediate feedback
        searchInput.addEventListener('keydown', e => {
            // Don't prevent default for special keys
            if (
                !['Escape', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown'].includes(
                    e.key
                )
            ) {
                setTimeout(() => {
                    doSearch()
                }, 1)
            }
        })
    }

    performSearch(query) {
        const searchTerm = query.toLowerCase().trim()
        const options = document.querySelectorAll(
            '#template-selector .template-option'
        )

        let visibleCount = 0
        let firstVisibleFound = false

        options.forEach((option, index) => {
            if (index >= this.templates.length) return

            const template = this.templates[index]
            const nameMatch = template.name.toLowerCase().includes(searchTerm)
            const contentMatch = template.content
                .toLowerCase()
                .includes(searchTerm)
            const isVisible = searchTerm === '' || nameMatch || contentMatch

            // Force visibility with multiple approaches
            if (isVisible) {
                option.style.setProperty('display', 'block', 'important')
                option.style.setProperty('visibility', 'visible', 'important')
                option.style.setProperty('opacity', '1', 'important')
                option.style.removeProperty('height') // Use natural height
                option.classList.remove('hidden')
                option.classList.add('visible')
                option.removeAttribute('hidden')

                // Ensure first visible template has proper top padding
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
        })

        // Show/hide empty state if needed
        this.updateEmptyState(visibleCount === 0 && searchTerm !== '')
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

        // Focus search input for immediate typing
        setTimeout(() => {
            const searchInput = document.getElementById('template-search-input')
            if (searchInput) {
                searchInput.focus()
                searchInput.value = '' // Clear any previous search
            }
        }, 100)
    }

    hideSelector() {
        const selector = document.getElementById('template-selector')
        if (selector) {
            selector.style.display = 'none'
            this.selectorVisible = false

            // Clear search and reset all options to visible
            const searchInput = document.getElementById('template-search-input')
            if (searchInput) {
                searchInput.value = ''
            }

            // Reset all template options to visible state
            const options = selector.querySelectorAll('.template-option')
            options.forEach((option, index) => {
                option.style.setProperty('display', 'block', 'important')
                option.style.setProperty('visibility', 'visible', 'important')
                option.style.setProperty('opacity', '1', 'important')
                option.style.removeProperty('height') // Remove any height restrictions
                option.classList.remove('hidden')
                option.classList.add('visible')
                option.removeAttribute('hidden')

                // Reset padding to original values
                if (index === 0) {
                    option.style.setProperty('padding-top', '24px', 'important')
                } else {
                    option.style.setProperty('padding-top', '12px', 'important')
                }
            })

            // Remove empty state message if it exists
            const emptyMessage = selector.querySelector('.search-empty')
            if (emptyMessage) {
                emptyMessage.remove()
            }

            // Refocus original input
            if (this.activeInput) {
                try {
                    this.activeInput.focus()
                } catch (error) {
                    // Focus might fail on some elements
                }
            }
        }
    }

    renderTemplateOptions() {
        const container = document.getElementById('template-options')
        container.innerHTML = ''

        this.templates.forEach((template, index) => {
            const option = document.createElement('div')
            option.className = 'template-option visible' // Add visible class by default
            option.innerHTML = `
                <div class="template-option-name">${this.escapeHtml(template.name)}</div>
                <div class="template-option-preview">${this.escapeHtml(this.getPreview(template.content))}</div>
            `

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

        // Simple variable replacement (skip for empty close templates)
        if (content) {
            content = this.replaceVariables(content)
        }

        let insertionSuccessful = false

        // Force LinkedIn contenteditable handling if we detect LinkedIn message box
        if (
            window.location.hostname.includes('linkedin.com') &&
            this.activeInput.classList &&
            this.activeInput.classList.contains('msg-form__contenteditable')
        ) {
            try {
                // Focus the element first
                this.activeInput.focus()

                // Clear the default LinkedIn content
                if (
                    this.activeInput.innerHTML.includes('<p>&nbsp;<br></p>') ||
                    this.activeInput.innerHTML.includes('<p><br></p>') ||
                    this.activeInput.textContent.trim() === '' ||
                    this.activeInput.innerHTML.trim() === ''
                ) {
                    this.activeInput.innerHTML = ''
                }

                // Insert content with LinkedIn's expected format
                if (content) {
                    // Convert newlines to LinkedIn's paragraph format
                    const paragraphs = content
                        .split('\n')
                        .filter(p => p.trim() !== '')
                    let htmlContent = ''

                    if (paragraphs.length === 0) {
                        htmlContent = '<p><br></p>'
                    } else if (paragraphs.length === 1) {
                        htmlContent = `<p>${paragraphs[0]}</p>`
                    } else {
                        htmlContent = paragraphs
                            .map(p => `<p>${p}</p>`)
                            .join('')
                    }

                    this.activeInput.innerHTML = htmlContent
                } else {
                    // For empty content (close), just clear
                    this.activeInput.innerHTML = '<p><br></p>'
                }

                // Hide the placeholder
                const placeholder = this.activeInput.parentNode.querySelector(
                    '.msg-form__placeholder'
                )
                if (placeholder) {
                    placeholder.style.display = 'none'
                }

                // Move cursor to end
                const range = document.createRange()
                const selection = window.getSelection()
                range.selectNodeContents(this.activeInput)
                range.collapse(false)
                selection.removeAllRanges()
                selection.addRange(range)

                // Trigger events for LinkedIn
                this.activeInput.dispatchEvent(
                    new Event('input', { bubbles: true })
                )
                this.activeInput.dispatchEvent(
                    new Event('change', { bubbles: true })
                )
                this.activeInput.dispatchEvent(
                    new KeyboardEvent('keyup', { bubbles: true })
                )
                this.activeInput.dispatchEvent(
                    new Event('blur', { bubbles: true })
                )
                this.activeInput.dispatchEvent(
                    new Event('focus', { bubbles: true })
                )

                insertionSuccessful = true
            } catch (error) {
                console.error('LinkedIn insertion failed:', error)
            }
        }

        // Standard input/textarea elements (fallback)
        else if (
            this.activeInput.tagName.toLowerCase() === 'textarea' ||
            (this.activeInput.tagName.toLowerCase() === 'input' &&
                ['text', 'email', 'search', 'url', 'tel'].includes(
                    this.activeInput.type
                ))
        ) {
            try {
                const start = this.activeInput.selectionStart || 0
                const end = this.activeInput.selectionEnd || 0
                const currentValue = this.activeInput.value || ''

                this.activeInput.value =
                    currentValue.substring(0, start) +
                    content +
                    currentValue.substring(end)
                this.activeInput.selectionStart =
                    this.activeInput.selectionEnd = start + content.length

                // Trigger events
                this.activeInput.dispatchEvent(
                    new Event('input', { bubbles: true })
                )
                this.activeInput.dispatchEvent(
                    new Event('change', { bubbles: true })
                )

                insertionSuccessful = true
            } catch (error) {
                console.error('Standard input insertion failed:', error)
            }
        }

        // Generic contenteditable fallback
        else if (
            this.activeInput.contentEditable === 'true' ||
            this.activeInput.hasAttribute('contenteditable')
        ) {
            try {
                this.activeInput.focus()

                // Try execCommand first
                try {
                    const success = document.execCommand(
                        'insertText',
                        false,
                        content
                    )
                    if (success) {
                        insertionSuccessful = true
                    } else {
                        throw new Error('execCommand returned false')
                    }
                } catch (execError) {
                    // Manual insertion fallback
                    if (
                        this.activeInput.innerHTML.trim() === '' ||
                        this.activeInput.innerHTML === '<br>'
                    ) {
                        this.activeInput.innerHTML = content.replace(
                            /\n/g,
                            '<br>'
                        )
                    } else {
                        this.activeInput.innerHTML +=
                            '<br>' + content.replace(/\n/g, '<br>')
                    }
                    insertionSuccessful = true
                }

                this.activeInput.dispatchEvent(
                    new Event('input', { bubbles: true })
                )
                this.activeInput.dispatchEvent(
                    new Event('change', { bubbles: true })
                )
            } catch (error) {
                console.error('ContentEditable insertion failed:', error)
            }
        }

        this.hideSelector()

        // Only show success message for actual templates with content (not empty close)
        if (insertionSuccessful && content && content.trim() !== '') {
            this.showMessage(`Template "${template.name}" inserted!`)
        } else if (!insertionSuccessful && content && content.trim() !== '') {
            this.showMessage(`Failed to insert template "${template.name}"`)
        }
        // No message for empty content (close operations)
    }

    replaceVariables(content) {
        // Simple variable replacement
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
        // Try to extract name from LinkedIn profile
        if (window.location.hostname.includes('linkedin.com')) {
            const nameSelectors = [
                'h1.text-heading-xlarge',
                '.pv-text-details__left-panel h1',
                '.profile-photo-edit__preview-container + div h1',
            ]

            for (let selector of nameSelectors) {
                const element = document.querySelector(selector)
                if (element) {
                    return element.textContent.trim().split(' ')[0] // First name only
                }
            }
        }

        return '[Name]' // Fallback
    }

    getPreview(content) {
        return content.length > 60 ? content.substring(0, 60) + '...' : content
    }

    showMessage(message) {
        // Create temporary message
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

    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new TemplateInjector()
    })
} else {
    new TemplateInjector()
}
