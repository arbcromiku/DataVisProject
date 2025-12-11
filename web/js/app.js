/**
 * Australian RDT Analysis - Main Application
 * Entry point for the data visualisation application
 * COS30045 Data Visualisation Project
 */

import { DataService } from './services/DataService.js';
import { FilterController } from './controllers/FilterController.js';
import { TrendChart } from './charts/TrendChart.js';
import { MapChart } from './charts/MapChart.js';
import { StackedBarChart } from './charts/StackedBarChart.js';
import { SlopeChart } from './charts/SlopeChart.js';
import { HeatmapChart } from './charts/HeatmapChart.js';
import { ComparisonBarChart } from './charts/ComparisonBarChart.js';
import { DonutChart } from './charts/DonutChart.js';
import { Tooltip } from './components/Tooltip.js';
import { formatNumber, normalizeDrugType, normalizeDataset } from './utils/formatters.js';

/**
 * Main Application Class
 * Orchestrates data loading, chart initialization, and interactivity
 */
class App {
    constructor() {
        this.dataService = new DataService();
        this.filterController = null;
        this.tooltip = null;
        this.charts = {};
        this.data = {};
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.showLoading();
            
            // Load all data sources
            await this.loadData();
            
            // Initialize shared components
            this.tooltip = new Tooltip('#tooltip');
            
            // Initialize filter controller
            this.filterController = new FilterController({
                onFilterChange: (filters) => this.handleFilterChange(filters)
            });
            
            // Initialize all charts
            this.initCharts();
            
            // Update hero stats
            this.updateHeroStats();
            
            // Setup navigation
            this.setupNavigation();

            // Setup horizontal scrolling
            this.setupHorizontalScroll();
            
            // Setup intersection observer for scroll animations
            this.setupScrollAnimations();
            
            this.hideLoading();
            
            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showError('Failed to load data. Please refresh the page.');
        }
    }

    /**
     * Load all required data files
     */
    async loadData() {
        const dataFiles = {
            trend: 'data/trend.json',
            jurisdiction: 'data/jurisdiction.json',
            drugComposition: 'data/drug_by_jurisdiction.json',
            drugTrend: 'data/drug_trend.json',  // Drug type by year for slope chart
            testsSummary: 'data/tests_summary.json',  // Tests conducted vs positive detections
            testsConducted: 'data/tests_conducted.json',  // Tests by jurisdiction/year for map
            population: 'data/population.json',  // State populations for per-capita rates
            geoJson: 'australian-states.geojson'
        };

        const loadPromises = Object.entries(dataFiles).map(async ([key, path]) => {
            try {
                const data = await this.dataService.load(path);
                this.data[key] = data;
            } catch (error) {
                console.warn(`Warning: Could not load ${path}`, error);
                this.data[key] = [];
            }
        });

        await Promise.all(loadPromises);
        
        // Process and validate data
        this.processData();
    }

    /**
     * Process and validate loaded data
     * Uses normalizeDataset utility for consistent field handling
     */
    processData() {
        // Trend data (year + total count)
        if (this.data.trend) {
            this.data.trend = normalizeDataset(this.data.trend, {
                year: { type: 'number' },
                total: { from: 'count', type: 'number' }
            });
        }

        // Jurisdiction data (year + jurisdiction + count)
        if (this.data.jurisdiction) {
            this.data.jurisdiction = normalizeDataset(this.data.jurisdiction, {
                year: { type: 'number' },
                jurisdiction: {},
                total: { from: 'count', type: 'number' }
            });
        }

        // Drug composition data (jurisdiction + drug type + count)
        // Note: drug_by_jurisdiction.json has no year field - it's aggregate 2023-2024 data
        if (this.data.drugComposition) {
            this.data.drugComposition = normalizeDataset(this.data.drugComposition, {
                year: { type: 'number', default: 2024 },
                jurisdiction: {},
                drug_type: { transform: d => normalizeDrugType(d.DRUG || d.drug_type || d.drug) },
                count: { type: 'number' }
            });
        }

        // Drug trend data (year + drug type + count) for slope chart
        if (this.data.drugTrend && Array.isArray(this.data.drugTrend)) {
            this.data.drugTrend = normalizeDataset(this.data.drugTrend, {
                year: { type: 'number' },
                drug_type: { transform: d => normalizeDrugType(d.DRUG || d.drug_type || d.drug) },
                count: { type: 'number' }
            });
        }

        // Tests conducted data (year + jurisdiction + tests count)
        if (this.data.testsConducted && Array.isArray(this.data.testsConducted)) {
            this.data.testsConducted = normalizeDataset(this.data.testsConducted, {
                year: { type: 'number' },
                jurisdiction: {},
                tests_conducted: { type: 'number' }
            });
        }

        // Population data (year + jurisdiction + population)
        if (this.data.population && Array.isArray(this.data.population)) {
            this.data.population = normalizeDataset(this.data.population, {
                year: { type: 'number' },
                jurisdiction: {},
                population: { type: 'number' }
            });
        }
    }

    /**
     * Initialize all chart instances
     */
    initCharts() {
        const currentFilters = this.filterController.getFilters();

        // Trend Chart (Line/Area)
        this.charts.trend = new TrendChart({
            container: '#trend-chart',
            tooltip: this.tooltip,
            data: this.filterData(this.data.trend, currentFilters),
            annotations: this.getAnnotations()
        });

        // Map Chart (Choropleth)
        this.charts.map = new MapChart({
            container: '#map-chart',
            tooltip: this.tooltip,
            data: this.aggregateByJurisdiction(currentFilters),
            geoJson: this.data.geoJson,
            testsData: this.getTestsDataForMap(currentFilters),
            populationData: this.data.population || []
        });

        // Jurisdiction Bar Chart
        this.charts.jurisdiction = new StackedBarChart({
            container: '#jurisdiction-chart',
            tooltip: this.tooltip,
            data: this.getStackedData(currentFilters),
            orientation: 'horizontal'
        });

        // Slope Chart (Year-over-year comparison)
        this.charts.slope = new SlopeChart({
            container: '#slope-chart',
            tooltip: this.tooltip,
            data: this.getSlopeData(currentFilters)
        });

        // Heatmap Chart
        this.charts.heatmap = new HeatmapChart({
            container: '#heatmap-chart',
            tooltip: this.tooltip,
            data: this.getHeatmapData(currentFilters)
        });

        // Comparison Bar Chart (Tests vs Detections)
        this.charts.comparison = new ComparisonBarChart({
            container: '#comparison-chart',
            tooltip: this.tooltip,
            data: this.aggregateByJurisdiction(currentFilters)
        });

        // Donut Chart (Cleared vs Positive)
        this.charts.donut = new DonutChart({
            container: '#donut-chart',
            tooltip: this.tooltip,
            data: this.getTestsSummaryData(currentFilters)
        });

        // Setup chart view toggles
        this.setupChartControls();
    }

    /**
     * Filter data based on current filter state
     */
    filterData(data, filters) {
        if (!data || !Array.isArray(data)) return [];
        
        return data.filter(d => {
            const year = d.year;
            const inYearRange = year >= filters.yearStart && year <= filters.yearEnd;
            
            const jurisdiction = d.jurisdiction;
            const inJurisdiction = filters.jurisdiction === 'all' || 
                                   jurisdiction === filters.jurisdiction;
            
            return inYearRange && inJurisdiction;
        });
    }

    /**
     * Aggregate data by jurisdiction for map
     */
    aggregateByJurisdiction(filters) {
        const jurisdiction = this.data.jurisdiction || [];
        const filtered = this.filterData(jurisdiction, { ...filters, jurisdiction: 'all' });
        
        const aggregated = d3.rollup(
            filtered,
            v => d3.sum(v, d => d.total),
            d => d.jurisdiction
        );

        return Array.from(aggregated, ([jurisdiction, total]) => ({
            jurisdiction,
            total
        }));
    }

    /**
     * Get tests conducted data filtered by year range for map
     */
    getTestsDataForMap(filters) {
        const tests = this.data.testsConducted || [];
        return tests.filter(d => d.year >= filters.yearStart && d.year <= filters.yearEnd);
    }

    /**
     * Get stacked bar data by jurisdiction and drug type
     */
    getStackedData(filters) {
        const composition = this.data.drugComposition || [];
        const filtered = composition.filter(d => {
            const year = d.year;
            const inYearRange = year >= filters.yearStart && year <= filters.yearEnd;
            const inDrugType = filters.drugTypes.length === 0 || 
                               filters.drugTypes.includes(d.drug_type);
            return inYearRange && inDrugType;
        });

        // Aggregate by jurisdiction and drug type
        const nested = d3.rollup(
            filtered,
            v => d3.sum(v, d => d.count),
            d => d.jurisdiction,
            d => d.drug_type
        );

        const result = [];
        nested.forEach((drugMap, jurisdiction) => {
            const row = { jurisdiction };
            drugMap.forEach((count, drugType) => {
                row[drugType] = count;
            });
            result.push(row);
        });

        return result;
    }

    /**
     * Get slope chart data (year-by-year time series per drug type)
     * Uses drug_trend.json which has year + drug + count data
     */
    getSlopeData(filters) {
        // Use drugTrend data (from drug_trend.json) which has year field
        const drugTrend = this.data.drugTrend || [];
        const startYear = filters.yearStart;
        const endYear = filters.yearEnd;

        // Filter to year range
        const filtered = drugTrend.filter(d => d.year >= startYear && d.year <= endYear);

        // Get unique drug types and years
        const drugTypes = [...new Set(filtered.map(d => d.drug_type))];
        const years = [...new Set(filtered.map(d => d.year))].sort((a, b) => a - b);

        if (years.length === 0) {
            return [];
        }

        // Build time series for each drug type
        return drugTypes.map(drug => {
            const values = years.map(year => {
                const record = filtered.find(d => d.drug_type === drug && d.year === year);
                return {
                    year,
                    value: record?.count || 0
                };
            });
            
            const startValue = values[0]?.value || 0;
            const endValue = values[values.length - 1]?.value || 0;
            
            return {
                drug_type: drug,
                values,  // Array of {year, value} for each year
                startValue,
                endValue,
                startYear: years[0],
                endYear: years[years.length - 1]
            };
        });
    }

    /**
     * Get heatmap data (jurisdiction x drug type matrix)
     */
    getHeatmapData(filters) {
        const composition = this.data.drugComposition || [];
        const filtered = composition.filter(d => {
            const year = d.year;
            return year >= filters.yearStart && year <= filters.yearEnd;
        });

        // Create matrix data
        const nested = d3.rollup(
            filtered,
            v => d3.sum(v, d => d.count),
            d => d.jurisdiction,
            d => d.drug_type
        );

        const result = [];
        nested.forEach((drugMap, jurisdiction) => {
            drugMap.forEach((count, drugType) => {
                result.push({
                    jurisdiction,
                    drug_type: drugType,
                    value: count
                });
            });
        });

        return result;
    }

    /**
     * Get tests summary data for donut chart (cleared vs positive)
     */
    getTestsSummaryData(filters) {
        const summary = this.data.testsSummary || [];
        
        // Filter by year range
        const filtered = summary.filter(d => 
            d.year >= filters.yearStart && d.year <= filters.yearEnd
        );

        if (filtered.length === 0) {
            return { tests_conducted: 0, positive: 0, cleared: 0, positive_rate: 0 };
        }

        // Aggregate totals across filtered years
        const totals = filtered.reduce((acc, d) => {
            acc.tests_conducted += d.tests_conducted || 0;
            acc.positive += d.positive_detections || 0;
            acc.cleared += d.cleared || 0;
            return acc;
        }, { tests_conducted: 0, positive: 0, cleared: 0 });

        // Calculate overall positive rate
        totals.positive_rate = totals.tests_conducted > 0 
            ? (totals.positive / totals.tests_conducted) * 100 
            : 0;

        return totals;
    }

    /**
     * Get annotations for trend chart
     */
    getAnnotations() {
        return [
            {
                year: 2020,
                label: 'COVID-19 Impact',
                description: 'Reduced testing during lockdowns'
            },
            {
                year: 2023,
                label: 'Record High',
                description: 'Expanded testing programs'
            }
        ];
    }

    /**
     * Handle filter changes
     */
    handleFilterChange(filters) {
        // Update hero stats with filtered data
        this.updateHeroStats(filters);

        // Update all charts with filtered data
        if (this.charts.trend) {
            this.charts.trend.update(this.filterData(this.data.trend, filters));
        }

        if (this.charts.map) {
            this.charts.map.update(
                this.aggregateByJurisdiction(filters),
                this.getTestsDataForMap(filters),
                this.data.population
            );
        }

        if (this.charts.jurisdiction) {
            this.charts.jurisdiction.update(this.getStackedData(filters));
        }

        if (this.charts.slope) {
            this.charts.slope.update(this.getSlopeData(filters));
        }

        if (this.charts.heatmap) {
            this.charts.heatmap.update(this.getHeatmapData(filters));
        }

        if (this.charts.comparison) {
            this.charts.comparison.update(this.aggregateByJurisdiction(filters));
        }

        if (this.charts.donut) {
            this.charts.donut.update(this.getTestsSummaryData(filters));
        }
    }

    /**
     * Update hero section statistics with contextual information
     * @param {Object} filters - Optional filter state to apply
     */
    updateHeroStats(filters = null) {
        const trend = this.data.trend || [];
        
        if (trend.length === 0) return;

        // Apply filters if provided
        const filtered = filters 
            ? this.filterData(trend, filters)
            : trend;

        if (filtered.length === 0) {
            document.getElementById('stat-total').textContent = '0';
            document.getElementById('stat-total-context').textContent = 'No data for selection';
            document.getElementById('stat-growth-value').textContent = '--';
            document.getElementById('stat-growth-context').textContent = 'Adjust filters';
            document.getElementById('stat-peak').textContent = '--';
            document.getElementById('stat-peak-context').textContent = 'No data';
            return;
        }

        // Sort by year for calculations
        const sorted = [...filtered].sort((a, b) => a.year - b.year);
        const firstYear = sorted[0]?.year || 2008;
        const lastYear = sorted[sorted.length - 1]?.year || 2024;
        const first = sorted[0]?.total || 1;
        const last = sorted[sorted.length - 1]?.total || 1;

        // Total detections with context
        const total = d3.sum(filtered, d => d.total);
        document.getElementById('stat-total').textContent = formatNumber(total);
        document.getElementById('stat-total-context').textContent = 
            `${firstYear}–${lastYear} · ~${Math.round(total / sorted.length / 365)} per day avg`;

        // Growth as multiplier (more intuitive than percentage)
        const multiplier = last / first;
        const growthEl = document.getElementById('stat-growth-value');
        const arrowEl = document.querySelector('.stat-arrow');
        const growthLabelEl = document.getElementById('stat-growth-label');
        
        // Update label to reflect filtered year range
        growthLabelEl.textContent = `Since ${firstYear}`;
        
        if (multiplier >= 1) {
            growthEl.textContent = `${multiplier.toFixed(1)}×`;
            arrowEl.textContent = '↑';
            arrowEl.style.color = 'var(--color-danger)';
        } else {
            growthEl.textContent = `${(1/multiplier).toFixed(1)}× less`;
            arrowEl.textContent = '↓';
            arrowEl.style.color = 'var(--color-success)';
        }
        document.getElementById('stat-growth-context').textContent = 
            `${formatNumber(first)} → ${formatNumber(last)} detections`;

        // Daily average (more meaningful than static peak year)
        const years = sorted.length;
        const dailyAvg = Math.round(total / (years * 365));
        document.getElementById('stat-peak').textContent = dailyAvg;
        document.getElementById('stat-peak-label').textContent = 'Daily Average';
        document.getElementById('stat-peak-context').textContent = 
            `${formatNumber(total)} ÷ ${years} years`;
    }

    /**
     * Setup chart control buttons (view toggles, sort options)
     */
    setupChartControls() {
        // Trend chart view toggle (area/line)
        document.querySelectorAll('#trends .chart-controls .chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                document.querySelectorAll('#trends .chart-controls .chart-btn')
                    .forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                if (this.charts.trend) {
                    this.charts.trend.setView(view);
                }
            });
        });

        // Jurisdiction chart sort toggle
        document.querySelectorAll('#geography .chart-controls .chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sort = e.target.dataset.sort;
                document.querySelectorAll('#geography .chart-controls .chart-btn')
                    .forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                if (this.charts.jurisdiction) {
                    this.charts.jurisdiction.setSort(sort);
                }
            });
        });

        // Map view mode toggle (detections/tests/rate)
        document.querySelectorAll('.map-section .chart-controls .chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                document.querySelectorAll('.map-section .chart-controls .chart-btn')
                    .forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                if (this.charts.map) {
                    this.charts.map.setViewMode(view);
                }
            });
        });
    }

    /**
     * Setup horizontal scrolling interactions
     * Maps vertical mouse wheel to horizontal scroll when appropriate
     */
    setupHorizontalScroll() {
        const main = document.querySelector('.horizontal-container');
        if (!main) return;
        
        // Accumulated scroll for momentum-like feel
        let scrollAccumulator = 0;
        let scrollTimeout = null;
        const SCROLL_THRESHOLD = 50; // Pixels before triggering snap scroll
        
        // Wheel event handler
        main.addEventListener('wheel', (e) => {
            // 1. Detect if this is a touchpad (horizontal delta exists)
            // If significant deltaX, let native horizontal scroll happen
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                return;
            }

            // 2. Check if we are inside a vertically scrollable container
            const verticalContainer = e.target.closest('.section');
            
            if (verticalContainer) {
                const hasOverflow = verticalContainer.scrollHeight > verticalContainer.clientHeight;
                
                if (hasOverflow) {
                    const atTop = verticalContainer.scrollTop <= 0;
                    const atBottom = Math.abs(
                        verticalContainer.scrollHeight - verticalContainer.clientHeight - verticalContainer.scrollTop
                    ) <= 1;

                    if (e.deltaY < 0 && !atTop) return;
                    if (e.deltaY > 0 && !atBottom) return;
                }
            }

            // 3. Map vertical wheel to horizontal scroll
            e.preventDefault();
            
            // Accumulate scroll delta for momentum feel
            scrollAccumulator += e.deltaY;
            
            // Clear previous timeout
            if (scrollTimeout) clearTimeout(scrollTimeout);
            
            // When accumulated enough, snap to next/prev section
            if (Math.abs(scrollAccumulator) > SCROLL_THRESHOLD) {
                const direction = scrollAccumulator > 0 ? 1 : -1;
                const sections = document.querySelectorAll('.section');
                const currentScroll = main.scrollLeft;
                const viewportWidth = main.clientWidth;
                
                // Find current section index
                let currentIndex = Math.round(currentScroll / viewportWidth);
                let targetIndex = currentIndex + direction;
                
                // Clamp to valid range
                targetIndex = Math.max(0, Math.min(targetIndex, sections.length - 1));
                
                // Smooth scroll to target section
                sections[targetIndex]?.scrollIntoView({ 
                    behavior: 'smooth', 
                    inline: 'start' 
                });
                
                scrollAccumulator = 0;
            }
            
            // Reset accumulator after pause in scrolling
            scrollTimeout = setTimeout(() => {
                scrollAccumulator = 0;
            }, 150);
            
        }, { passive: false });
        
        // Add keyboard navigation support
        window.addEventListener('keydown', (e) => {
            // Only capture if not in an input
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                main.scrollBy({ left: window.innerWidth, behavior: 'smooth' });
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                main.scrollBy({ left: -window.innerWidth, behavior: 'smooth' });
            }
        });

        // Setup scroll progress indicator (dots)
        this.setupScrollProgressIndicator(main);
    }

    /**
     * Setup scroll progress indicator dots
     */
    setupScrollProgressIndicator(container) {
        const dots = document.querySelectorAll('.scroll-dot');
        const sections = document.querySelectorAll('.section[id]');

        if (!dots.length || !sections.length) return;

        // Click handlers for dots
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const sectionId = dot.dataset.section;
                const section = document.getElementById(sectionId);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                }
            });
        });

        // Update active dot on scroll using IntersectionObserver
        const updateActiveDot = (sectionId) => {
            dots.forEach(dot => {
                dot.classList.toggle('active', dot.dataset.section === sectionId);
            });
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    updateActiveDot(entry.target.id);
                }
            });
        }, {
            root: container,
            threshold: 0.5
        });

        sections.forEach(section => observer.observe(section));
    }

    /**
     * Setup smooth scroll navigation
     */
    setupNavigation() {
        // Mobile menu toggle
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
                menuToggle.setAttribute('aria-expanded', !isExpanded);
                navLinks.classList.toggle('active');
            });
        }

        // Active nav link on scroll
        const sections = document.querySelectorAll('.section[id]');
        const navItems = document.querySelectorAll('.nav-link');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    navItems.forEach(item => {
                        item.classList.toggle('active', 
                            item.getAttribute('href') === `#${id}`);
                    });
                }
            });
        }, { threshold: 0.3 });

        sections.forEach(section => observer.observe(section));
    }

    /**
     * Setup scroll-triggered animations
     */
    setupScrollAnimations() {
        const animatedElements = document.querySelectorAll('.chart-container, .insight-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(el);
        });
    }

    /**
     * Show loading state
     */
    showLoading() {
        document.querySelectorAll('.chart').forEach(chart => {
            chart.innerHTML = '<div class="chart-loading">Loading data</div>';
        });
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        document.querySelectorAll('.chart-loading').forEach(el => el.remove());
    }

    /**
     * Show error message
     */
    showError(message) {
        document.querySelectorAll('.chart').forEach(chart => {
            chart.innerHTML = `<div class="chart-no-data">${message}</div>`;
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});

export { App };
