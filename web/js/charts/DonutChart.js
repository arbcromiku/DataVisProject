/**
 * DonutChart - Shows 90% cleared vs 10% positive context
 * Displays roadside drug testing pass/fail breakdown with center label
 */
import { BaseChart } from './BaseChart.js';
import { Tooltip } from '../components/Tooltip.js';
import { formatNumber, formatPercent, COLORS } from '../utils/formatters.js';

export class DonutChart extends BaseChart {
    constructor(options) {
        // Use equal margins for centered donut
        const margin = options.margin || { top: 20, right: 20, bottom: 20, left: 20 };
        super({ ...options, margin });
        
        // Use centralized colors from formatters.js
        this.colors = COLORS.donut;
        
        // Donut configuration
        this.innerRadiusRatio = 0.6; // Creates the donut hole
        this.padAngle = 0.02;        // Gap between segments
        
        this.init();
    }

    /**
     * Initialize the chart
     */
    init() {
        if (!this.initSvg('Donut chart showing roadside drug test results: cleared vs positive', 300)) {
            return;
        }

        // For donut chart, we center the chart group
        const radius = this.getRadius();
        this.chartGroup.attr('transform', 
            `translate(${this.margin.left + this.width / 2},${this.margin.top + this.height / 2})`
        );

        // Draw chart elements
        this.drawChart();

        // Setup resize handler
        this.setupResize(300);
    }

    /**
     * Calculate radius based on available space
     * @returns {number}
     */
    getRadius() {
        return Math.min(this.width, this.height) / 2;
    }

    /**
     * Prepare data for pie layout
     * @returns {Array}
     */
    prepareData() {
        if (!this.data || !this.data.tests_conducted) {
            return [];
        }

        return [
            {
                key: 'cleared',
                label: 'Cleared',
                value: this.data.cleared || 0,
                percentage: 100 - (this.data.positive_rate || 0),
                color: this.colors.cleared
            },
            {
                key: 'positive',
                label: 'Positive',
                value: this.data.positive || 0,
                percentage: this.data.positive_rate || 0,
                color: this.colors.positive
            }
        ];
    }

    /**
     * Draw the donut chart
     */
    drawChart() {
        const pieData = this.prepareData();
        
        if (pieData.length === 0) {
            this.showNoDataMessage('No test data available');
            return;
        }

        // Remove no data message if exists
        this.chartGroup.select('.no-data-message').remove();

        const radius = this.getRadius();
        const innerRadius = radius * this.innerRadiusRatio;

        // Pie generator
        const pie = d3.pie()
            .value(d => d.value)
            .sort(null) // Keep order as provided (cleared first)
            .padAngle(this.padAngle);

        // Arc generator
        const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius);

        // Hover arc (slightly larger)
        const arcHover = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius + 8);

        // Generate arcs
        const arcs = pie(pieData);

        // Draw segments
        const segments = this.chartGroup.selectAll('.segment')
            .data(arcs, d => d.data.key);

        segments.join(
            enter => enter.append('path')
                .attr('class', 'segment')
                .attr('fill', d => d.data.color)
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .each(function(d) { this._current = d; }) // Store for interpolation
                .on('mouseenter', (event, d) => this.handleMouseEnter(event, d, arcHover))
                .on('mousemove', (event) => this.tooltip.move(event))
                .on('mouseleave', (event, d) => this.handleMouseLeave(event, d, arc))
                .transition()
                .duration(750)
                .attrTween('d', d => this.arcTween(d, arc)),
            update => update
                .on('mouseenter', (event, d) => this.handleMouseEnter(event, d, arcHover))
                .on('mouseleave', (event, d) => this.handleMouseLeave(event, d, arc))
                .transition()
                .duration(500)
                .attrTween('d', function(d) {
                    const interpolate = d3.interpolate(this._current, d);
                    this._current = d;
                    return t => arc(interpolate(t));
                }),
            exit => exit
                .transition()
                .duration(300)
                .style('opacity', 0)
                .remove()
        );

        // Draw segment labels (outside the donut)
        this.drawSegmentLabels(arcs, radius);

        // Draw center label
        this.drawCenterLabel();
    }

    /**
     * Arc tween for animated drawing
     */
    arcTween(d, arc) {
        const start = { startAngle: 0, endAngle: 0 };
        const interpolate = d3.interpolate(start, d);
        return t => arc(interpolate(t));
    }

    /**
     * Draw labels on each segment
     */
    drawSegmentLabels(arcs, radius) {
        const labelRadius = radius * 0.8; // Position labels inside the segment

        const labelArc = d3.arc()
            .innerRadius(labelRadius)
            .outerRadius(labelRadius);

        // Labels
        const labels = this.chartGroup.selectAll('.segment-label')
            .data(arcs, d => d.data.key);

        labels.join(
            enter => enter.append('text')
                .attr('class', 'segment-label')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('fill', 'white')
                .attr('font-weight', '600')
                .attr('font-size', '14px')
                .style('pointer-events', 'none')
                .style('opacity', 0)
                .attr('transform', d => `translate(${labelArc.centroid(d)})`)
                .text(d => `${d.data.percentage.toFixed(1)}%`)
                .transition()
                .delay(400)
                .duration(300)
                .style('opacity', 1),
            update => update
                .transition()
                .duration(500)
                .attr('transform', d => `translate(${labelArc.centroid(d)})`)
                .text(d => `${d.data.percentage.toFixed(1)}%`),
            exit => exit.remove()
        );
    }

    /**
     * Draw center label showing key metric
     */
    drawCenterLabel() {
        // Remove existing center label group
        this.chartGroup.selectAll('.center-label').remove();

        if (!this.data || !this.data.tests_conducted) return;

        const clearedPercent = 100 - (this.data.positive_rate || 0);
        const centerGroup = this.chartGroup.append('g')
            .attr('class', 'center-label')
            .attr('text-anchor', 'middle');

        // Main percentage
        centerGroup.append('text')
            .attr('class', 'center-value')
            .attr('y', -8)
            .attr('font-size', '28px')
            .attr('font-weight', '700')
            .attr('fill', this.colors.cleared)
            .style('opacity', 0)
            .text(`${clearedPercent.toFixed(1)}%`)
            .transition()
            .delay(600)
            .duration(400)
            .style('opacity', 1);

        // Label text
        centerGroup.append('text')
            .attr('class', 'center-text')
            .attr('y', 18)
            .attr('font-size', '14px')
            .attr('font-weight', '500')
            .attr('fill', '#666')
            .style('opacity', 0)
            .text('Cleared')
            .transition()
            .delay(700)
            .duration(400)
            .style('opacity', 1);

        // Total tests (smaller, below)
        centerGroup.append('text')
            .attr('class', 'center-total')
            .attr('y', 40)
            .attr('font-size', '11px')
            .attr('fill', '#999')
            .style('opacity', 0)
            .text(`of ${formatNumber(this.data.tests_conducted)} tests`)
            .transition()
            .delay(800)
            .duration(400)
            .style('opacity', 1);
    }

    /**
     * Handle mouse enter on segment
     */
    handleMouseEnter(event, d, arcHover) {
        // Expand segment
        d3.select(event.target)
            .transition()
            .duration(150)
            .attr('d', arcHover);

        // Show tooltip
        const content = Tooltip.format({
            title: d.data.label,
            value: formatNumber(d.data.value),
            details: `${formatPercent(d.data.percentage)} of all tests`,
            color: d.data.color
        });

        this.tooltip.show(content, event);
    }

    /**
     * Handle mouse leave
     */
    handleMouseLeave(event, d, arc) {
        // Reset segment size
        d3.select(event.target)
            .transition()
            .duration(150)
            .attr('d', arc);

        this.tooltip.hide();
    }

    /**
     * Update chart with new data
     */
    update(newData) {
        this.data = newData || {};
        this.drawChart();
    }

    /**
     * Set highlight on a specific segment
     * @param {string} key - 'cleared' or 'positive'
     */
    highlight(key) {
        const radius = this.getRadius();
        const innerRadius = radius * this.innerRadiusRatio;

        const arcHover = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius + 8);

        const arcNormal = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius);

        this.chartGroup.selectAll('.segment')
            .transition()
            .duration(200)
            .attr('d', d => d.data.key === key ? arcHover(d) : arcNormal(d))
            .style('opacity', d => d.data.key === key ? 1 : 0.7);
    }

    /**
     * Clear any highlights
     */
    clearHighlight() {
        const radius = this.getRadius();
        const innerRadius = radius * this.innerRadiusRatio;

        const arcNormal = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius);

        this.chartGroup.selectAll('.segment')
            .transition()
            .duration(200)
            .attr('d', arcNormal)
            .style('opacity', 1);
    }
}
