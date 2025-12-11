/**
 * TrendChart - Line/Area chart showing temporal trends
 * Supports view switching between area and line modes
 * Includes annotations for key events
 */
import { BaseChart } from './BaseChart.js';
import { Tooltip } from '../components/Tooltip.js';
import { formatNumber, formatCompact, COLORS } from '../utils/formatters.js';

export class TrendChart extends BaseChart {
    constructor(options) {
        super(options);
        this.annotations = options.annotations || [];
        this.view = 'area'; // 'area' or 'line'
        
        // D3 scales
        this.xScale = null;
        this.yScale = null;
        
        // Use centralized colors from formatters.js
        this.colors = {
            line: COLORS.trend.line,
            area: 'url(#areaGradient)',
            dot: COLORS.trend.dot,
            annotation: COLORS.trend.annotation
        };
        
        this.init();
    }

    /**
     * Initialize the chart
     */
    init() {
        if (!this.initSvg('Line chart showing drug detection trends over time', 350)) {
            return;
        }

        // Add gradient definition
        this.addGradient();

        // Create scales
        this.createScales();

        // Draw chart elements
        this.drawAxes();
        this.drawGridLines();
        this.drawChart();
        this.drawAnnotations();

        // Setup resize handler (with 300ms debounce for smooth resizing)
        this.setupResize(300);
    }

    /**
     * Add gradient definition for area fill
     */
    addGradient() {
        const defs = this.svg.append('defs');
        
        const gradient = defs.append('linearGradient')
            .attr('id', 'areaGradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', COLORS.trend.line)
            .attr('stop-opacity', 0.4);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', COLORS.trend.line)
            .attr('stop-opacity', 0.05);
    }

    /**
     * Create scales
     */
    createScales() {
        // X scale (time/year)
        const years = this.data.map(d => d.year);
        this.xScale = d3.scaleLinear()
            .domain([d3.min(years) || 2008, d3.max(years) || 2024])
            .range([0, this.width]);

        // Y scale (count)
        const maxValue = d3.max(this.data, d => d.total) || 100000;
        this.yScale = d3.scaleLinear()
            .domain([0, maxValue * 1.1]) // 10% padding
            .range([this.height, 0])
            .nice();
    }

    /**
     * Draw axes
     */
    drawAxes() {
        // X axis
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d => d.toString())
            .ticks(Math.min(this.data.length, 10));

        this.chartGroup.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(xAxis);

        // X axis label
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('x', this.width / 2)
            .attr('y', this.height + 40)
            .attr('text-anchor', 'middle')
            .text('Year');

        // Y axis
        const yAxis = d3.axisLeft(this.yScale)
            .tickFormat(d => formatCompact(d))
            .ticks(6);

        this.chartGroup.append('g')
            .attr('class', 'axis y-axis')
            .call(yAxis);

        // Y axis label
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -50)
            .attr('text-anchor', 'middle')
            .text('Positive Tests');
    }

    /**
     * Draw grid lines
     */
    drawGridLines() {
        // Horizontal grid lines
        const yGridlines = d3.axisLeft(this.yScale)
            .tickSize(-this.width)
            .tickFormat('')
            .ticks(6);

        this.chartGroup.append('g')
            .attr('class', 'grid')
            .call(yGridlines);
    }

    /**
     * Draw the main chart (area or line based on view)
     */
    drawChart() {
        if (this.data.length === 0) {
            this.chartGroup.selectAll('.area, .line, .dot, .value-label').remove();
            this.showNoDataMessage('No data available for selected filters');
            return;
        }
        
        // Remove no data message if exists
        this.chartGroup.select('.no-data-message').remove();

        // Sort data by year
        const sortedData = [...this.data].sort((a, b) => a.year - b.year);

        // Area generator
        const area = d3.area()
            .x(d => this.xScale(d.year))
            .y0(this.height)
            .y1(d => this.yScale(d.total))
            .curve(d3.curveMonotoneX);

        // Line generator
        const line = d3.line()
            .x(d => this.xScale(d.year))
            .y(d => this.yScale(d.total))
            .curve(d3.curveMonotoneX);

        // Draw area
        this.areaPath = this.chartGroup.selectAll('.area')
            .data([sortedData])
            .join('path')
            .attr('class', 'area')
            .attr('fill', this.colors.area)
            .attr('opacity', this.view === 'area' ? 1 : 0)
            .transition().duration(500)
            .attr('d', area);

        // Draw line
        this.linePath = this.chartGroup.selectAll('.line')
            .data([sortedData])
            .join('path')
            .attr('class', 'line')
            .attr('fill', 'none')
            .attr('stroke', this.colors.line)
            .attr('stroke-width', 2.5)
            .transition().duration(500)
            .attr('d', line);

        // Draw dots
        this.dots = this.chartGroup.selectAll('.dot')
            .data(sortedData)
            .join(
                enter => enter.append('circle')
                    .attr('class', 'dot')
                    .attr('r', 0)
                    .attr('cx', d => this.xScale(d.year))
                    .attr('cy', d => this.yScale(d.total)),
                update => update,
                exit => exit.transition().duration(300).attr('r', 0).remove()
            );
            
        this.dots.attr('fill', this.colors.dot)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .on('mouseenter', (event, d) => this.handleMouseEnter(event, d))
            .on('mousemove', (event) => this.tooltip.move(event))
            .on('mouseleave', () => this.handleMouseLeave())
            .transition().duration(500)
            .attr('cx', d => this.xScale(d.year))
            .attr('cy', d => this.yScale(d.total))
            .attr('r', 5);

        // Add value labels for key points
        this.addValueLabels(sortedData);
    }

    /**
     * Add value labels at start, end, and max points
     */
    addValueLabels(data) {
        if (data.length < 2) {
            this.chartGroup.selectAll('.value-label').remove();
            return;
        }

        const keyPoints = [
            data[0], // First
            data[data.length - 1], // Last
            data.reduce((max, d) => d.total > max.total ? d : max) // Max
        ];

        // Remove duplicates
        const uniquePoints = [...new Map(keyPoints.map(p => [p.year, p])).values()];

        this.chartGroup.selectAll('.value-label')
            .data(uniquePoints)
            .join('text')
            .attr('class', 'value-label')
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', this.colors.line)
            .text(d => formatCompact(d.total))
            .transition().duration(500)
            .attr('x', d => this.xScale(d.year))
            .attr('y', d => this.yScale(d.total) - 12);
    }

    /**
     * Draw annotations
     */
    drawAnnotations() {
        if (!this.annotations || this.annotations.length === 0) return;
        
        // Remove existing annotations to redraw (simpler for annotations as they don't change often)
        this.chartGroup.selectAll('.annotations').remove();

        const annotationGroup = this.chartGroup.append('g')
            .attr('class', 'annotations');

        this.annotations.forEach(annotation => {
            const x = this.xScale(annotation.year);
            const dataPoint = this.data.find(d => d.year === annotation.year);
            if (!dataPoint) return;

            const y = this.yScale(dataPoint.total);

            // Vertical line
            annotationGroup.append('line')
                .attr('class', 'annotation-line')
                .attr('x1', x)
                .attr('y1', 0)
                .attr('x2', x)
                .attr('y2', this.height);

            // Circle highlight
            annotationGroup.append('circle')
                .attr('class', 'annotation-circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 12);

            // Label
            annotationGroup.append('text')
                .attr('class', 'annotation-text')
                .attr('x', x)
                .attr('y', -8)
                .attr('text-anchor', 'middle')
                .attr('font-weight', '500')
                .text(annotation.label);
        });
    }

    /**
     * Handle mouse enter on data point
     */
    handleMouseEnter(event, d) {
        // Highlight the dot
        d3.select(event.target)
            .transition()
            .duration(150)
            .attr('r', 8);

        // Show tooltip
        const content = Tooltip.format({
            title: `Year ${d.year}`,
            value: formatNumber(d.total),
            details: 'Positive drug tests',
            color: this.colors.line
        });

        this.tooltip.show(content, event);
    }

    /**
     * Handle mouse leave
     */
    handleMouseLeave() {
        // Reset dot size
        this.chartGroup.selectAll('.dot')
            .transition()
            .duration(150)
            .attr('r', 5);

        this.tooltip.hide();
    }

    /**
     * Update chart with new data
     */
    update(newData) {
        this.data = newData || [];
        
        // Update scales
        this.createScales();
        
        // Update axes
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d => d.toString())
            .ticks(Math.min(this.data.length, 10));
        
        const yAxis = d3.axisLeft(this.yScale)
            .tickFormat(d => formatCompact(d))
            .ticks(6);

        this.chartGroup.select('.x-axis')
            .transition()
            .duration(500)
            .call(xAxis);

        this.chartGroup.select('.y-axis')
            .transition()
            .duration(500)
            .call(yAxis);

        // Update grid
        const yGridlines = d3.axisLeft(this.yScale)
            .tickSize(-this.width)
            .tickFormat('')
            .ticks(6);

        this.chartGroup.select('.grid')
            .transition()
            .duration(500)
            .call(yGridlines);

        // Redraw chart elements (using joins)
        this.drawChart();
        this.drawAnnotations();
    }

    /**
     * Set chart view (area or line)
     */
    setView(view) {
        this.view = view;
        
        if (this.chartGroup) {
            this.chartGroup.selectAll('.area')
                .transition()
                .duration(300)
                .attr('opacity', view === 'area' ? 1 : 0);
        }
    }
}
