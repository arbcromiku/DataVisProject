/**
 * ComparisonBarChart - Side-by-side comparison of testing volumes vs detection rates
 * Highlights different testing strategies across Australian jurisdictions
 * Key insight: QLD ~21% positive rate (targeted), VIC ~4.5% (broad random testing)
 */
import { BaseChart } from './BaseChart.js';
import { Tooltip } from '../components/Tooltip.js';
import { formatNumber, formatPercent, getJurisdictionName, COLORS } from '../utils/formatters.js';

export class ComparisonBarChart extends BaseChart {
    constructor(options) {
        options.margin = { top: 40, right: 30, bottom: 60, left: 80 };
        super(options);
        
        // Use centralized colors from formatters.js
        this.colors = COLORS.comparison;
        
        // Current metric view
        this.currentView = options.initialView || 'comparison'; // 'comparison', 'rate', 'volume'
        
        // Positive rate estimates based on available research data
        // These are approximate rates derived from jurisdictional testing strategies
        this.positiveRates = {
            'QLD': 0.21,   // ~21% - Targeted testing (intelligence-led)
            'NSW': 0.08,   // ~8% - Mixed approach
            'VIC': 0.045,  // ~4.5% - Broad random testing
            'WA': 0.12,    // ~12% - Regional focus
            'SA': 0.15,    // ~15% - High methamphetamine prevalence
            'TAS': 0.18,   // ~18% - Smaller scale targeted
            'NT': 0.25,    // ~25% - Remote targeting
            'ACT': 0.06    // ~6% - Urban random testing
        };
        
        this.init();
    }

    /**
     * Initialize the chart
     */
    init() {
        if (!this.initSvg('Comparison of testing volumes and detection rates by jurisdiction', 400)) {
            return;
        }

        // Process data
        this.processedData = this.processData();

        // Create scales
        this.createScales();

        // Draw chart elements
        this.drawBars();
        this.drawRateLine();
        this.drawAxes();
        this.drawLegend();

        // Setup resize handler
        this.setupResize();
    }

    /**
     * Process detection data and calculate estimated test volumes
     */
    processData() {
        if (!this.data || this.data.length === 0) return [];

        // Group by jurisdiction and sum detections
        const grouped = d3.rollup(
            this.data,
            v => d3.sum(v, d => d.total || d.count || 0),
            d => d.jurisdiction
        );

        // Convert to array with calculated test volumes
        const processed = Array.from(grouped, ([jurisdiction, detections]) => {
            const rate = this.positiveRates[jurisdiction] || 0.10;
            const testsEstimated = Math.round(detections / rate);
            
            return {
                jurisdiction,
                detections,
                testsEstimated,
                positiveRate: rate,
                fullName: getJurisdictionName(jurisdiction)
            };
        });

        // Sort by detections descending
        return processed.sort((a, b) => b.detections - a.detections);
    }

    /**
     * Create scales for the chart
     */
    createScales() {
        // X scale (jurisdictions)
        this.xScale = d3.scaleBand()
            .domain(this.processedData.map(d => d.jurisdiction))
            .range([0, this.width])
            .padding(0.3);

        // X scale for grouped bars within each jurisdiction
        this.xSubScale = d3.scaleBand()
            .domain(['testsEstimated', 'detections'])
            .range([0, this.xScale.bandwidth()])
            .padding(0.05);

        // Y scale (volume)
        const maxVolume = d3.max(this.processedData, d => d.testsEstimated) || 100000;
        this.yScale = d3.scaleLinear()
            .domain([0, maxVolume * 1.1])
            .range([this.height, 0]);

        // Y scale for positive rate (right axis)
        this.yRateScale = d3.scaleLinear()
            .domain([0, 0.30]) // 0-30%
            .range([this.height, 0]);
    }

    /**
     * Draw grouped bars
     */
    drawBars() {
        const barGroups = this.chartGroup.selectAll('.bar-group')
            .data(this.processedData)
            .join('g')
            .attr('class', 'bar-group')
            .attr('transform', d => `translate(${this.xScale(d.jurisdiction)},0)`);

        // Tests conducted bars
        barGroups.append('rect')
            .attr('class', 'bar bar-tests')
            .attr('x', this.xSubScale('testsEstimated'))
            .attr('y', d => this.yScale(d.testsEstimated))
            .attr('width', this.xSubScale.bandwidth())
            .attr('height', d => this.height - this.yScale(d.testsEstimated))
            .attr('fill', this.colors.tests)
            .attr('opacity', 0.7)
            .on('mouseenter', (event, d) => this.handleMouseEnter(event, d, 'tests'))
            .on('mousemove', (event) => this.tooltip.move(event))
            .on('mouseleave', () => this.handleMouseLeave());

        // Detections bars
        barGroups.append('rect')
            .attr('class', 'bar bar-detections')
            .attr('x', this.xSubScale('detections'))
            .attr('y', d => this.yScale(d.detections))
            .attr('width', this.xSubScale.bandwidth())
            .attr('height', d => this.height - this.yScale(d.detections))
            .attr('fill', this.colors.detections)
            .attr('opacity', 0.9)
            .on('mouseenter', (event, d) => this.handleMouseEnter(event, d, 'detections'))
            .on('mousemove', (event) => this.tooltip.move(event))
            .on('mouseleave', () => this.handleMouseLeave());
    }

    /**
     * Draw positive rate line overlay
     */
    drawRateLine() {
        // Create line generator
        const line = d3.line()
            .x(d => this.xScale(d.jurisdiction) + this.xScale.bandwidth() / 2)
            .y(d => this.yRateScale(d.positiveRate))
            .curve(d3.curveMonotoneX);

        // Draw the line
        this.chartGroup.append('path')
            .datum(this.processedData)
            .attr('class', 'rate-line')
            .attr('fill', 'none')
            .attr('stroke', this.colors.rate)
            .attr('stroke-width', 3)
            .attr('d', line);

        // Add rate points
        this.chartGroup.selectAll('.rate-point')
            .data(this.processedData)
            .join('circle')
            .attr('class', 'rate-point')
            .attr('cx', d => this.xScale(d.jurisdiction) + this.xScale.bandwidth() / 2)
            .attr('cy', d => this.yRateScale(d.positiveRate))
            .attr('r', 6)
            .attr('fill', this.colors.rate)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .on('mouseenter', (event, d) => this.handleMouseEnter(event, d, 'rate'))
            .on('mousemove', (event) => this.tooltip.move(event))
            .on('mouseleave', () => this.handleMouseLeave());

        // Add rate labels with smart positioning to avoid overlaps
        const rateLabels = this.chartGroup.selectAll('.rate-label')
            .data(this.processedData)
            .join('text')
            .attr('class', 'rate-label')
            .attr('x', d => this.xScale(d.jurisdiction) + this.xScale.bandwidth() / 2)
            .attr('y', (d, i) => {
                // Alternate label positions to avoid overlap
                const baseY = this.yRateScale(d.positiveRate);
                // Place label above point, with slight alternation for adjacent similar values
                const offset = (i % 2 === 0) ? -15 : -25;
                return baseY + offset;
            })
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', this.colors.rate)
            .text(d => formatPercent(d.positiveRate * 100));
    }

    /**
     * Draw axes
     */
    drawAxes() {
        // X axis
        this.chartGroup.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale))
            .selectAll('text')
            .attr('font-size', '12px');

        // X axis label
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('x', this.width / 2)
            .attr('y', this.height + 45)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#64748B')
            .text('Jurisdiction');

        // Y axis (left - volume)
        this.chartGroup.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(this.yScale)
                .ticks(6)
                .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}K` : d))
            .selectAll('text')
            .attr('font-size', '11px');

        // Y axis label (left)
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#64748B')
            .text('Number of Tests');

        // Y axis (right - rate)
        this.chartGroup.append('g')
            .attr('class', 'y-axis-right')
            .attr('transform', `translate(${this.width},0)`)
            .call(d3.axisRight(this.yRateScale)
                .ticks(5)
                .tickFormat(d => `${(d * 100).toFixed(0)}%`))
            .selectAll('text')
            .attr('font-size', '11px')
            .attr('fill', this.colors.rate);

        // Y axis label (right)
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(90)')
            .attr('x', this.height / 2)
            .attr('y', -this.width - 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', this.colors.rate)
            .text('Positive Rate');
    }

    /**
     * Draw legend
     */
    drawLegend() {
        const legendData = [
            { label: 'Tests Conducted (est.)', color: this.colors.tests, type: 'rect' },
            { label: 'Positive Detections', color: this.colors.detections, type: 'rect' },
            { label: 'Positive Rate', color: this.colors.rate, type: 'line' }
        ];

        const legend = this.chartGroup.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width / 2 - 180}, -25)`);

        const legendItems = legend.selectAll('.legend-item')
            .data(legendData)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(${i * 140}, 0)`);

        // Add rectangles or lines
        legendItems.each(function(d) {
            const g = d3.select(this);
            if (d.type === 'rect') {
                g.append('rect')
                    .attr('width', 16)
                    .attr('height', 12)
                    .attr('fill', d.color)
                    .attr('opacity', d.color === '#0072B2' ? 0.7 : 0.9)
                    .attr('rx', 2);
            } else {
                g.append('line')
                    .attr('x1', 0)
                    .attr('x2', 16)
                    .attr('y1', 6)
                    .attr('y2', 6)
                    .attr('stroke', d.color)
                    .attr('stroke-width', 3);
                g.append('circle')
                    .attr('cx', 8)
                    .attr('cy', 6)
                    .attr('r', 4)
                    .attr('fill', d.color);
            }
        });

        // Add labels
        legendItems.append('text')
            .attr('x', 22)
            .attr('y', 10)
            .attr('font-size', '11px')
            .attr('fill', '#64748B')
            .text(d => d.label);
    }

    /**
     * Handle mouse enter on bar/point
     */
    handleMouseEnter(event, d, type) {
        // Highlight element
        d3.select(event.target)
            .transition()
            .duration(150)
            .attr('opacity', 1)
            .attr('stroke', '#1E293B')
            .attr('stroke-width', 2);

        // Build tooltip content based on type
        let title, value, details, color;

        if (type === 'tests') {
            title = d.fullName;
            value = formatNumber(d.testsEstimated);
            details = 'Estimated tests conducted';
            color = this.colors.tests;
        } else if (type === 'detections') {
            title = d.fullName;
            value = formatNumber(d.detections);
            details = 'Positive detections';
            color = this.colors.detections;
        } else {
            title = d.fullName;
            value = formatPercent(d.positiveRate * 100);
            details = this.getRateDescription(d.positiveRate);
            color = this.colors.rate;
        }

        const content = Tooltip.format({ title, value, details, color });
        this.tooltip.show(content, event);
    }

    /**
     * Get description for positive rate
     */
    getRateDescription(rate) {
        if (rate >= 0.20) {
            return 'High targeting (intelligence-led testing)';
        } else if (rate >= 0.10) {
            return 'Moderate targeting (mixed approach)';
        } else {
            return 'Broad random testing (deterrence focus)';
        }
    }

    /**
     * Handle mouse leave
     */
    handleMouseLeave() {
        // Reset bar styling
        this.chartGroup.selectAll('.bar-tests')
            .transition()
            .duration(150)
            .attr('opacity', 0.7)
            .attr('stroke', 'none');

        this.chartGroup.selectAll('.bar-detections')
            .transition()
            .duration(150)
            .attr('opacity', 0.9)
            .attr('stroke', 'none');

        this.chartGroup.selectAll('.rate-point')
            .transition()
            .duration(150)
            .attr('stroke', 'white')
            .attr('stroke-width', 2);

        this.tooltip.hide();
    }

    /**
     * Update chart with new data
     */
    update(newData) {
        this.data = newData || [];
        
        // Clear and redraw
        const containerEl = document.querySelector(this.container);
        if (containerEl) {
            containerEl.innerHTML = '';
        }
        
        this.init();
    }

    /**
     * Set view mode
     * @param {string} view - 'comparison', 'rate', or 'volume'
     */
    setView(view) {
        this.currentView = view;
        this.update(this.data);
    }
}
