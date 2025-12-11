/**
 * Legend utility functions for D3 charts
 * Provides reusable legend components to reduce code duplication
 */

/**
 * Draw a categorical legend with colored swatches
 * @param {d3.Selection} container - Parent container (typically chartGroup)
 * @param {Array<{label: string, color: string}>} items - Legend items
 * @param {Object} options - Configuration options
 * @param {number} [options.x=0] - X position relative to container
 * @param {number} [options.y=0] - Y position relative to container
 * @param {number} [options.itemHeight=20] - Height of each legend item
 * @param {number} [options.swatchSize=12] - Size of color swatch
 * @param {number} [options.gap=8] - Gap between swatch and label
 * @param {string} [options.fontSize='0.75rem'] - Font size for labels
 * @returns {d3.Selection} The legend group for further customization
 */
export function drawCategoricalLegend(container, items, options = {}) {
    const {
        x = 0,
        y = 0,
        itemHeight = 20,
        swatchSize = 12,
        gap = 8,
        fontSize = '0.75rem'
    } = options;

    // Create legend group
    const legend = container.append('g')
        .attr('class', 'legend categorical-legend')
        .attr('transform', `translate(${x}, ${y})`);

    // Add legend items
    const legendItems = legend.selectAll('.legend-item')
        .data(items)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * itemHeight})`);

    // Color swatches
    legendItems.append('rect')
        .attr('width', swatchSize)
        .attr('height', swatchSize)
        .attr('rx', 2)
        .attr('fill', d => d.color);

    // Labels
    legendItems.append('text')
        .attr('x', swatchSize + gap)
        .attr('y', swatchSize / 2)
        .attr('dy', '0.35em')
        .style('font-size', fontSize)
        .style('fill', 'var(--color-text, #1A202C)')
        .text(d => d.label);

    return legend;
}

/**
 * Draw a gradient legend with continuous scale
 * @param {d3.Selection} container - Parent container (typically chartGroup)
 * @param {d3.Scale} colorScale - D3 sequential or linear color scale
 * @param {Object} options - Configuration options
 * @param {number} [options.x=0] - X position relative to container
 * @param {number} [options.y=0] - Y position relative to container
 * @param {number} [options.width=20] - Width of gradient bar
 * @param {number} [options.height=150] - Height of gradient bar
 * @param {string} [options.title=''] - Title above the legend
 * @param {string} [options.id] - Unique ID for gradient (auto-generated if not provided)
 * @param {d3.Selection} [options.svg] - SVG element for defs (auto-detected if not provided)
 * @returns {d3.Selection} The legend group for further customization
 */
export function drawGradientLegend(container, colorScale, options = {}) {
    const {
        x = 0,
        y = 0,
        width = 20,
        height = 150,
        title = '',
        id = `gradient-legend-${Math.random().toString(36).substr(2, 9)}`
    } = options;

    // Get the root SVG element for defs
    const svg = options.svg || d3.select(container.node().ownerSVGElement);

    // Create or get defs element
    let defs = svg.select('defs');
    if (defs.empty()) {
        defs = svg.insert('defs', ':first-child');
    }

    // Create gradient definition
    const gradient = defs.append('linearGradient')
        .attr('id', id)
        .attr('x1', '0%')
        .attr('y1', '100%')
        .attr('x2', '0%')
        .attr('y2', '0%');

    // Add gradient stops (sample 10 points from the color scale)
    const domain = colorScale.domain();
    const [minVal, maxVal] = [Math.min(...domain), Math.max(...domain)];

    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const value = minVal + t * (maxVal - minVal);
        gradient.append('stop')
            .attr('offset', `${t * 100}%`)
            .attr('stop-color', colorScale(value));
    }

    // Create legend group
    const legend = container.append('g')
        .attr('class', 'legend gradient-legend')
        .attr('transform', `translate(${x}, ${y})`);

    // Add title if provided
    if (title) {
        legend.append('text')
            .attr('class', 'legend-title')
            .attr('y', -10)
            .style('font-size', '0.7rem')
            .style('fill', 'var(--color-text-muted, #64748B)')
            .text(title);
    }

    // Draw gradient rectangle
    legend.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', `url(#${id})`)
        .attr('rx', 2);

    // Create axis scale
    const axisScale = d3.scaleLinear()
        .domain([minVal, maxVal])
        .range([height, 0]);

    // Add axis
    const axis = d3.axisRight(axisScale)
        .ticks(5)
        .tickFormat(d3.format('.2s'));

    legend.append('g')
        .attr('class', 'legend-axis')
        .attr('transform', `translate(${width}, 0)`)
        .call(axis)
        .selectAll('text')
        .style('font-size', '0.65rem');

    return legend;
}

/**
 * Draw a mixed legend with different symbol types (rect, line, circle)
 * Useful for charts with multiple data types (e.g., bars + trend lines)
 * @param {d3.Selection} container - Parent container
 * @param {Array<{label: string, color: string, type: 'rect'|'line'|'circle'}>} items
 * @param {Object} options - Configuration options
 * @param {number} [options.x=0] - X position
 * @param {number} [options.y=0] - Y position
 * @param {number} [options.itemWidth=120] - Width per item (horizontal layout)
 * @param {number} [options.symbolSize=14] - Size of symbol
 * @param {number} [options.gap=8] - Gap between symbol and label
 * @param {string} [options.orientation='horizontal'] - 'horizontal' or 'vertical'
 * @returns {d3.Selection} The legend group
 */
export function drawMixedLegend(container, items, options = {}) {
    const {
        x = 0,
        y = 0,
        itemWidth = 120,
        itemHeight = 20,
        symbolSize = 14,
        gap = 8,
        fontSize = '0.75rem',
        orientation = 'horizontal'
    } = options;

    const legend = container.append('g')
        .attr('class', 'legend mixed-legend')
        .attr('transform', `translate(${x}, ${y})`);

    const legendItems = legend.selectAll('.legend-item')
        .data(items)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => {
            if (orientation === 'horizontal') {
                return `translate(${i * itemWidth}, 0)`;
            }
            return `translate(0, ${i * itemHeight})`;
        });

    // Add symbols based on type
    legendItems.each(function(d) {
        const item = d3.select(this);
        
        switch (d.type) {
            case 'line':
                item.append('line')
                    .attr('x1', 0)
                    .attr('y1', symbolSize / 2)
                    .attr('x2', symbolSize)
                    .attr('y2', symbolSize / 2)
                    .attr('stroke', d.color)
                    .attr('stroke-width', 3)
                    .attr('stroke-linecap', 'round');
                break;
            
            case 'circle':
                item.append('circle')
                    .attr('cx', symbolSize / 2)
                    .attr('cy', symbolSize / 2)
                    .attr('r', symbolSize / 3)
                    .attr('fill', d.color);
                break;
            
            case 'rect':
            default:
                item.append('rect')
                    .attr('width', symbolSize)
                    .attr('height', symbolSize)
                    .attr('rx', 2)
                    .attr('fill', d.color);
                break;
        }
    });

    // Add labels
    legendItems.append('text')
        .attr('x', symbolSize + gap)
        .attr('y', symbolSize / 2)
        .attr('dy', '0.35em')
        .style('font-size', fontSize)
        .style('fill', 'var(--color-text, #1A202C)')
        .text(d => d.label);

    return legend;
}
