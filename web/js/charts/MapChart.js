/**
 * MapChart - Choropleth map of Australian states
 * Shows drug detection data by jurisdiction with color intensity
 */
import { BaseChart } from './BaseChart.js';
import { Tooltip } from '../components/Tooltip.js';
import { formatNumber, getJurisdictionName } from '../utils/formatters.js';

export class MapChart extends BaseChart {
    constructor(options) {
        // Map uses smaller margins
        options.margin = { top: 10, right: 10, bottom: 10, left: 10 };
        super(options);
        this.geoJson = options.geoJson;
        this.testsData = options.testsData || [];  // Tests conducted by jurisdiction
        this.populationData = options.populationData || [];  // Population by jurisdiction
        
        // View mode: 'detections', 'tests', or 'rate'
        this.viewMode = options.viewMode || 'detections';
        
        // Selection state
        this.selectedState = null;
        this.stateOrder = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
        
        // D3 selections
        this.colorScale = null;
        this.projection = null;
        this.pathGenerator = null;
        
        // Info panel elements
        this.infoPanel = document.getElementById('map-info-panel');
        
        this.init();
    }

    /**
     * Initialize the chart
     */
    init() {
        if (!this.initSvg('Map of Australia showing drug detections by state', 400)) {
            return;
        }

        // Create color scale
        this.createColorScale();

        // Setup projection
        this.setupProjection();

        // Draw map
        this.drawMap();

        // Draw legend
        this.drawLegend();

        // Setup keyboard navigation
        this.setupKeyboardNav();

        // Setup info panel clear button
        this.setupInfoPanel();

        // Setup state selector buttons
        this.setupStateButtons();

        // Setup resize handler
        this.setupResize();
    }

    /**
     * Create color scale based on data and view mode
     * Uses quantile scale for better contrast with small number of states
     */
    createColorScale() {
        const displayData = this.getDisplayData();
        const values = displayData.filter(d => d.hasData).map(d => d.value).sort((a, b) => a - b);

        // Use quantile scale for discrete color bins (better for 8 states)
        if (this.viewMode === 'rate') {
            // Orange-Red sequential palette for rates (5 classes)
            this.colorScale = d3.scaleQuantile()
                .domain(values)
                .range(['#FEEDDE', '#FDBE85', '#FD8D3C', '#E6550D', '#A63603']);
        } else {
            // Blue sequential palette for detections (5 classes, colorblind-safe)
            this.colorScale = d3.scaleQuantile()
                .domain(values)
                .range(['#EFF3FF', '#BDD7E7', '#6BAED6', '#3182BD', '#08519C']);
        }
    }

    /**
     * Get display data based on current view mode
     * Returns array of {jurisdiction, value, hasData} objects
     */
    getDisplayData() {
        if (this.viewMode === 'rate') {
            // Calculate positive rate: detections / tests conducted × 100
            const detectionsMap = new Map(this.data.map(d => [d.jurisdiction, d.total]));
            
            // Aggregate tests by jurisdiction
            const testsMap = d3.rollup(
                this.testsData,
                v => d3.sum(v, d => d.tests_conducted || 0),
                d => d.jurisdiction
            );
            
            const result = [];
            detectionsMap.forEach((detections, jurisdiction) => {
                const tests = testsMap.get(jurisdiction) || 0;
                if (tests > 0 && tests >= detections) {
                    // Only calculate rate if we have valid test data
                    const rate = (detections / tests) * 100;
                    result.push({ jurisdiction, value: rate, hasData: true });
                } else {
                    // No valid test data - mark as unavailable
                    result.push({ jurisdiction, value: 0, hasData: false });
                }
            });
            return result;
        } else {
            // Default: total detections
            return this.data.map(d => ({ jurisdiction: d.jurisdiction, value: d.total, hasData: true }));
        }
    }

    /**
     * Get legend label based on view mode
     */
    getLegendLabel() {
        switch (this.viewMode) {
            case 'rate': return 'Positive Rate %';
            default: return 'Total Detections';
        }
    }

    /**
     * Setup map projection centered on Australia
     */
    setupProjection() {
        // Mercator projection centered on Australia
        // Use a lower scale to fit all of Australia in the viewport
        const baseScale = Math.min(this.width, this.height) * 0.7;
        
        this.projection = d3.geoMercator()
            .center([134, -26]) // Center of Australia (adjusted north slightly)
            .scale(baseScale)
            .translate([this.width / 2, this.height / 2]);

        this.pathGenerator = d3.geoPath().projection(this.projection);

        // Fit to bounds if geoJSON available
        if (this.geoJson && this.geoJson.features) {
            // Use fitSize to automatically scale and center the map
            this.projection = d3.geoMercator()
                .fitSize([this.width * 0.95, this.height * 0.85], this.geoJson);
            
            this.pathGenerator = d3.geoPath().projection(this.projection);
        }
    }

    /**
     * Draw the map
     */
    drawMap() {
        if (!this.geoJson || !this.geoJson.features) {
            this.showNoDataMessage('Map data unavailable');
            return;
        }

        // Create a lookup map for data based on view mode
        const displayData = this.getDisplayData();
        const dataMap = new Map(displayData.map(d => [d.jurisdiction, { value: d.value, hasData: d.hasData }]));
        this.currentDataMap = dataMap;  // Store for info panel updates

        // Draw state paths
        this.chartGroup.selectAll('.state-path')
            .data(this.geoJson.features)
            .enter()
            .append('path')
            .attr('class', 'state-path')
            .attr('d', this.pathGenerator)
            .attr('data-state', d => this.getStateAbbrev(d.properties))
            .attr('fill', d => {
                const stateName = this.getStateAbbrev(d.properties);
                const data = dataMap.get(stateName) || { value: 0, hasData: false };
                if (!data.hasData) return '#E2E8F0';  // Grey for no data
                return data.value > 0 ? this.colorScale(data.value) : '#E2E8F0';
            })
            .attr('stroke', 'white')
            .attr('stroke-width', 1.5)
            .attr('tabindex', '0')
            .attr('role', 'button')
            .attr('aria-label', d => {
                const stateName = this.getStateAbbrev(d.properties);
                const data = dataMap.get(stateName) || { value: 0, hasData: false };
                return `${getJurisdictionName(stateName)}: ${data.hasData ? formatNumber(data.value) : 'No data'}`;
            })
            .on('mouseenter', (event, d) => this.handleMouseEnter(event, d, dataMap))
            .on('mousemove', (event) => this.tooltip.move(event))
            .on('mouseleave', () => this.handleMouseLeave())
            .on('click', (event, d) => this.handleStateClick(event, d))
            .on('keydown', (event, d) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.handleStateClick(event, d);
                }
            });

        // Add state labels (abbreviations)
        this.chartGroup.selectAll('.state-label')
            .data(this.geoJson.features)
            .enter()
            .append('text')
            .attr('class', 'state-label')
            .attr('transform', d => {
                const centroid = this.pathGenerator.centroid(d);
                return `translate(${centroid[0]},${centroid[1] - 8})`;
            })
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('pointer-events', 'none')
            .text(d => this.getStateAbbrev(d.properties));

        // Add value labels below state abbreviations
        this.chartGroup.selectAll('.state-value-label')
            .data(this.geoJson.features)
            .enter()
            .append('text')
            .attr('class', 'state-value-label')
            .attr('transform', d => {
                const centroid = this.pathGenerator.centroid(d);
                return `translate(${centroid[0]},${centroid[1] + 8})`;
            })
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .text(d => {
                const stateName = this.getStateAbbrev(d.properties);
                const data = dataMap.get(stateName) || { value: 0, hasData: false };
                if (!data.hasData) return '—';
                return this.formatValueLabel(data.value);
            });

        // Draw ACT inset (enlarged view of small territory)
        this.drawACTInset(dataMap);
    }

    /**
     * Draw an enlarged inset for ACT (too small to see on main map)
     */
    drawACTInset(dataMap) {
        const actFeature = this.geoJson.features.find(f => 
            this.getStateAbbrev(f.properties) === 'ACT'
        );
        if (!actFeature) return;

        const actData = dataMap.get('ACT') || { value: 0, hasData: false };
        
        // Inset dimensions and position (bottom-left corner)
        const insetWidth = 80;
        const insetHeight = 80;
        const insetX = 10;
        const insetY = this.height - insetHeight - 40;

        // Create inset group
        const insetGroup = this.chartGroup.append('g')
            .attr('class', 'act-inset')
            .attr('transform', `translate(${insetX}, ${insetY})`);

        // Inset background
        insetGroup.append('rect')
            .attr('class', 'inset-bg')
            .attr('width', insetWidth)
            .attr('height', insetHeight)
            .attr('rx', 6)
            .attr('fill', '#1A1F26')
            .attr('stroke', '#3B4754')
            .attr('stroke-width', 1);

        // Create a projection just for ACT
        const actProjection = d3.geoMercator()
            .fitSize([insetWidth - 16, insetHeight - 30], actFeature);
        const actPath = d3.geoPath().projection(actProjection);

        // Draw ACT enlarged
        insetGroup.append('path')
            .datum(actFeature)
            .attr('class', 'state-path act-inset-path')
            .attr('d', actPath)
            .attr('transform', 'translate(8, 8)')
            .attr('data-state', 'ACT')
            .attr('fill', actData.hasData ? this.colorScale(actData.value) : '#E2E8F0')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('cursor', 'pointer')
            .on('click', (event) => {
                if (this.selectedState === 'ACT') {
                    this.clearSelection();
                } else {
                    this.selectState('ACT');
                }
            })
            .on('mouseenter', (event) => {
                const content = Tooltip.format({
                    title: 'Australian Capital Territory',
                    value: actData.hasData ? this.formatValueLabel(actData.value) : 'N/A',
                    details: actData.hasData ? this.getLegendLabel() : 'No test data',
                    color: actData.hasData ? '#0072B2' : '#94A3B8'
                });
                this.tooltip.show(content, event);
            })
            .on('mouseleave', () => this.tooltip.hide());

        // Inset label
        insetGroup.append('text')
            .attr('x', insetWidth / 2)
            .attr('y', insetHeight - 8)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#E8EAED')
            .text('ACT ' + (actData.hasData ? this.formatValueLabel(actData.value) : '—'));

        // Connector line from inset to actual ACT location
        const actCentroid = this.pathGenerator.centroid(actFeature);
        if (actCentroid && !isNaN(actCentroid[0])) {
            this.chartGroup.append('line')
                .attr('class', 'act-connector')
                .attr('x1', insetX + insetWidth)
                .attr('y1', insetY + insetHeight / 2)
                .attr('x2', actCentroid[0])
                .attr('y2', actCentroid[1])
                .attr('stroke', '#94A3B8')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4,4')
                .attr('opacity', 0.6);
        }
    }

    /**
     * Update ACT inset fill and label when view mode changes
     */
    updateACTInset(dataMap) {
        const actData = dataMap.get('ACT') || { value: 0, hasData: false };
        
        // Update ACT inset path fill
        this.chartGroup.select('.act-inset-path')
            .transition()
            .duration(500)
            .attr('fill', actData.hasData ? this.colorScale(actData.value) : '#E2E8F0');
        
        // Update ACT inset label
        this.chartGroup.select('.act-inset text:last-of-type')
            .text('ACT ' + (actData.hasData ? this.formatValueLabel(actData.value) : '—'));
    }

    /**
     * Format value for display on map
     */
    formatValueLabel(value) {
        if (this.viewMode === 'rate') {
            return value.toFixed(0) + '%';
        }
        // Compact number format
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'K';
        }
        return formatNumber(value);
    }

    /**
     * Get state abbreviation from GeoJSON properties
     */
    getStateAbbrev(properties) {
        // Handle various property naming conventions
        const name = properties.STATE_NAME || properties.name || properties.NAME || 
                     properties.state || properties.abbrev || '';
        
        const abbrevMap = {
            'New South Wales': 'NSW',
            'Victoria': 'VIC',
            'Queensland': 'QLD',
            'Western Australia': 'WA',
            'South Australia': 'SA',
            'Tasmania': 'TAS',
            'Northern Territory': 'NT',
            'Australian Capital Territory': 'ACT'
        };

        return abbrevMap[name] || properties.STATE_CODE || properties.abbrev || name.substring(0, 3).toUpperCase();
    }

    /**
     * Draw color legend - discrete boxes for quantile scale
     */
    drawLegend() {
        const colors = this.colorScale.range();
        const quantiles = this.colorScale.quantiles();
        const boxWidth = 36;
        const boxHeight = 12;
        const legendWidth = colors.length * boxWidth;
        const legendX = this.width - legendWidth - 20;
        const legendY = this.height - 40;

        const legendGroup = this.chartGroup.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${legendX},${legendY})`);

        // Draw color boxes
        legendGroup.selectAll('.legend-box')
            .data(colors)
            .enter()
            .append('rect')
            .attr('class', 'legend-box')
            .attr('x', (d, i) => i * boxWidth)
            .attr('width', boxWidth)
            .attr('height', boxHeight)
            .attr('fill', d => d)
            .attr('stroke', '#E2E8F0')
            .attr('stroke-width', 0.5);

        // Get min and max values for labels
        const displayData = this.getDisplayData();
        const values = displayData.filter(d => d.hasData).map(d => d.value);
        const minVal = d3.min(values) || 0;
        const maxVal = d3.max(values) || 100;

        // Min label
        legendGroup.append('text')
            .attr('x', 0)
            .attr('y', boxHeight + 14)
            .attr('font-size', '10px')
            .attr('fill', '#64748B')
            .text(this.viewMode === 'rate' ? minVal.toFixed(0) + '%' : this.formatValueLabel(minVal));

        // Max label
        legendGroup.append('text')
            .attr('x', legendWidth)
            .attr('y', boxHeight + 14)
            .attr('text-anchor', 'end')
            .attr('font-size', '10px')
            .attr('fill', '#64748B')
            .text(this.viewMode === 'rate' ? maxVal.toFixed(0) + '%' : this.formatValueLabel(maxVal));

        // Title
        legendGroup.append('text')
            .attr('x', legendWidth / 2)
            .attr('y', -6)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('fill', '#64748B')
            .text(this.getLegendLabel());
    }

    /**
     * Handle mouse enter on state
     */
    handleMouseEnter(event, d, dataMap) {
        const stateName = this.getStateAbbrev(d.properties);
        const data = dataMap.get(stateName) || { value: 0, hasData: false };

        // Highlight state
        d3.select(event.target)
            .transition()
            .duration(150)
            .attr('opacity', 0.8)
            .attr('stroke-width', 3);

        // Format value based on view mode and data availability
        let formattedValue, detailsText, color;
        
        if (!data.hasData && this.viewMode === 'rate') {
            formattedValue = 'N/A';
            detailsText = 'Test data unavailable';
            color = '#94A3B8';  // Grey
        } else if (this.viewMode === 'rate') {
            formattedValue = data.value.toFixed(1) + '%';
            detailsText = 'Of tests returned positive';
            color = '#DC2626';  // Red
        } else {
            formattedValue = formatNumber(data.value);
            detailsText = 'Total positive tests';
            color = '#0072B2';  // Blue
        }

        // Show tooltip
        const content = Tooltip.format({
            title: getJurisdictionName(stateName),
            value: formattedValue,
            details: detailsText,
            color: color
        });

        this.tooltip.show(content, event);
    }

    /**
     * Handle mouse leave
     */
    handleMouseLeave() {
        // Reset hover effects but preserve selection
        this.chartGroup.selectAll('.state-path:not(.selected)')
            .transition()
            .duration(150)
            .attr('opacity', null);

        this.tooltip.hide();
    }

    /**
     * Handle state click for selection
     */
    handleStateClick(event, d) {
        const stateName = this.getStateAbbrev(d.properties);
        
        // Toggle selection
        if (this.selectedState === stateName) {
            this.clearSelection();
        } else {
            this.selectState(stateName);
        }
    }

    /**
     * Select a state and update info panel
     */
    selectState(stateName) {
        this.selectedState = stateName;
        
        // Dim non-selected states, highlight selected
        this.chartGroup.selectAll('.state-path')
            .classed('selected', false);
        
        this.chartGroup.selectAll(`.state-path[data-state="${stateName}"]`)
            .classed('selected', true)
            .raise();  // Bring to front
        
        // Update ACT inset container highlight
        this.chartGroup.select('.act-inset .inset-bg')
            .classed('inset-selected', stateName === 'ACT');
        
        // Update info panel
        this.updateInfoPanel(stateName);
        
        // Update state buttons
        this.updateStateButtons();
    }

    /**
     * Clear state selection
     */
    clearSelection() {
        this.selectedState = null;
        
        // Reset all states
        this.chartGroup.selectAll('.state-path')
            .classed('selected', false);
        
        // Reset ACT inset container highlight
        this.chartGroup.select('.act-inset .inset-bg')
            .classed('inset-selected', false);
        
        // Reset info panel
        this.resetInfoPanel();
        
        // Reset state buttons
        this.updateStateButtons();
    }

    /**
     * Update the info panel with state details
     */
    updateInfoPanel(stateName) {
        if (!this.infoPanel) return;
        
        const placeholder = this.infoPanel.querySelector('.info-panel-placeholder');
        const content = this.infoPanel.querySelector('.info-panel-content');
        
        if (!placeholder || !content) return;
        
        // Get state data
        const detectionData = this.data.find(d => d.jurisdiction === stateName);
        const displayData = this.currentDataMap?.get(stateName) || { value: 0, hasData: false };
        
        // Calculate additional stats
        const testsTotal = d3.sum(
            this.testsData.filter(d => d.jurisdiction === stateName),
            d => d.tests_conducted || 0
        );
        const detections = detectionData?.total || 0;
        const rate = testsTotal > 0 ? ((detections / testsTotal) * 100) : 0;
        
        // Calculate rank
        const sortedStates = [...this.data].sort((a, b) => b.total - a.total);
        const rank = sortedStates.findIndex(d => d.jurisdiction === stateName) + 1;
        
        // Show content, hide placeholder
        placeholder.style.display = 'none';
        content.style.display = 'flex';
        
        // Update state name
        content.querySelector('.info-state-name').textContent = getJurisdictionName(stateName);
        
        // Update primary stat
        const primaryStat = content.querySelector('.info-stat.primary');
        primaryStat.querySelector('.stat-value').textContent = formatNumber(detections);
        primaryStat.querySelector('.stat-label').textContent = 'Total Detections';
        
        // Update secondary stat
        const secondaryStat = content.querySelector('.info-stat.secondary');
        if (displayData.hasData && this.viewMode === 'rate') {
            secondaryStat.querySelector('.stat-value').textContent = displayData.value.toFixed(1) + '%';
            secondaryStat.querySelector('.stat-label').textContent = 'Positive Rate';
        } else if (testsTotal > 0) {
            secondaryStat.querySelector('.stat-value').textContent = rate.toFixed(1) + '%';
            secondaryStat.querySelector('.stat-label').textContent = 'Positive Rate';
        } else {
            secondaryStat.querySelector('.stat-value').textContent = '—';
            secondaryStat.querySelector('.stat-label').textContent = 'Positive Rate';
        }
        
        // Update details
        content.querySelector('#info-tests').textContent = testsTotal > 0 ? formatNumber(testsTotal) : 'Not available';
        content.querySelector('#info-rate').textContent = testsTotal > 0 ? rate.toFixed(1) + '%' : 'N/A';
        content.querySelector('#info-rank').textContent = rank > 0 ? `#${rank} of 8` : '—';
    }

    /**
     * Reset info panel to placeholder state
     */
    resetInfoPanel() {
        if (!this.infoPanel) return;
        
        const placeholder = this.infoPanel.querySelector('.info-panel-placeholder');
        const content = this.infoPanel.querySelector('.info-panel-content');
        
        if (placeholder) placeholder.style.display = 'flex';
        if (content) content.style.display = 'none';
    }

    /**
     * Setup info panel event handlers
     */
    setupInfoPanel() {
        if (!this.infoPanel) return;
        
        const clearBtn = this.infoPanel.querySelector('.info-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelection());
        }
    }

    /**
     * Setup state selector buttons
     */
    setupStateButtons() {
        const buttons = document.querySelectorAll('.state-selector .state-btn');
        
        buttons.forEach(btn => {
            const state = btn.dataset.state;
            
            // Mark small states for visual distinction
            if (['TAS', 'ACT'].includes(state)) {
                btn.classList.add('small-state');
            }
            
            btn.addEventListener('click', () => {
                if (this.selectedState === state) {
                    this.clearSelection();
                } else {
                    this.selectState(state);
                }
            });
        });
    }

    /**
     * Update state button active states
     */
    updateStateButtons() {
        const buttons = document.querySelectorAll('.state-selector .state-btn');
        buttons.forEach(btn => {
            const isActive = btn.dataset.state === this.selectedState;
            btn.classList.toggle('active', isActive);
        });
    }

    /**
     * Setup keyboard navigation for accessibility
     */
    setupKeyboardNav() {
        const containerEl = document.querySelector(this.container);
        if (!containerEl) return;
        
        containerEl.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'].includes(event.key)) {
                return;
            }
            
            event.preventDefault();
            
            if (event.key === 'Escape') {
                this.clearSelection();
                return;
            }
            
            // Find current index
            const currentIndex = this.selectedState 
                ? this.stateOrder.indexOf(this.selectedState)
                : -1;
            
            let newIndex;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                newIndex = currentIndex < this.stateOrder.length - 1 ? currentIndex + 1 : 0;
            } else {
                newIndex = currentIndex > 0 ? currentIndex - 1 : this.stateOrder.length - 1;
            }
            
            this.selectState(this.stateOrder[newIndex]);
        });
    }

    /**
     * Update chart with new data
     */
    update(newData, testsData, populationData) {
        this.data = newData || [];
        if (testsData) this.testsData = testsData;
        if (populationData) this.populationData = populationData;
        
        this.createColorScale();

        const displayData = this.getDisplayData();
        const dataMap = new Map(displayData.map(d => [d.jurisdiction, { value: d.value, hasData: d.hasData }]));
        this.currentDataMap = dataMap;

        // Update state fills
        this.chartGroup.selectAll('.state-path')
            .transition()
            .duration(500)
            .attr('fill', d => {
                const stateName = this.getStateAbbrev(d.properties);
                const data = dataMap.get(stateName) || { value: 0, hasData: false };
                if (!data.hasData) return '#E2E8F0';
                return data.value > 0 ? this.colorScale(data.value) : '#E2E8F0';
            });

        // Update value labels
        this.chartGroup.selectAll('.state-value-label')
            .text(d => {
                const stateName = this.getStateAbbrev(d.properties);
                const data = dataMap.get(stateName) || { value: 0, hasData: false };
                if (!data.hasData) return '—';
                return this.formatValueLabel(data.value);
            });

        // Update aria labels
        this.chartGroup.selectAll('.state-path')
            .attr('aria-label', d => {
                const stateName = this.getStateAbbrev(d.properties);
                const data = dataMap.get(stateName) || { value: 0, hasData: false };
                return `${getJurisdictionName(stateName)}: ${data.hasData ? formatNumber(data.value) : 'No data'}`;
            });

        // Rebind mouse events with new dataMap
        this.chartGroup.selectAll('.state-path')
            .on('mouseenter', (event, d) => this.handleMouseEnter(event, d, dataMap));

        // Update ACT inset
        this.updateACTInset(dataMap);

        // Update legend
        this.chartGroup.select('.legend').remove();
        this.drawLegend();

        // Update info panel if a state is selected
        if (this.selectedState) {
            this.updateInfoPanel(this.selectedState);
        }
    }

    /**
     * Set view mode and re-render
     * @param {string} mode - 'detections', 'tests', or 'rate'
     */
    setViewMode(mode) {
        if (this.viewMode === mode) return;
        
        this.viewMode = mode;
        this.update(this.data, this.testsData, this.populationData);
    }

    /**
     * Update data sources for map
     */
    setDataSources(testsData, populationData) {
        this.testsData = testsData || [];
        this.populationData = populationData || [];
    }
}
