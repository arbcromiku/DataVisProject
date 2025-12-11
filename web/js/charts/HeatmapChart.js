/**
 * HeatmapChart - Matrix visualization
 * Shows drug detections by jurisdiction and drug type
 * Redesigned for clarity: "Which drugs dominate in each state?"
 */
import { BaseChart } from './BaseChart.js';
import { Tooltip } from '../components/Tooltip.js';
import { formatNumber, getDrugColor, getJurisdictionName, getDrugLabel } from '../utils/formatters.js';

export class HeatmapChart extends BaseChart {
    constructor(options) {
        // Heatmap uses larger margins for labels, row totals, and legend
        options.margin = { top: 80, right: 160, bottom: 30, left: 100 };
        super(options);
        this.colorScale = null;
        this.init();
    }

    /**
     * Initialize the chart
     */
    init() {
        if (!this.initSvg('Heatmap showing drug detections by state and drug type', 350)) {
            return;
        }

        // Draw chart
        this.drawChart();

        // Setup resize handler
        this.setupResize();
    }

    /**
     * Draw the heatmap
     */
    drawChart() {
        if (this.data.length === 0) {
            this.showNoDataMessage();
            return;
        }

        // Filter out "Unknown" and "Screening Only" - not useful for drug comparison
        const filteredData = this.data.filter(d => 
            d.drug_type !== 'Unknown' && 
            d.drug_type !== 'Screening Only' &&
            d.value > 0
        );

        // Get jurisdictions that have at least one known drug type
        const jurisdictionsWithData = [...new Set(filteredData.map(d => d.jurisdiction))];
        
        // If no data after filtering, show message
        if (jurisdictionsWithData.length === 0) {
            this.showNoDataMessage('No drug breakdown data available');
            return;
        }

        // Add title/insight question
        this.chartGroup.append('text')
            .attr('class', 'chart-question')
            .attr('x', this.width / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', '600')
            .attr('fill', '#E8EAED')
            .text('Which drugs dominate in each state?');

        this.chartGroup.append('text')
            .attr('class', 'chart-hint')
            .attr('x', this.width / 2)
            .attr('y', -28)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#94A3B8')
            .text('Darker blue = more detections (excludes QLD, TAS, NT - no breakdown available)');

        // Define consistent drug type order (most common first)
        const drugTypeOrder = ['Amphetamine', 'Cannabis', 'Ecstasy', 'Cocaine'];
        
        // Get unique jurisdictions sorted by total detections (highest first)
        const jurisdictionTotals = d3.rollup(filteredData, v => d3.sum(v, d => d.value), d => d.jurisdiction);
        const jurisdictions = jurisdictionsWithData
            .sort((a, b) => (jurisdictionTotals.get(b) || 0) - (jurisdictionTotals.get(a) || 0));
        
        // Filter drug types to only those in data, maintaining order
        const drugTypes = drugTypeOrder.filter(dt => filteredData.some(d => d.drug_type === dt));

        // Create scales
        const xScale = d3.scaleBand()
            .domain(drugTypes)
            .range([0, this.width])
            .padding(0.08);

        const yScale = d3.scaleBand()
            .domain(jurisdictions)
            .range([0, this.height])
            .padding(0.08);

        // Color scale - use blue sequential for dark mode consistency
        const maxValue = d3.max(filteredData, d => d.value) || 100000;
        this.colorScale = d3.scaleSequential()
            .domain([0, maxValue])
            .interpolator(d3.interpolateBlues);

        // Draw X axis (drug types)
        this.chartGroup.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0, -8)`)
            .selectAll('text')
            .data(drugTypes)
            .enter()
            .append('text')
            .attr('x', d => xScale(d) + xScale.bandwidth() / 2)
            .attr('y', 0)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#E8EAED')
            .text(d => getDrugLabel(d));

        // Draw Y axis (jurisdictions)
        this.chartGroup.append('g')
            .attr('class', 'axis y-axis')
            .selectAll('text')
            .data(jurisdictions)
            .enter()
            .append('text')
            .attr('x', -10)
            .attr('y', d => yScale(d) + yScale.bandwidth() / 2)
            .attr('text-anchor', 'end')
            .attr('dy', '0.35em')
            .attr('font-size', '11px')
            .attr('fill', '#94A3B8')
            .text(d => d);

        // Calculate percentages for each row (what % of state's detections is each drug)
        const rowPercentages = new Map();
        jurisdictions.forEach(j => {
            const total = jurisdictionTotals.get(j) || 1;
            const percs = new Map();
            filteredData.filter(d => d.jurisdiction === j).forEach(d => {
                percs.set(d.drug_type, (d.value / total) * 100);
            });
            rowPercentages.set(j, percs);
        });

        // Draw cells with dark mode borders
        this.chartGroup.selectAll('.heatmap-cell')
            .data(filteredData)
            .enter()
            .append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', d => xScale(d.drug_type))
            .attr('y', d => yScale(d.jurisdiction))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('rx', 4)
            .attr('fill', d => d.value > 0 ? this.colorScale(d.value) : '#2D3748')
            .attr('stroke', '#1A1F26')
            .attr('stroke-width', 2)
            .on('mouseenter', (event, d) => this.handleMouseEnter(event, d, rowPercentages))
            .on('mousemove', (event) => this.tooltip.move(event))
            .on('mouseleave', () => this.handleMouseLeave());

        // Add cell value labels - show percentage instead of raw number
        this.chartGroup.selectAll('.cell-label')
            .data(filteredData.filter(d => d.value > 0))
            .enter()
            .append('text')
            .attr('class', 'cell-label')
            .attr('x', d => xScale(d.drug_type) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.jurisdiction) + yScale.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .attr('fill', d => d.value > maxValue * 0.5 ? 'white' : '#1A202C')
            .attr('pointer-events', 'none')
            .text(d => {
                const perc = rowPercentages.get(d.jurisdiction)?.get(d.drug_type) || 0;
                return perc >= 1 ? Math.round(perc) + '%' : '<1%';
            });

        // Add row totals on the right side
        const rowTotals = jurisdictions.map(j => ({
            jurisdiction: j,
            total: jurisdictionTotals.get(j) || 0
        }));

        this.chartGroup.selectAll('.row-total')
            .data(rowTotals)
            .enter()
            .append('text')
            .attr('class', 'row-total')
            .attr('x', this.width + 8)
            .attr('y', d => yScale(d.jurisdiction) + yScale.bandwidth() / 2)
            .attr('text-anchor', 'start')
            .attr('dy', '0.35em')
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .attr('fill', '#94A3B8')
            .text(d => d3.format('.2s')(d.total));

        // Draw legend
        this.drawLegend(maxValue);
    }

    /**
     * Draw color legend
     */
    drawLegend(maxValue) {
        const legendWidth = 20;
        const legendHeight = this.height;
        const legendX = this.width + 55;

        const legendGroup = this.chartGroup.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${legendX}, 0)`);

        // Gradient for legend (use unique ID)
        const gradientId = 'heatmapGradient-' + Math.random().toString(36).substr(2, 9);
        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%')
            .attr('y1', '100%')
            .attr('x2', '0%')
            .attr('y2', '0%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', this.colorScale(0));

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', this.colorScale(maxValue));

        // Legend rectangle
        legendGroup.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('fill', `url(#${gradientId})`)
            .attr('rx', 4);

        // Legend scale
        const legendScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([legendHeight, 0]);

        const legendAxis = d3.axisRight(legendScale)
            .ticks(5)
            .tickFormat(d => d3.format('.2s')(d));

        legendGroup.append('g')
            .attr('class', 'legend-axis')
            .attr('transform', `translate(${legendWidth}, 0)`)
            .call(legendAxis)
            .selectAll('text')
            .attr('font-size', '10px')
            .attr('fill', '#94A3B8');

        // Style legend axis
        legendGroup.select('.legend-axis')
            .selectAll('line, path')
            .attr('stroke', '#3B4754');
    }

    /**
     * Handle mouse enter
     */
    handleMouseEnter(event, d, rowPercentages) {
        d3.select(event.target)
            .transition()
            .duration(150)
            .attr('stroke', '#3B82F6')
            .attr('stroke-width', 3);

        const perc = rowPercentages.get(d.jurisdiction)?.get(d.drug_type) || 0;

        const content = Tooltip.format({
            title: `${getJurisdictionName(d.jurisdiction)}`,
            value: `${getDrugLabel(d.drug_type)}: ${formatNumber(d.value)}`,
            details: `${perc.toFixed(1)}% of state's detections`,
            color: '#3B82F6'
        });

        this.tooltip.show(content, event);
    }

    /**
     * Handle mouse leave
     */
    handleMouseLeave() {
        this.chartGroup.selectAll('.heatmap-cell')
            .transition()
            .duration(150)
            .attr('stroke', '#1A1F26')
            .attr('stroke-width', 2);

        this.tooltip.hide();
    }

    /**
     * Update chart with new data
     */
    update(newData) {
        this.data = newData || [];
        this.chartGroup.selectAll('*').remove();
        this.drawChart();
    }
}
