// Background script for handling extension lifecycle and cross-tab communication

class BackgroundManager {
    constructor() {
        this.init()
    }

    init() {
        // Handle extension installation
        browser.runtime.onInstalled.addListener(details => {
            if (details.reason === 'install') {
                this.onInstall()
            } else if (details.reason === 'update') {
                this.onUpdate()
            }
        })

        // Handle messages from content scripts or popup
        browser.runtime.onMessage.addListener(
            (message, sender, sendResponse) => {
                return this.handleMessage(message, sender, sendResponse)
            }
        )

        // Handle browser action clicks (if popup fails to open)
        browser.browserAction.onClicked.addListener(tab => {
            this.handleBrowserActionClick(tab)
        })
    }

    async onInstall() {
        console.log('Template Manager installed')

        // Initialize with a couple sample templates for testing
        const sampleTemplates = [
            {
                id: 'sample-1',
                name: 'LinkedIn Connection Request',
                content:
                    "Hi {name},\n\nI came across your profile and would love to connect. I'm interested in learning more about your work in [industry/field].\n\nBest regards!",
                createdAt: new Date().toISOString(),
            },
            {
                id: 'sample-2',
                name: 'Follow-up Email',
                content:
                    'Hi {name},\n\nI wanted to follow up on our conversation about [topic]. Do you have time for a quick call this week to discuss next steps?\n\nThanks!',
                createdAt: new Date().toISOString(),
            },
        ]

        try {
            const existing = await browser.storage.local.get('templates')

            // Only add samples if no templates exist
            if (!existing.templates || existing.templates.length === 0) {
                await browser.storage.local.set({ templates: sampleTemplates })
            }
        } catch (error) {
            console.error('Error initializing templates:', error)
        }
    }

    onUpdate() {
        console.log('Template Manager updated')
        // Handle any migration logic here if needed
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'getTemplates':
                    const result = await browser.storage.local.get('templates')
                    sendResponse({ templates: result.templates || [] })
                    break

                case 'saveTemplate':
                    await this.saveTemplate(message.template)
                    sendResponse({ success: true })
                    break

                case 'deleteTemplate':
                    await this.deleteTemplate(message.templateId)
                    sendResponse({ success: true })
                    break

                case 'exportTemplates':
                    const templates = await this.exportTemplates()
                    sendResponse({ templates })
                    break

                case 'importTemplates':
                    await this.importTemplates(message.templates)
                    sendResponse({ success: true })
                    break

                default:
                    sendResponse({ error: 'Unknown action' })
            }
        } catch (error) {
            console.error('Error handling message:', error)
            sendResponse({ error: error.message })
        }

        return true // Keep message channel open for async response
    }

    async saveTemplate(template) {
        const result = await browser.storage.local.get('templates')
        const templates = result.templates || []

        // Add timestamp and unique ID if not present
        if (!template.id) {
            template.id = Date.now().toString()
        }
        if (!template.createdAt) {
            template.createdAt = new Date().toISOString()
        }

        templates.push(template)
        await browser.storage.local.set({ templates })
    }

    async deleteTemplate(templateId) {
        const result = await browser.storage.local.get('templates')
        const templates = result.templates || []
        const filteredTemplates = templates.filter(t => t.id !== templateId)
        await browser.storage.local.set({ templates: filteredTemplates })
    }

    async exportTemplates() {
        const result = await browser.storage.local.get('templates')
        return result.templates || []
    }

    async importTemplates(newTemplates) {
        const result = await browser.storage.local.get('templates')
        const existingTemplates = result.templates || []

        // Merge templates, avoiding duplicates by name
        const existingNames = new Set(existingTemplates.map(t => t.name))
        const templatestoAdd = newTemplates.filter(
            t => !existingNames.has(t.name)
        )

        // Ensure imported templates have proper IDs
        templatestoAdd.forEach(template => {
            if (!template.id) {
                template.id =
                    Date.now().toString() +
                    Math.random().toString(36).substr(2, 9)
            }
            if (!template.createdAt) {
                template.createdAt = new Date().toISOString()
            }
        })

        const allTemplates = [...existingTemplates, ...templatestoAdd]
        await browser.storage.local.set({ templates: allTemplates })
    }

    handleBrowserActionClick(tab) {
        // Fallback if popup doesn't open - inject content script manually
        browser.tabs.executeScript(tab.id, {
            code: `
                if (!window.templateInjectorLoaded) {
                    console.log('Template Manager: Manual injection triggered');
                }
            `,
        })
    }
}

// Initialize background manager
new BackgroundManager()
