/**
 * SlopeChart - Classic slope graph for year-over-year comparison
 * Designed for comparing two time periods (2023 vs 2024)
 * Left axis: start year values, Right axis: end year values
 */
import { BaseChart } from './BaseChart.js';
import { Tooltip } from '../components/Tooltip.js';
import { formatNumber, formatCompact, getDrugColor, getDrugLabel } from '../utils/formatters.js';

export class SlopeChart extends BaseChart {
    constructor(options) {
        // Wider margins for labels on both sides
        options.margin = { top: 50, right: 160, bottom: 30, left: 160 };
        super(options);
        this.init();
    }

    /**
     * Initialize the chart
     */
    init() {
        if (!this.initSvg('Slope chart comparing drug detections between 2023 and 2024', 350)) {
            return;
        }

        this.drawChart();
        this.setupResize();
    }

    /**
     * Draw the slope chart
     */
    drawChart() {
        if (this.data.length === 0) {
            this.showNoDataMessage();
            return;
        }

        // Sort data by 2024 value (highest at top = lowest y position)
        const sortedData = [...this.data].sort((a, b) => b.endValue - a.endValue);

        // Get years (should be 2023 and 2024)
        const startYear = sortedData[0]?.startYear || 2023;
        const endYear = sortedData[0]?.endYear || 2024;

        // Calculate max value for scale
        const maxValue = d3.max(sortedData, d => Math.max(d.startValue, d.endValue)) || 100000;
        const minValue = d3.min(sortedData, d => Math.min(d.startValue, d.endValue)) || 0;
        
        // Add padding to scale
        const padding = (maxValue - minValue) * 0.15;
        
        // Y scale - inverted so highest values at top
        const yScale = d3.scaleLinear()
            .domain([minValue - padding, maxValue + padding])
            .range([this.height, 0]);

        // X positions for the two columns
        const xLeft = 0;
        const xRight = this.width;

        // Draw year labels at top
        this.chartGroup.append('text')
            .attr('x', xLeft)
            .attr('y', -25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', '700')
            .attr('fill', '#1E293B')
            .text(startYear);

        this.chartGroup.append('text')
            .attr('x', xRight)
            .attr('y', -25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', '700')
            .attr('fill', '#1E293B')
            .text(endYear);

        // Draw vertical reference lines
        this.chartGroup.append('line')
            .attr('x1', xLeft)
            .attr('y1', 0)
            .attr('x2', xLeft)
            .attr('y2', this.height)
            .attr('stroke', '#E2E8F0')
            .attr('stroke-width', 2);

        this.chartGroup.append('line')
            .attr('x1', xRight)
            .attr('y1', 0)
            .attr('x2', xRight)
            .attr('y2', this.height)
            .attr('stroke', '#E2E8F0')
            .attr('stroke-width', 2);

        // Track label positions to avoid overlaps
        const leftPositions = [];
        const rightPositions = [];
        const minLabelSpacing = 28;

        // Draw slopes for each drug type
        sortedData.forEach((drugData, index) => {
            const color = getDrugColor(drugData.drug_type);
            const yStart = yScale(drugData.startValue);
            const yEnd = yScale(drugData.endValue);

            // Calculate percentage change
            const change = drugData.endValue - drugData.startValue;
            const changePercent = drugData.startValue > 0
                ? ((change / drugData.startValue) * 100).toFixed(1)
                : 0;
            const changeSign = change >= 0 ? '+' : '';

            // Check if this is a significant surge (cocaine +133%)
            const isCocaineSurge = drugData.drug_type === 'Cocaine' && parseFloat(changePercent) > 100;

            // Find non-overlapping positions for labels
            const leftY = this.findNonOverlappingPosition(yStart, leftPositions, minLabelSpacing);
            const rightY = this.findNonOverlappingPosition(yEnd, rightPositions, minLabelSpacing);
            leftPositions.push(leftY);
            rightPositions.push(rightY);

            // Create group for this slope
            const slopeGroup = this.chartGroup.append('g')
                .attr('class', `slope-group slope-${index}${isCocaineSurge ? ' cocaine-surge' : ''}`)
                .style('cursor', 'pointer');

            // Draw connecting line (slope)
            const slopeLine = slopeGroup.append('line')
                .attr('class', `slope-line${isCocaineSurge ? ' cocaine-highlight-line surge-glow' : ''}`)
                .attr('x1', xLeft)
                .attr('y1', yStart)
                .attr('x2', xRight)
                .attr('y2', yEnd)
                .attr('stroke', color)
                .attr('stroke-width', isCocaineSurge ? 4 : 3)
                .attr('stroke-linecap', 'round')
                .attr('opacity', isCocaineSurge ? 1 : 0.8);

            // Draw circles at endpoints
            const leftCircle = slopeGroup.append('circle')
                .attr('class', isCocaineSurge ? 'cocaine-highlight-circle' : '')
                .attr('cx', xLeft)
                .attr('cy', yStart)
                .attr('r', isCocaineSurge ? 7 : 6)
                .attr('fill', color)
                .attr('stroke', 'white')
                .attr('stroke-width', 2);

            const rightCircle = slopeGroup.append('circle')
                .attr('class', isCocaineSurge ? 'cocaine-highlight-circle' : '')
                .attr('cx', xRight)
                .attr('cy', yEnd)
                .attr('r', isCocaineSurge ? 7 : 6)
                .attr('fill', color)
                .attr('stroke', 'white')
                .attr('stroke-width', 2);

            // Add surge annotation for cocaine
            if (isCocaineSurge) {
                this.addSurgeAnnotation(slopeGroup, xLeft, xRight, yStart, yEnd, changeSign, changePercent);
            }

            // Draw connector lines from circles to labels if offset
            if (Math.abs(leftY - yStart) > 2) {
                slopeGroup.append('line')
                    .attr('x1', xLeft)
                    .attr('y1', yStart)
                    .attr('x2', -15)
                    .attr('y2', leftY)
                    .attr('stroke', color)
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '2,2')
                    .attr('opacity', 0.5);
            }

            if (Math.abs(rightY - yEnd) > 2) {
                slopeGroup.append('line')
                    .attr('x1', xRight)
                    .attr('y1', yEnd)
                    .attr('x2', this.width + 15)
                    .attr('y2', rightY)
                    .attr('stroke', color)
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '2,2')
                    .attr('opacity', 0.5);
            }

            // Left label: Drug name + 2023 value
            const leftLabel = slopeGroup.append('g')
                .attr('transform', `translate(${xLeft - 15}, ${leftY})`);

            leftLabel.append('text')
                .attr('x', 0)
                .attr('y', -6)
                .attr('text-anchor', 'end')
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('fill', color)
                .text(getDrugLabel(drugData.drug_type));

            leftLabel.append('text')
                .attr('x', 0)
                .attr('y', 8)
                .attr('text-anchor', 'end')
                .attr('font-size', '11px')
                .attr('fill', '#64748B')
                .text(formatNumber(drugData.startValue));

            // Right label: 2024 value + % change
            const rightLabel = slopeGroup.append('g')
                .attr('transform', `translate(${xRight + 15}, ${rightY})`);

            rightLabel.append('text')
                .attr('x', 0)
                .attr('y', -6)
                .attr('text-anchor', 'start')
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('fill', color)
                .text(formatNumber(drugData.endValue));

            // Change indicator with color coding
            const changeColor = change >= 0 ? '#DC2626' : '#16A34A'; // Red for increase, green for decrease
            rightLabel.append('text')
                .attr('x', 0)
                .attr('y', 8)
                .attr('text-anchor', 'start')
                .attr('font-size', '11px')
                .attr('font-weight', '500')
                .attr('fill', changeColor)
                .text(`${changeSign}${changePercent}%`);

            // Hover interactions
            slopeGroup
                .on('mouseenter', (event) => {
                    // Highlight this slope
                    slopeLine.attr('stroke-width', isCocaineSurge ? 6 : 5).attr('opacity', 1);
                    leftCircle.attr('r', isCocaineSurge ? 10 : 8);
                    rightCircle.attr('r', isCocaineSurge ? 10 : 8);

                    // Dim other slopes
                    this.chartGroup.selectAll('.slope-group')
                        .filter((d, i) => i !== index)
                        .attr('opacity', 0.3);

                    // Show tooltip
                    const content = Tooltip.format({
                        title: drugData.drug_type,
                        value: `${formatNumber(drugData.startValue)} → ${formatNumber(drugData.endValue)}`,
                        details: `Change: ${changeSign}${formatNumber(Math.abs(change))} (${changeSign}${changePercent}%)`,
                        color: color
                    });
                    this.tooltip.show(content, event);
                })
                .on('mousemove', (event) => this.tooltip.move(event))
                .on('mouseleave', () => {
                    // Reset highlight (preserve cocaine surge styling)
                    slopeLine
                        .attr('stroke-width', isCocaineSurge ? 4 : 3)
                        .attr('opacity', isCocaineSurge ? 1 : 0.8);
                    leftCircle.attr('r', isCocaineSurge ? 7 : 6);
                    rightCircle.attr('r', isCocaineSurge ? 7 : 6);

                    // Reset other slopes
                    this.chartGroup.selectAll('.slope-group')
                        .attr('opacity', 1);

                    this.tooltip.hide();
                });
        });
    }

    /**
     * Find a non-overlapping vertical position for a label
     * @param {number} preferred - Preferred y position
     * @param {number[]} existing - Existing positions
     * @param {number} minSpacing - Minimum spacing between labels
     * @returns {number} - Adjusted y position
     */
    findNonOverlappingPosition(preferred, existing, minSpacing) {
        let y = preferred;
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts) {
            const overlaps = existing.some(existingY => Math.abs(existingY - y) < minSpacing);
            if (!overlaps) break;
            // Alternate between moving up and down
            y = preferred + (attempts % 2 === 0 ? 1 : -1) * Math.ceil((attempts + 1) / 2) * (minSpacing * 0.8);
            attempts++;
        }

        return y;
    }

    /**
     * Add surge annotation callout for significant changes (e.g., cocaine +133%)
     * @param {d3.Selection} group - The slope group to add annotation to
     * @param {number} xLeft - Left x position
     * @param {number} xRight - Right x position
     * @param {number} yStart - Start y position
     * @param {number} yEnd - End y position
     * @param {string} sign - Change sign (+ or -)
     * @param {string} percent - Percentage change value
     */
    addSurgeAnnotation(group, xLeft, xRight, yStart, yEnd, sign, percent) {
        // Position annotation at midpoint of the slope, offset above
        const midX = (xLeft + xRight) / 2;
        const midY = (yStart + yEnd) / 2;
        
        // Offset the annotation above the line
        const annotationY = midY - 35;
        
        const annotationGroup = group.append('g')
            .attr('class', 'surge-annotation');

        // Draw connector line from annotation to slope
        annotationGroup.append('path')
            .attr('class', 'surge-connector')
            .attr('d', `M ${midX} ${annotationY + 12} L ${midX} ${midY - 8}`);

        // Annotation box dimensions
        const text = `${sign}${percent}%`;
        const padding = 8;
        const textWidth = text.length * 8 + padding * 2;
        const boxHeight = 24;

        // Draw background box
        annotationGroup.append('rect')
            .attr('class', 'surge-annotation-bg')
            .attr('x', midX - textWidth / 2)
            .attr('y', annotationY - boxHeight / 2)
            .attr('width', textWidth)
            .attr('height', boxHeight)
            .attr('rx', 4)
            .attr('ry', 4);

        // Draw label text
        annotationGroup.append('text')
            .attr('class', 'surge-annotation-text')
            .attr('x', midX)
            .attr('y', annotationY + 4)
            .attr('text-anchor', 'middle')
            .text(text);

        // Add "Cocaine Surge" label below the percentage
        annotationGroup.append('text')
            .attr('x', midX)
            .attr('y', annotationY + boxHeight / 2 + 14)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .attr('fill', '#DC2626')
            .text('Cocaine Surge');
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
