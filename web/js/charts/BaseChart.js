import { Tooltip } from '../components/Tooltip.js';

/**
 * Base class for all D3 charts providing common initialization and resize handling.
 * Extracts duplicated boilerplate from chart classes to ensure DRY compliance.
 */
export class BaseChart {
    /**
     * @param {Object} options - Chart configuration
     * @param {string} options.container - CSS selector for container element
     * @param {Object} options.tooltip - Tooltip instance for hover interactions
     * @param {Array} [options.data] - Initial data array
     * @param {Object} [options.margin] - Chart margins {top, right, bottom, left}
     */
    constructor(options) {
        this.container = options.container;
        this.tooltip = options.tooltip;
        this.data = options.data || [];
        this.margin = options.margin || { top: 30, right: 30, bottom: 50, left: 70 };
        this.width = 0;
        this.height = 0;
        this.svg = null;
        this.chartGroup = null;
    }

    /**
     * Initialize SVG container and chart group.
     * @param {string} ariaLabel - Accessibility label for the chart
     * @param {number} [minHeight=300] - Minimum chart height in pixels
     * @returns {boolean} True if initialization successful, false otherwise
     */
    initSvg(ariaLabel, minHeight = 300) {
        const containerEl = document.querySelector(this.container);
        if (!containerEl) {
            console.error(`${this.constructor.name}: Container not found`, this.container);
            return false;
        }
        containerEl.innerHTML = '';
        
        const rect = containerEl.getBoundingClientRect();
        this.width = rect.width - this.margin.left - this.margin.right;
        this.height = Math.max(minHeight, rect.height) - this.margin.top - this.margin.bottom;

        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', rect.width)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .attr('role', 'img')
            .attr('aria-label', ariaLabel);

        this.chartGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        return true;
    }

    /**
     * Display "no data available" message centered in chart area.
     * @param {string} [message='No data available'] - Message to display
     */
    showNoDataMessage(message = 'No data available') {
        this.chartGroup.append('text')
            .attr('class', 'no-data-message')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2)
            .attr('text-anchor', 'middle')
            .text(message);
    }

    /**
     * Setup resize observer to re-render chart on container size changes.
     * Uses threshold of 5px to avoid unnecessary re-renders.
     * @param {number} [debounceMs=0] - Debounce delay in milliseconds (0 = no debounce)
     */
    setupResize(debounceMs = 0) {
        let lastWidth = 0;
        let lastHeight = 0;
        let timeoutId = null;
        
        const handleResize = () => {
            const containerEl = document.querySelector(this.container);
            if (!containerEl) return;
            
            const rect = containerEl.getBoundingClientRect();
            const newWidth = Math.floor(rect.width);
            const newHeight = Math.floor(rect.height);
            
            if (Math.abs(newWidth - lastWidth) > 5 || Math.abs(newHeight - lastHeight) > 5) {
                lastWidth = newWidth;
                lastHeight = newHeight;
                this.init();
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            if (debounceMs > 0) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(handleResize, debounceMs);
            } else {
                handleResize();
            }
        });

        const containerEl = document.querySelector(this.container);
        if (containerEl) {
            const rect = containerEl.getBoundingClientRect();
            lastWidth = Math.floor(rect.width);
            lastHeight = Math.floor(rect.height);
            resizeObserver.observe(containerEl);
        }
    }

    /**
     * Update chart with new data.
     * @param {Array} data - New data array
     */
    update(data) {
        this.data = data;
        this.init();
    }

    /**
     * Attach hover interactions (tooltip + visual feedback) to a D3 selection.
     * Eliminates repetitive hover code across chart classes.
     * @param {d3.Selection} selection - D3 selection to attach hover events to
     * @param {Function} formatFn - Function (d, event) => {title, value, details?, color?} for tooltip content
     * @param {Object} [options={}] - Optional configuration
     * @param {number} [options.hoverOpacity=0.8] - Opacity on hover (set to null to skip opacity change)
     * @param {string} [options.hoverClass='hovered'] - CSS class to add on hover
     * @returns {d3.Selection} The selection for continued chaining
     */
    attachHover(selection, formatFn, options = {}) {
        const { hoverOpacity = 0.8, hoverClass = 'hovered' } = options;
        
        selection
            .on('mouseenter.attachHover', (event, d) => {
                const el = d3.select(event.currentTarget);
                if (hoverClass) el.classed(hoverClass, true);
                if (hoverOpacity !== null) el.attr('opacity', hoverOpacity);
                
                try {
                    const tooltipContent = formatFn ? formatFn(d, event) : null;
                    if (tooltipContent) {
                        this.tooltip.show(Tooltip.format(tooltipContent), event);
                    }
                } catch (e) {
                    console.warn('Tooltip format error:', e);
                }
            })
            .on('mousemove.attachHover', (event) => {
                this.tooltip.move(event);
            })
            .on('mouseleave.attachHover', (event) => {
                const el = d3.select(event.currentTarget);
                if (hoverClass) el.classed(hoverClass, false);
                if (hoverOpacity !== null) el.attr('opacity', 1);
                this.tooltip.hide();
            });
        
        return selection;
    }
}
