/**
 * StackedBarChart - Horizontal stacked bar chart
 * Shows drug type composition by jurisdiction
 */
import { BaseChart } from './BaseChart.js';
import { formatNumber, getDrugColor, getJurisdictionName, getDrugLabel } from '../utils/formatters.js';
import { drawCategoricalLegend } from '../utils/legend.js';

export class StackedBarChart extends BaseChart {
    constructor(options) {
        // Stacked bar uses narrower margins
        options.margin = { top: 20, right: 130, bottom: 40, left: 80 };
        super(options);
        this.orientation = options.orientation || 'horizontal';
        this.sortOrder = 'value'; // 'value' or 'alpha'
        
        // D3 scales
        this.xScale = null;
        this.yScale = null;
        
        // Drug types (keys for stacking)
        this.keys = ['Amphetamine', 'Cannabis', 'Ecstasy', 'Cocaine', 'Unknown'];
        
        this.init();
    }

    /**
     * Initialize the chart
     */
    init() {
        if (!this.initSvg('Stacked bar chart showing drug type distribution by state', 300)) {
            return;
        }

        // Process and draw
        this.processData();
        this.createScales();
        this.drawAxes();
        this.drawBars();
        this.drawLegend();

        // Setup resize handler
        this.setupResize();
    }

    /**
     * Process data for stacking
     */
    processData() {
        // Ensure all keys exist in data
        this.processedData = this.data.map(d => {
            const row = { jurisdiction: d.jurisdiction };
            let total = 0;
            this.keys.forEach(key => {
                row[key] = d[key] || 0;
                total += row[key];
            });
            row.total = total;
            return row;
        });

        // Sort data
        this.sortData();
    }

    /**
     * Sort data based on current sort order
     */
    sortData() {
        if (this.sortOrder === 'value') {
            this.processedData.sort((a, b) => b.total - a.total);
        } else {
            this.processedData.sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction));
        }
    }

    /**
     * Create scales
     */
    createScales() {
        // Y scale (jurisdictions)
        this.yScale = d3.scaleBand()
            .domain(this.processedData.map(d => d.jurisdiction))
            .range([0, this.height])
            .padding(0.2);

        // X scale (values) - leave gap for legend
        const maxValue = d3.max(this.processedData, d => d.total) || 100000;
        this.xScale = d3.scaleLinear()
            .domain([0, maxValue * 1.05])
            .range([0, this.width - 30]);  // Leave 30px gap before legend

        // Color scale
        this.colorScale = d3.scaleOrdinal()
            .domain(this.keys)
            .range(this.keys.map(k => getDrugColor(k)));
    }

    /**
     * Draw axes
     */
    drawAxes() {
        // X axis
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d => d3.format('.2s')(d))
            .ticks(5);

        this.chartGroup.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(xAxis);

        // Y axis
        const yAxis = d3.axisLeft(this.yScale);

        this.chartGroup.append('g')
            .attr('class', 'axis y-axis')
            .call(yAxis);
    }

    /**
     * Draw stacked bars
     */
    drawBars() {
        if (this.processedData.length === 0) {
            this.showNoDataMessage();
            return;
        }

        // Stack generator
        const stack = d3.stack()
            .keys(this.keys)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        const series = stack(this.processedData);

        // Draw stacked bars
        const barGroups = this.chartGroup.selectAll('.bar-group')
            .data(series)
            .enter()
            .append('g')
            .attr('class', 'bar-group')
            .attr('fill', d => this.colorScale(d.key));

        const bars = barGroups.selectAll('rect')
            .data(d => d.map(item => ({ ...item, key: d.key })))
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('y', d => this.yScale(d.data.jurisdiction))
            .attr('x', d => this.xScale(d[0]))
            .attr('width', d => Math.max(0, this.xScale(d[1]) - this.xScale(d[0])))
            .attr('height', this.yScale.bandwidth())
            .attr('rx', 2);

        // Use BaseChart's attachHover for consistent tooltip behavior
        this.attachHover(bars, d => ({
            title: getJurisdictionName(d.data.jurisdiction),
            value: formatNumber(d[1] - d[0]),
            details: `${d.key} detections`,
            color: getDrugColor(d.key)
        }));
    }

    /**
     * Draw legend using shared utility
     */
    drawLegend() {
        const legendItems = this.keys.map(key => ({
            label: getDrugLabel(key),
            color: this.colorScale(key)
        }));
        
        drawCategoricalLegend(this.chartGroup, legendItems, {
            x: this.width + 10,
            y: 0,
            itemHeight: 20,
            swatchSize: 14,
            fontSize: '11px'
        });
    }

    /**
     * Update chart with new data
     */
    update(newData) {
        this.data = newData || [];
        this.chartGroup.selectAll('*').remove();
        
        this.processData();
        this.createScales();
        this.drawAxes();
        this.drawBars();
        this.drawLegend();
    }

    /**
     * Set sort order
     */
    setSort(order) {
        this.sortOrder = order;
        this.update(this.data);
    }
}
