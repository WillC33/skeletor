# Skeletor: Template Manager

A Firefox extension for managing and inserting text templates across websites, with special optimisation for LinkedIn.

## Features

- **Quick Template Insertion**: Insert pre-defined text templates into any input field using a keyboard shortcut
- **Template Management**: Create, edit, and delete templates through a popup interface
- **Search & Filter**: Quickly find templates with real-time search
- **Keyboard Navigation**: Navigate templates using arrow keys, Tab, and Enter
- **Variable Substitution**: Placeholder support planned (not yet implemented)
- **LinkedIn Support**: Optimised for LinkedIn message composers with proper formatting

## Installation

### From Source

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the extension directory

### Permanent Installation

To install permanently, there is a release .xpi at this repo. I may eventually release this via the add on store.
Installing comes with no guarantee that the features will stop working on sites liked LinkedIn, which are 
notriously hostile to proper semantic markup. 

## Usage

### Adding Templates

1. Click the Skeletor icon in your browser toolbar
2. Click the "+ Add" button
3. Enter a template name and content
4. Click "Save"

### Inserting Templates

1. Click in any text input field (textarea, input, or contenteditable element)
2. Press `Ctrl+Alt+I` (or `Cmd+Alt+I` on Mac) n.b. this can be edited in the add on manager
3. Search for your template or use arrow keys to navigate
4. Press Enter or click to insert

### Variables

I'd like to eventually make templates support the following variables:

- `{name}` - Extracted from the current page (e.g., LinkedIn profile name)
- `{date}` - Current date
- `{time}` - Current time

### Keyboard Shortcuts

- `Ctrl+Alt+I` / `Cmd+Alt+I` - Open template selector
- `Escape` - Close template selector
- `Arrow Up/Down` - Navigate templates
- `Tab` - Cycle through templates
- `Enter` - Insert selected template

You can customise the shortcut in Firefox's extension settings (`about:addons` → Manage Extension Shortcuts).

## Technical Notes

This extension was developed through rapid AI prototyping ("vibe coding") and prioritises functionality over pristine code architecture. Expect some rough edges.

### Browser Compatibility

- **Firefox**: Full support (Manifest V2)
- **Chrome/Edge**: Not currently supported (would require Manifest V3 migration)

### Permissions

- `storage` - Store templates locally
- `activeTab` - Insert templates into the active tab
- `<all_urls>` - Work across all websites

## Structure

```
.
├── manifest.json       # Extension configuration
├── background.js       # Background script for lifecycle management
├── content.js          # Content script for template injection
├── content.css         # Neobrutalist Skeletor-themed UI styles
├── popup.html          # Popup interface structure
├── popup.js            # Popup interface logic
└── icon*.png           # Extension icons
```

## Debugging

- Check the browser console for content script logs
- Check the extension's background page console for background script logs
- Use `about:debugging` to reload the extension after making changes

## Known Limitations

- LinkedIn support may break if LinkedIn significantly changes their DOM structure
- Some contenteditable implementations may not work perfectly
- Template selector positioning is fixed centre-screen

## Licence

This is a personal project. Use at your own risk.

## Contributing

This is a personal utility extension, but feel free to fork and modify for your own needs.
