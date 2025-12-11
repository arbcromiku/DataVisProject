/**
 * Tooltip - Shared tooltip component for all charts
 */
export class Tooltip {
    constructor(selector) {
        this.element = document.querySelector(selector);
        this.visible = false;
        
        if (!this.element) {
            console.warn('Tooltip element not found:', selector);
        }
    }

    /**
     * Show tooltip with content at position
     * @param {string} content - HTML content
     * @param {MouseEvent} event - Mouse event for positioning
     */
    show(content, event) {
        if (!this.element) return;

        this.element.innerHTML = content;
        this.element.classList.add('visible');
        this.element.setAttribute('aria-hidden', 'false');
        this.visible = true;

        this.position(event);
    }

    /**
     * Position tooltip near mouse
     * @param {MouseEvent} event
     */
    position(event) {
        if (!this.element) return;

        const padding = 12;
        const rect = this.element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = event.clientX + padding;
        let y = event.clientY + padding;

        // Prevent overflow right
        if (x + rect.width > viewportWidth - padding) {
            x = event.clientX - rect.width - padding;
        }

        // Prevent overflow bottom
        if (y + rect.height > viewportHeight - padding) {
            y = event.clientY - rect.height - padding;
        }

        // Prevent overflow left/top
        x = Math.max(padding, x);
        y = Math.max(padding, y);

        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
    }

    /**
     * Hide tooltip
     */
    hide() {
        if (!this.element) return;

        this.element.classList.remove('visible');
        this.element.setAttribute('aria-hidden', 'true');
        this.visible = false;
    }

    /**
     * Move tooltip with mouse
     * @param {MouseEvent} event
     */
    move(event) {
        if (this.visible) {
            this.position(event);
        }
    }

    /**
     * Create formatted tooltip content
     */
    static format({ title, value, details, color }) {
        let html = '';
        
        if (title) {
            html += `<div class="tooltip-title">${title}</div>`;
        }
        
        if (value !== undefined) {
            const colorStyle = color ? `color: ${color}` : '';
            html += `<div class="tooltip-value" style="${colorStyle}">${value}</div>`;
        }
        
        if (details) {
            html += `<div class="tooltip-detail">${details}</div>`;
        }
        
        return html;
    }
}
