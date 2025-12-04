// Global config & helpers

const drugTypes = [
    "AMPHETAMINE",
    "CANNABIS",
    "COCAINE",
    "ECSTASY",
    "METHYLAMPHETAMINE"
];

let globalData = [];
let globalGeoData = null;
let globalAgg = {};
const tooltip = d3.select("#tooltip");

const globalFilters = { yearStart: null, yearEnd: null };
let availableYears = [];

// Creative color palettes
const creativePalettes = {
    vibrant: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#C7C7C7", "#5366FF"],
    gradient: ["#F0F0FF", "#E6E6FF", "#CCCCFF", "#B3B3FF", "#9999FF", "#8080FF", "#6666FF", "#4D4DFF", "#3333FF", "#1A1AFF"],
    warm: ["#FF6B6B", "#FF8E53", "#FE6B8B", "#FF6F91", "#C44569", "#F8B195", "#F67280", "#355C7D"],
    cool: ["#4ECDC4", "#44A08D", "#096A09", "#006A6B", "#0496FF", "#3A86FF", "#7209B7", "#560BAD"]
};

let animationTimer = null;
let currentYearIndex = 0;
let resizeTimer = null;

function setAvailableYears(years) {
    availableYears = years;
    if (!years.length) return;
    if (globalFilters.yearStart === null) globalFilters.yearStart = years[0];
    if (globalFilters.yearEnd === null) globalFilters.yearEnd = years[years.length - 1];
}

function getYearRange() {
    if (!availableYears.length) return { start: null, end: null };
    const start = globalFilters.yearStart ?? availableYears[0];
    const end = globalFilters.yearEnd ?? availableYears[availableYears.length - 1];
    return { start, end };
}

function filterByYearRange(data, accessor = d => d.YEAR) {
    const { start, end } = getYearRange();
    return data.filter(d => {
        const year = accessor(d);
        if (start !== null && year < start) return false;
        if (end !== null && year > end) return false;
        return true;
    });
}

function syncYearSelectors() {
    const { start, end } = getYearRange();
    d3.select("#year-start").property("value", start);
    d3.select("#year-end").property("value", end);
}

function refreshYearDropdowns() {
    const { start, end } = getYearRange();
    const yearOptions = availableYears.filter(y => (start === null || y >= start) && (end === null || y <= end));
    const yearDropdowns = [
        "jurisdiction-year",
        "age-year",
        "drugtype-year",
        "stacked-year",
        "map-year",
        "remoteness-year",
        "composition-year",
        "heatmap-year",
        "bubble-year",
        "radar-year"
    ];

    yearDropdowns.forEach(id => {
        const sel = d3.select("#" + id);
        if (sel.empty()) return;
        const current = sel.property("value");
        sel.html("");
        sel.append("option").attr("value", "All").text("All years");
        yearOptions.forEach(y => {
            sel.append("option").attr("value", y).text(y);
        });
        if (current !== "All" && yearOptions.includes(+current)) {
            sel.property("value", +current);
        } else if (id === "remoteness-year" && yearOptions.includes(2023)) {
            sel.property("value", 2023);
        } else {
            sel.property("value", "All");
        }
    });
}

function updateYearRange(start, end) {
    if (Number.isNaN(start) || Number.isNaN(end)) return;
    if (start > end) [start, end] = [end, start];
    globalFilters.yearStart = start;
    globalFilters.yearEnd = end;
    syncYearSelectors();
    refreshYearDropdowns();
    redrawAll();
}

function resetFilters() {
    if (availableYears.length) {
        globalFilters.yearStart = availableYears[0];
        globalFilters.yearEnd = availableYears[availableYears.length - 1];
        syncYearSelectors();
    }

    const dropdownIds = [
        "trend-jurisdiction",
        "jurisdiction-year",
        "age-year",
        "age-drug",
        "drugtype-jurisdiction",
        "drugtype-year",
        "stacked-year",
        "heatmap-year",
        "map-year",
        "remoteness-year",
        "composition-year",
        "bubble-year",
        "radar-year"
    ];

    dropdownIds.forEach(id => {
        const sel = d3.select("#" + id);
        if (!sel.empty()) sel.property("value", "All");
    });

    refreshYearDropdowns();
    redrawAll();
}
 
// Utility: get unique sorted values
function uniqueSorted(arr) {
    return Array.from(new Set(arr)).sort();
}


function formatNumber(value) {
    return d3.format(",.0f")(value);
}

function getChartSize(container, baseHeight = 360) {
    const width = Math.max(240, Math.min(1000, container.node().clientWidth || 900));
    return { width, height: baseHeight };
}


function addAxisLabels(svg, width, height, margin, xLabel, yLabel) {
    svg
        .append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height - 6)
        .attr("text-anchor", "middle")
        .text(xLabel);

    svg
        .append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .text(yLabel);
}

function renderLegend(container, items) {
    const legend = container
        .append("div")
        .attr("class", "legend");

    legend
        .selectAll("span.legend-item")
        .data(items)
        .enter()
        .append("span")
        .attr("class", "legend-item")
        .html(d => `
            <span class="legend-swatch" style="background:${d.color}"></span>
            ${d.label}
        `);
}

function addAccessibleInteraction(selection, labelFn, onActivate) {
    selection
        .attr("role", "button")
        .attr("tabindex", 0)
        .attr("aria-label", d => labelFn(d))
        .on("keydown", (event, d) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onActivate(event, d);
            }
        });
}

let loadingOverlay = null;
function showLoading(message = "Loading data...") {
    if (!loadingOverlay) {
        loadingOverlay = d3.select("body")
            .append("div")
            .attr("id", "loading-overlay");
    }
    loadingOverlay.attr("class", null).text(message).style("display", "flex");
}

function hideLoading() {
    if (loadingOverlay) loadingOverlay.attr("class", null).style("display", "none");
}

function showError(message) {
    if (!loadingOverlay) {
        showLoading(message);
        loadingOverlay.attr("class", "error");
        return;
    }
    loadingOverlay.text(message).attr("class", "error").style("display", "flex");
}

function triggerDownload(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function serializeSvg(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(clone);
}

function exportChart(targetId, filename = "chart.svg", format = "svg") {
    const container = document.getElementById(targetId);
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;

    const serialized = serializeSvg(svg);

    if (format === "svg") {
        const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, filename);
        URL.revokeObjectURL(url);
        return;
    }

    const svg64 = btoa(encodeURIComponent(serialized));
    const image = new Image();
    const rect = svg.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.width * 2));
    canvas.height = Math.max(1, Math.round(rect.height * 2));
    const ctx = canvas.getContext("2d");

    image.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL("image/png");
        triggerDownload(pngUrl, filename.replace(/\.svg$/i, ".png"));
    };
    image.src = `data:image/svg+xml;base64,${svg64}`;
}

function enhanceExportButtons() {
    document.querySelectorAll(".export-btn, .btn-export").forEach(btn => {
        if (btn.dataset.bound === "true") return;
        const format = btn.dataset.format || "svg";
        btn.dataset.bound = "true";
        btn.dataset.format = format;
        
        // Enhanced click handler with loading state
        btn.addEventListener("click", async () => {
            const originalText = btn.textContent;
            btn.textContent = "Exporting...";
            btn.disabled = true;
            btn.style.opacity = "0.6";
            
            try {
                await exportChartAsync(btn.dataset.target, btn.dataset.filename || `chart.${format}`, format);
                btn.textContent = "✓ Exported";
                btn.style.background = "#10b981";
                btn.style.color = "white";
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.background = "";
                    btn.style.color = "";
                }, 2000);
            } catch (error) {
                btn.textContent = "✗ Export Failed";
                btn.style.background = "#ef4444";
                btn.style.color = "white";
                console.error("Export failed:", error);
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.background = "";
                    btn.style.color = "";
                }, 3000);
            }
        });

        // Add keyboard accessibility
        btn.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                btn.click();
            }
        });
    });
}

// Async export function with better error handling
async function exportChartAsync(targetId, filename = "chart.svg", format = "svg") {
    return new Promise((resolve, reject) => {
        try {
            const container = document.getElementById(targetId);
            if (!container) {
                reject(new Error(`Container #${targetId} not found`));
                return;
            }
            
            const svg = container.querySelector("svg");
            if (!svg) {
                reject(new Error(`No SVG found in #${targetId}`));
                return;
            }

            if (format === "svg") {
                const serialized = serializeSvg(svg);
                const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                triggerDownload(url, filename);
                URL.revokeObjectURL(url);
                resolve();
            } else if (format === "png") {
                // Enhanced PNG export with better quality
                const serialized = serializeSvg(svg);
    const svg64 = btoa(encodeURIComponent(serialized));
                const image = new Image();
                
                image.onload = () => {
                    const rect = svg.getBoundingClientRect();
                    const canvas = document.createElement("canvas");
                    const scale = 2; // Higher resolution
                    canvas.width = Math.max(1, Math.round(rect.width * scale));
                    canvas.height = Math.max(1, Math.round(rect.height * scale));
                    const ctx = canvas.getContext("2d");
                    
                    // White background
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Enable better image rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            triggerDownload(url, filename);
                            URL.revokeObjectURL(url);
                            resolve();
                        } else {
                            reject(new Error("Failed to generate PNG blob"));
                        }
                    }, "image/png", 0.95);
                };
                
                image.onerror = () => reject(new Error("Failed to load SVG for PNG conversion"));
                image.src = `data:image/svg+xml;base64,${svg64}`;
            } else {
                reject(new Error(`Unsupported format: ${format}`));
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Enhanced performance monitoring
function performanceMonitor() {
    const startTime = performance.now();
    const chartCount = document.querySelectorAll('.viz-container').length;
    
    // Monitor render performance
    const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
            if (entry.entryType === 'measure') {
                console.log(`Chart ${entry.name} rendered in ${entry.duration.toFixed(2)}ms`);
            }
        });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    
    return {
        startTime,
        chartCount,
        mark: (name) => performance.mark(name),
        measure: (name, startMark, endMark) => performance.measure(name, startMark, endMark)
    };
}

// Lazy loading for better performance
function createLazyLoader(containerId, renderFunction) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Create intersection observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                observer.unobserve(entry.target);
                
                // Mark performance start
                const perf = performanceMonitor();
                perf.mark(`${containerId}-start`);
                
                // Render the chart
                renderFunction();
                
                // Mark performance end
                perf.mark(`${containerId}-end`);
                perf.measure(`${containerId}-render`, `${containerId}-start`, `${containerId}-end`);
            }
        });
    }, {
        rootMargin: '50px',
        threshold: 0.1
    });
    
    observer.observe(container);
}

// Enhanced responsive design with debouncing
function createResponsiveRenderer(renderFunction, containerId) {
    let resizeTimeout;
    
    const debouncedRender = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const container = document.getElementById(containerId);
            if (container) {
                // Check if container is visible
                const rect = container.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    renderFunction();
                }
            }
        }, 250);
    };
    
    // Add resize listener with passive option for better performance
    window.addEventListener('resize', debouncedRender, { passive: true });
    
    return debouncedRender;
}

// Enhanced accessibility features
function enhanceAccessibility() {
    // Add keyboard navigation for charts
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
            // Ensure focus indicators are visible
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-navigation');
    });
    
    // Add screen reader announcements for chart updates
    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    return { announceToScreenReader };
}

// Enhanced error handling
function createErrorHandler() {
    const errors = [];
    
    function handleError(error, context = 'unknown') {
        errors.push({
            timestamp: new Date().toISOString(),
            error: error.message,
            context,
            stack: error.stack
        });
        
        console.error(`Chart error in ${context}:`, error);
        
        // Show user-friendly error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'chart-error';
        errorMessage.innerHTML = `
            <div class="error-content">
                <h4>Visualization Error</h4>
                <p>Something went wrong rendering this chart. Please try refreshing the page.</p>
                <details>
                    <summary>Technical Details</summary>
                    <pre>${error.message}</pre>
                </details>
            </div>
        `;
        
        // Insert error message after failed chart
        const chartContainers = document.querySelectorAll('.viz-container');
        chartContainers.forEach(container => {
            if (!container.querySelector('svg') && !container.querySelector('.chart-error')) {
                container.appendChild(errorMessage.cloneNode(true));
            }
        });
    }
    
    // Global error handler
    window.addEventListener('error', (event) => {
        handleError(event.error, 'global');
    });
    
    return { handleError, errors };
}

function renderEmptyState(container, message) {
    container.html("");
    container.append("div")
        .attr("class", "empty-state")
        .text(message);
}

// Aggregation functions to replace knime_exports
function computeTrendByYear(data) {
    return d3.rollup(data, v => d3.sum(v, d => d.COUNT), d => d.YEAR)
        .entries()
        .map(d => ({ YEAR: +d.key, COUNT: d.value }));
}

function computeJurisdictionYear(data) {
    return d3.rollup(data, v => d3.sum(v, d => d.COUNT), d => d.JURISDICTION, d => d.YEAR)
        .entries()
        .flatMap(jur => jur.value.map((count, year) => ({ 
            YEAR: +year, 
            JURISDICTION: jur.key, 
            COUNT: count 
        })));
}

function computeAgeYearDrug(data) {
    const result = [];
    drugTypes.forEach(drug => {
        const byAgeYear = d3.rollup(
            data.filter(d => d[drug] === 1),
            v => d3.sum(v, d => d.COUNT),
            d => d.AGE_GROUP,
            d => d.YEAR
        );
        byAgeYear.forEach((years, age) => {
            years.forEach((count, year) => {
                result.push({ YEAR: +year, AGE_GROUP: age, DRUG: drug, COUNT: count });
            });
        });
    });
    return result;
}

function computeDrugComposition(data) {
    const result = [];
    drugTypes.forEach(drug => {
        const byJurYear = d3.rollup(
            data.filter(d => d[drug] === 1),
            v => d3.sum(v, d => d.COUNT),
            d => d.JURISDICTION,
            d => d.YEAR
        );
        byJurYear.forEach((years, jur) => {
            years.forEach((count, year) => {
                result.push({ YEAR: +year, JURISDICTION: jur, DRUG: drug, COUNT: count });
            });
        });
    });
    return result;
}

function computeJurisdictionDrugMatrix(data) {
    const result = [];
    drugTypes.forEach(drug => {
        const byJurYear = d3.rollup(
            data.filter(d => d[drug] === 1),
            v => d3.sum(v, d => d.COUNT),
            d => d.JURISDICTION,
            d => d.YEAR
        );
        byJurYear.forEach((years, jur) => {
            years.forEach((count, year) => {
                result.push({ YEAR: +year, JURISDICTION: jur, DRUG: drug, COUNT: count });
            });
        });
    });
    return result;
}

function computeMapByStateLocation(data) {
    return d3.rollup(data, v => d3.sum(v, d => d.COUNT), d => d.JURISDICTION, d => d.LOCATION, d => d.YEAR)
        .entries()
        .flatMap(jur => jur.value.entries()
            .flatMap(loc => loc.value.map((count, year) => ({ 
                YEAR: +year, 
                JURISDICTION: jur.key, 
                LOCATION: loc.key, 
                COUNT: count 
            }))));
}

function computeCreativeView(data) {
    return d3.rollup(data, 
        v => ({
            COUNT: d3.sum(v, d => d.COUNT),
            FINES: d3.sum(v, d => d.FINES),
            ARRESTS: d3.sum(v, d => d.ARRESTS),
            CHARGES: d3.sum(v, d => d.CHARGES)
        }), 
        d => d.JURISDICTION, 
        d => d.YEAR
    ).entries()
    .flatMap(jur => jur.value.map((stats, year) => ({ 
        YEAR: +year, 
        JURISDICTION: jur.key, 
        COUNT: stats.COUNT,
        FINES: stats.FINES,
        ARRESTS: stats.ARRESTS,
        CHARGES: stats.CHARGES
    })));
}

// Load & preprocess data (all sources use JSON format)

showLoading();

Promise.all([
    d3.json("australian-states.geojson"),
    d3.json("police_data.json")
]).then(([
    geoData,
    raw
]) => {
    hideLoading();
    globalGeoData = geoData;

    // Build detailed dataset from processed JSON
    let data = raw.filter(d => d.METRIC === "positive_drug_tests");

    data = data.filter(d => d.NO_DRUGS_DETECTED !== "Yes");
    data = data.map(d => {
        drugTypes.forEach(drug => {
            d[drug] = d[drug] && d[drug].toString().toLowerCase() === "yes" ? 1 : 0;
        });
        d.YEAR = +d.YEAR;
        d.COUNT = +d.COUNT;
        d.FINES = +d.FINES || 0;
        d.ARRESTS = +d.ARRESTS || 0;
        d.CHARGES = +d.CHARGES || 0;
        return d;
    });
    globalData = data;

    // Compute aggregations from raw data
    const trendByYear = computeTrendByYear(data);
    const jurisdictionYear = computeJurisdictionYear(data);
    const ageYearDrug = computeAgeYearDrug(data);
    const drugComposition = computeDrugComposition(data);
    const jurisdictionDrugMatrix = computeJurisdictionDrugMatrix(data);
    const mapByStateLocation = computeMapByStateLocation(data);
    const creativeView = computeCreativeView(data);

    globalAgg = {
        trendByYear,
        jurisdictionYear,
        ageYearDrug,
        drugComposition,
        jurisdictionDrugMatrix,
        mapByStateLocation,
        creativeView
    };

    setAvailableYears(uniqueSorted((trendByYear || []).map(d => d.YEAR)));
 
    initFilters();
    renderSummary();
    enhanceExportButtons();
 
    // Initial draw

    createTrendChart();
    createJurisdictionChart();
    createMap();
    createAgeGroupChart();
    createDrugTypeChart();
    createHeatmap();
    createStackedDrugChart();
    createRemotenessChart();
    createEvolutionChart();
    createCompositionChart();

    // Creative visualizations
    renderRadialChart();
    renderBubbleChart();
    renderRadarChart();
    renderStreamGraph();
    renderAnimatedTimeline();

    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(redrawAll, 200);
    }, { passive: true });

    // Story-based scroll interactions
    initStoryScrolling();
}).catch(err => {
    console.error("Data load failed", err);
    showError("Data load failed. Please refresh or check file availability.");
});

// Story scrolling functionality
function initStoryScrolling() {
    // Intersection Observer for chapter visibility
    const chapterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Update active navigation link
                const chapterId = entry.target.id;
                document.querySelectorAll('.chapter-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${chapterId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '-100px 0px -100px 0px'
    });

    // Observe all story chapters
    document.querySelectorAll('.story-chapter').forEach(chapter => {
        chapterObserver.observe(chapter);
    });

    // Smooth scroll for navigation links
    document.querySelectorAll('.chapter-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 150;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Hide/show navigation on scroll
    let lastScrollTop = 0;
    const nav = document.getElementById('story-nav');
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Only hide nav when scrolling down and past header
        if (scrollTop > 300 && scrollTop > lastScrollTop) {
            nav.classList.add('hidden');
        } else {
            nav.classList.remove('hidden');
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, { passive: true });

    // Progressive chapter reveal
    document.querySelectorAll('.story-chapter').forEach((chapter, index) => {
        chapter.style.transitionDelay = `${index * 0.1}s`;
    });
}


// Initialise dropdowns

function initFilters() {
    const years = availableYears.length ? availableYears : uniqueSorted((globalAgg.trendByYear || []).map(d => d.YEAR));
    setAvailableYears(years);
    const jurisdictions = uniqueSorted((globalAgg.jurisdictionYear || []).map(d => d.JURISDICTION));

    const yearStartSel = d3.select("#year-start");
    const yearEndSel = d3.select("#year-end");
    yearStartSel.html("");
    yearEndSel.html("");
    years.forEach(y => {
        yearStartSel.append("option").attr("value", y).text(y);
        yearEndSel.append("option").attr("value", y).text(y);
    });
    const { start, end } = getYearRange();
    yearStartSel.property("value", start);
    yearEndSel.property("value", end);
    yearStartSel.on("change", () => updateYearRange(+yearStartSel.property("value"), +yearEndSel.property("value")));
    yearEndSel.on("change", () => updateYearRange(+yearStartSel.property("value"), +yearEndSel.property("value")));

    // Jurisdiction filters
    ["trend-jurisdiction", "drugtype-jurisdiction"].forEach(id => {
        const sel = d3.select("#" + id);
        sel.html("");
        sel.append("option").attr("value", "All").text("All jurisdictions");
        jurisdictions.forEach(j => {
            sel.append("option").attr("value", j).text(j);
        });
    });

    // Year filters
    ["jurisdiction-year", "age-year", "drugtype-year", "stacked-year", "map-year", "remoteness-year", "composition-year", "heatmap-year", "bubble-year", "radar-year"].forEach(
        id => {
            const sel = d3.select("#" + id);
            sel.html("");
            sel.append("option").attr("value", "All").text("All years");
            years.forEach(y => {
                sel.append("option").attr("value", y).text(y);
            });
            if (id === "remoteness-year" && years.includes(2023)) {
                sel.property("value", 2023);
            }
        }
    );
    refreshYearDropdowns();

    // Drug type filter (for age chart)
    const ageDrugSel = d3.select("#age-drug");
    ageDrugSel.html("");
    ageDrugSel.append("option").attr("value", "All").text("All drugs");
    drugTypes.forEach(d => {
        ageDrugSel.append("option").attr("value", d).text(d);
    });

    // Hook up change events → redraw charts
    d3.select("#trend-jurisdiction").on("change", createTrendChart);
    d3.select("#jurisdiction-year").on("change", createJurisdictionChart);
    d3.select("#age-year").on("change", createAgeGroupChart);
    d3.select("#age-drug").on("change", createAgeGroupChart);
    d3.select("#drugtype-jurisdiction").on("change", createDrugTypeChart);
    d3.select("#drugtype-year").on("change", createDrugTypeChart);
    d3.select("#stacked-year").on("change", createStackedDrugChart);
    d3.select("#heatmap-year").on("change", createHeatmap);
    d3.select("#map-year").on("change", createMap);
    d3.select("#remoteness-year").on("change", createRemotenessChart);
    d3.select("#composition-year").on("change", createCompositionChart);
    d3.select("#bubble-year").on("change", renderBubbleChart);
    d3.select("#radar-year").on("change", renderRadarChart);
    d3.select("#reset-filters").on("click", resetFilters);
}


function renderSummary() {
    const trend = filterByYearRange(globalAgg.trendByYear || []);
    const jurYear = filterByYearRange(globalAgg.jurisdictionYear || []);
    const drugComp = filterByYearRange(globalAgg.drugComposition || []);

    if (!trend.length || !jurYear.length || !drugComp.length) {
        document.getElementById("stat-total").textContent = "–";
        document.getElementById("stat-top-jurisdiction").textContent = "–";
        document.getElementById("stat-top-drug").textContent = "–";
        return;
    }

    const totalPositives = d3.sum(trend, d => d.COUNT);

    const yearTotals = new Map(
        d3.rollups(
            jurYear,
            v => d3.sum(v, d => d.COUNT),
            d => d.YEAR
        )
    );

    const peak = { jurisdiction: "", year: "", share: 0, count: 0 };

    d3.rollups(
        jurYear,
        v => d3.sum(v, d => d.COUNT),
        d => d.YEAR,
        d => d.JURISDICTION
    ).forEach(([year, entries]) => {
        const yearTotal = yearTotals.get(year) || 1;
        entries.forEach(([jur, count]) => {
            const share = count / yearTotal;
            if (share > peak.share) {
                peak.jurisdiction = jur;
                peak.year = year;
                peak.share = share;
                peak.count = count;
            }
        });
    });

    const drugTotals = drugTypes.map(drug => ({
        drug,
        total: d3.sum(drugComp, d => (d.DRUG === drug ? d.COUNT : 0))
    }));
    const topDrug = drugTotals.sort((a, b) => b.total - a.total)[0];

    document.getElementById("stat-total").textContent = formatNumber(totalPositives);
    document.getElementById("stat-top-jurisdiction").textContent = `${peak.jurisdiction} • ${(peak.share * 100).toFixed(1)}% (${peak.year})`;
    document.getElementById("stat-top-drug").textContent = `${topDrug.drug} • ${formatNumber(topDrug.total)} tests`;
}


// 1. Positive Drug Rate Over Time – Line Chart

function createTrendChart() {
    const jurisdiction = d3.select("#trend-jurisdiction").property("value");

    let yearly;
    if (jurisdiction === "All") {
        yearly = filterByYearRange(globalAgg.trendByYear || []).slice().sort((a, b) => a.YEAR - b.YEAR);
    } else {
        const filtered = filterByYearRange(globalAgg.jurisdictionYear || []).filter(d => d.JURISDICTION === jurisdiction);
        yearly = d3.rollups(filtered, v => d3.sum(v, d => d.COUNT), d => d.YEAR)
            .map(([year, total]) => ({ YEAR: year, COUNT: total }))
            .sort((a, b) => a.YEAR - b.YEAR);
    }

    const container = d3.select("#trend-chart");
    container.html("");

    if (!yearly.length) {
        renderEmptyState(container, "No data for selected filters.");
        return;
    }

    const { width, height } = getChartSize(container, 360);
    const margin = { top: 40, right: 40, bottom: 50, left: 70 };

    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3
        .scaleLinear()
        .domain(d3.extent(yearly, d => d.YEAR))
        .range([margin.left, width - margin.right]);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(yearly, d => d.COUNT) || 0])
        .nice()
        .range([height - margin.bottom, margin.top]);

    const line = d3
        .line()
        .x(d => x(d.YEAR))
        .y(d => y(d.COUNT));

    svg
        .append("path")
        .datum(yearly)
        .attr("fill", "none")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 3)
        .attr("d", line);

    svg
        .selectAll("circle.point")
        .data(yearly)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("cx", d => x(d.YEAR))
        .attr("cy", d => y(d.COUNT))
        .attr("r", 4)
        .attr("fill", "#1d4ed8")
        .on("mousemove", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(
                    `
          <strong>Year:</strong> ${d.YEAR}<br>
          <strong>Positive tests:</strong> ${d.COUNT.toLocaleString()}<br>
          <strong>Jurisdiction:</strong> ${jurisdiction === "All" ? "All jurisdictions" : jurisdiction}
        `
                )
                .style("left", event.pageX + 12 + "px")
                .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

    if (jurisdiction === "All") {
        const nswPeak = filterByYearRange(globalAgg.jurisdictionYear || []).find(d => d.JURISDICTION === "NSW" && d.YEAR === 2023);
        if (nswPeak) {
            const point = yearly.find(d => d.YEAR === nswPeak.YEAR);
            if (point) {
                const xPos = x(point.YEAR);
                const yPos = y(point.COUNT);
                svg.append("line")
                    .attr("x1", xPos)
                    .attr("y1", yPos)
                    .attr("x2", xPos + 14)
                    .attr("y2", yPos - 30)
                    .attr("stroke", "#ef4444")
                    .attr("stroke-width", 2)
                    .attr("stroke-dasharray", "4 2");
                svg.append("text")
                    .attr("class", "annotation")
                    .attr("x", xPos + 16)
                    .attr("y", yPos - 34)
                    .text("NSW 2023 peak");
            }
        }
    }

    svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    addAxisLabels(svg, width, height, margin, "Year", "Positive tests");
}


// 2. Positive Drug Rates by Jurisdiction – Horizontal Bar Chart

function createJurisdictionChart() {
    const yearVal = d3.select("#jurisdiction-year").property("value");

    let filtered = filterByYearRange(globalAgg.jurisdictionYear || []);
    if (yearVal !== "All") {
        filtered = filtered.filter(d => d.YEAR === +yearVal);
    }

    const byJurisdiction = d3
        .rollups(
            filtered,
            v => d3.sum(v, d => d.COUNT),
            d => d.JURISDICTION
        )
        .map(([jurisdiction, total]) => ({ JURISDICTION: jurisdiction, COUNT: total }))
        .sort((a, b) => b.COUNT - a.COUNT);

    const totalAll = d3.sum(byJurisdiction, d => d.COUNT) || 1;

    const container = d3.select("#jurisdiction-chart");
    container.html("");

    if (!byJurisdiction.length) {
        renderEmptyState(container, "No jurisdiction data for selected filters.");
        return;
    }

    const { width, height } = getChartSize(container, 360);
    const margin = { top: 30, right: 40, bottom: 50, left: 120 };

    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const y = d3
        .scaleBand()
        .domain(byJurisdiction.map(d => d.JURISDICTION))
        .range([margin.top, height - margin.bottom])
        .padding(0.2);

    const x = d3
        .scaleLinear()
        .domain([0, d3.max(byJurisdiction, d => d.COUNT) || 0])
        .nice()
        .range([margin.left, width - margin.right]);

    const color = d3
        .scaleLinear()
        .domain([0, d3.max(byJurisdiction, d => d.COUNT) || 1])
        .range(["#bfdbfe", "#1d4ed8"]);

    const handleJurisdictionSelect = (event, d) => {
        const trendSelect = d3.select("#trend-jurisdiction");
        const drugSelect = d3.select("#drugtype-jurisdiction");
        trendSelect.property("value", d.JURISDICTION);
        drugSelect.property("value", d.JURISDICTION);
        trendSelect.dispatch("change");
        drugSelect.dispatch("change");
        d3.selectAll(".bar").attr("opacity", 0.6);
        d3.select(event.currentTarget).attr("opacity", 1);
    };

    const bars = svg
        .selectAll("rect.bar")
        .data(byJurisdiction)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.JURISDICTION))
        .attr("x", x(0))
        .attr("height", y.bandwidth())
        .attr("width", 0)
        .attr("fill", d => color(d.COUNT))
        .style("cursor", "pointer")
        .on("click", handleJurisdictionSelect)
        .on("mousemove", (event, d) => {
            const share = (d.COUNT / totalAll) * 100;
            tooltip
                .style("opacity", 1)
                .html(
                    `
          <strong>Jurisdiction:</strong> ${d.JURISDICTION}<br>
          <strong>Positive tests:</strong> ${d.COUNT.toLocaleString()}<br>
          <strong>Share of total:</strong> ${share.toFixed(1)}%<br>
          <strong>Year:</strong> ${yearVal === "All" ? "All years" : yearVal}
        `
                )
                .style("left", event.pageX + 12 + "px")
                .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    addAccessibleInteraction(bars, d => `Jurisdiction ${d.JURISDICTION}, ${formatNumber(d.COUNT)} positive tests`, handleJurisdictionSelect);

    bars
        .transition()
        .duration(700)
        .attr("width", d => x(d.COUNT) - x(0));

    svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5));

    svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    addAxisLabels(svg, width, height, margin, "Positive tests", "Jurisdiction");
}


// 3. Positive Rate by Age Group – Grouped Bar Chart

function createAgeGroupChart() {
    const yearVal = d3.select("#age-year").property("value");
    const drugVal = d3.select("#age-drug").property("value");

    let filtered = filterByYearRange(globalAgg.ageYearDrug || []);
    if (yearVal !== "All") {
        filtered = filtered.filter(d => d.YEAR === +yearVal);
    }
    if (drugVal !== "All") {
        filtered = filtered.filter(d => d.DRUG === drugVal);
    }

    const byAge = d3
        .rollups(
            filtered,
            v => d3.sum(v, d => d.COUNT),
            d => d.AGE_GROUP
        )
        .map(([age, total]) => ({ AGE_GROUP: age, COUNT: total }))
        .sort((a, b) => a.AGE_GROUP.localeCompare(b.AGE_GROUP));

    const container = d3.select("#age-chart");
    container.html("");

    if (!byAge.length) {
        renderEmptyState(container, "No age-group data for selected filters.");
        return;
    }

    const { width, height } = getChartSize(container, 360);
    const margin = { top: 30, right: 40, bottom: 70, left: 70 };

    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3
        .scaleBand()
        .domain(byAge.map(d => d.AGE_GROUP))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(byAge, d => d.COUNT) || 0])
        .nice()
        .range([height - margin.bottom, margin.top]);

    const showAgeTooltip = (event, d) => {
        const rect = event.currentTarget.getBoundingClientRect();
        tooltip
            .style("opacity", 1)
            .html(
                `
          <strong>Age group:</strong> ${d.AGE_GROUP}<br>
          <strong>Positive tests:</strong> ${d.COUNT.toLocaleString()}<br>
          <strong>Drug filter:</strong> ${drugVal === "All" ? "All drugs" : drugVal}<br>
          <strong>Year:</strong> ${yearVal === "All" ? "All years" : yearVal}
        `
            )
            .style("left", (event.pageX || rect.x + rect.width / 2) + "px")
            .style("top", (event.pageY || rect.y - 10) + "px");
    };

    const bars = svg
        .selectAll("rect.bar")
        .data(byAge)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.AGE_GROUP))
        .attr("width", x.bandwidth())
        .attr("y", y(0))
        .attr("height", 0)
        .attr("fill", "#10b981")
        .on("mousemove", showAgeTooltip)
        .on("mouseout", () => tooltip.style("opacity", 0));

    addAccessibleInteraction(bars, d => `Age group ${d.AGE_GROUP}, ${formatNumber(d.COUNT)} positive tests`, showAgeTooltip);

    bars
        .transition()
        .duration(700)
        .attr("y", d => y(d.COUNT))
        .attr("height", d => y(0) - y(d.COUNT));

    svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end");

    svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    addAxisLabels(svg, width, height, margin, "Age group", "Positive tests");
}


// 4. Positive Rate by Drug Type – Vertical Bar Chart

function createDrugTypeChart() {
    const yearVal = d3.select("#drugtype-year").property("value");
    const jurisVal = d3.select("#drugtype-jurisdiction").property("value");

    let filtered = filterByYearRange(globalAgg.drugComposition || []);
    if (yearVal !== "All") {
        filtered = filtered.filter(d => d.YEAR === +yearVal);
    }
    if (jurisVal !== "All") {
        filtered = filtered.filter(d => d.JURISDICTION === jurisVal);
    }

    const drugData = drugTypes.map(drug => {
        const total = d3.sum(filtered, d => (d.DRUG === drug ? d.COUNT : 0));
        return { DRUG: drug, COUNT: total };
    });

    const container = d3.select("#drugtype-chart");
    container.html("");

    if (!drugData.some(d => d.COUNT > 0)) {
        renderEmptyState(container, "No drug composition data for selected filters.");
        return;
    }

    const { width, height } = getChartSize(container, 360);
    const margin = { top: 30, right: 40, bottom: 70, left: 70 };

    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3
        .scaleBand()
        .domain(drugData.map(d => d.DRUG))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(drugData, d => d.COUNT) || 0])
        .nice()
        .range([height - margin.bottom, margin.top]);

    const color = d3
        .scaleOrdinal()
        .domain(drugTypes)
        .range(["#4ade80", "#22c55e", "#16a34a", "#15803d", "#166534"]);

    const showDrugTooltip = (event, d) => {
        const rect = event.currentTarget.getBoundingClientRect();
        tooltip
            .style("opacity", 1)
            .html(
                `
          <strong>Drug:</strong> ${d.DRUG}<br>
          <strong>Positive tests:</strong> ${d.COUNT.toLocaleString()}<br>
          <strong>Jurisdiction:</strong> ${jurisVal === "All" ? "All jurisdictions" : jurisVal}<br>
          <strong>Year:</strong> ${yearVal === "All" ? "All years" : yearVal}
        `
            )
            .style("left", (event.pageX || rect.x + rect.width / 2) + "px")
            .style("top", (event.pageY || rect.y - 10) + "px");
    };

    const bars = svg
        .selectAll("rect.bar")
        .data(drugData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.DRUG))
        .attr("width", x.bandwidth())
        .attr("y", y(0))
        .attr("height", 0)
        .attr("fill", d => color(d.DRUG))
        .on("mousemove", showDrugTooltip)
        .on("mouseout", () => tooltip.style("opacity", 0));

    addAccessibleInteraction(bars, d => `Drug ${d.DRUG}, ${formatNumber(d.COUNT)} positive tests`, showDrugTooltip);

    bars
        .transition()
        .duration(700)
        .attr("y", d => y(d.COUNT))
        .attr("height", d => y(0) - y(d.COUNT));

    svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end");

    svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    addAxisLabels(svg, width, height, margin, "Drug type", "Positive tests");

    renderLegend(container, drugTypes.map(drug => ({
        label: drug,
        color: color(drug)
    })));
}


// 5. Drug Type Distribution Across Age Groups – Stacked Bar Chart

function createHeatmap() {
    const yearVal = d3.select("#heatmap-year").property("value");

    let filtered = filterByYearRange(globalAgg.jurisdictionDrugMatrix || []);
    if (yearVal !== "All") {
        filtered = filtered.filter(d => d.YEAR === +yearVal);
    }

    const jurisdictions = uniqueSorted(filtered.map(d => d.JURISDICTION));

    const matrix = filtered.map(d => ({
        jurisdiction: d.JURISDICTION,
        drug: d.DRUG,
        value: d.COUNT
    }));

    const container = d3.select("#heatmap-chart");
    container.html("");

    if (!matrix.length) {
        renderEmptyState(container, "No heatmap data for selected filters.");
        return;
    }

    const { width, height } = getChartSize(container, 400);
    const margin = { top: 30, right: 30, bottom: 70, left: 120 };

    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3.scaleBand()
        .range([margin.left, width - margin.right])
        .domain(jurisdictions)
        .padding(0.05);

    const y = d3.scaleBand()
        .range([height - margin.bottom, margin.top])
        .domain(drugTypes)
        .padding(0.05);

    const maxVal = d3.max(matrix, d => d.value) || 1;
    const color = d3.scaleSequential()
        .interpolator(d3.interpolateBlues)
        .domain([0, maxVal]);

    const handleHeatmapSelect = (event, d) => {
        const trendSelect = d3.select("#trend-jurisdiction");
        const drugSelect = d3.select("#age-drug");
        trendSelect.property("value", d.jurisdiction);
        drugSelect.property("value", d.drug);
        trendSelect.dispatch("change");
        drugSelect.dispatch("change");
        svg.selectAll("rect").style("opacity", 0.4);
        d3.select(event.currentTarget).style("opacity", 1);
    };

    const heatmapCells = svg.selectAll("rect")
        .data(matrix)
        .enter()
        .append("rect")
        .attr("x", d => x(d.jurisdiction))
        .attr("y", d => y(d.drug))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => color(d.value))
        .style("stroke", "#f4f6f8")
        .style("stroke-width", 1)
        .style("cursor", "pointer")
        .on("click", handleHeatmapSelect)
        .on("mousemove", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>Jurisdiction:</strong> ${d.jurisdiction}<br>
                    <strong>Drug:</strong> ${d.drug}<br>
                    <strong>Count:</strong> ${formatNumber(d.value)}<br>
                    <strong>Year:</strong> ${yearVal === "All" ? "All years" : yearVal}
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    addAccessibleInteraction(heatmapCells, d => `Jurisdiction ${d.jurisdiction}, drug ${d.drug}, count ${formatNumber(d.value)}`, handleHeatmapSelect);

    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .style("text-anchor", "middle");

    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`) 
        .call(d3.axisLeft(y));

    addAxisLabels(svg, width, height, margin, "Jurisdiction", "Drug Type");
}

// 6. Drug Type Distribution Across Age Groups – Stacked Bar Chart

function createStackedDrugChart() {
    const yearVal = d3.select("#stacked-year").property("value");

    let filtered = filterByYearRange(globalAgg.ageYearDrug || []);
    if (yearVal !== "All") {
        filtered = filtered.filter(d => d.YEAR === +yearVal);
    }

    const ageGroups = uniqueSorted(filtered.map(d => d.AGE_GROUP));

    const stackedData = ageGroups.map(age => {
        const rows = filtered.filter(d => d.AGE_GROUP === age);
        const base = { AGE_GROUP: age };
        drugTypes.forEach(drug => {
            base[drug] = d3.sum(rows, r => (r.DRUG === drug ? r.COUNT : 0));
        });
        return base;
    });

    const container = d3.select("#stacked-chart");
    container.html("");

    if (!ageGroups.length) {
        renderEmptyState(container, "No age-by-drug data for selected filters.");
        return;
    }

    const { width, height } = getChartSize(container, 400);
    const margin = { top: 30, right: 20, bottom: 70, left: 80 };

    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3
        .scaleBand()
        .domain(ageGroups)
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3
        .scaleLinear()
        .domain([
            0,
            d3.max(stackedData, d =>
                d3.sum(drugTypes, drug => d[drug] || 0)
            ) || 0
        ])
        .nice()
        .range([height - margin.bottom, margin.top]);

    const color = d3
        .scaleOrdinal()
        .domain(drugTypes)
        .range(["#38bdf8", "#6366f1", "#ec4899", "#f97316", "#22c55e"]);

    const stack = d3.stack().keys(drugTypes);
    const series = stack(stackedData);

    const layers = svg
        .selectAll("g.layer")
        .data(series)
        .enter()
        .append("g")
        .attr("class", "layer")
        .attr("fill", d => color(d.key));

    layers
        .selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("x", d => x(d.data.AGE_GROUP))
        .attr("y", y(0))
        .attr("height", 0)
        .attr("width", x.bandwidth())
        .on("mousemove", (event, d) => {
            const drug = event.currentTarget.parentNode.__data__.key;
            const totalAge = d3.sum(drugTypes, k => d.data[k] || 0);
            const value = d.data[drug] || 0;
            const pct = totalAge ? (value / totalAge) * 100 : 0;

            tooltip
                .style("opacity", 1)
                .html(
                    `
          <strong>Age group:</strong> ${d.data.AGE_GROUP}<br>
          <strong>Drug:</strong> ${drug}<br>
          <strong>Positive tests:</strong> ${value.toLocaleString()}<br>
          <strong>Share within age group:</strong> ${pct.toFixed(1)}%<br>
          <strong>Year:</strong> ${yearVal === "All" ? "All years" : yearVal}
        `
                )
                .style("left", event.pageX + 12 + "px")
                .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition()
        .duration(700)
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]));

    svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end");

    svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    addAxisLabels(svg, width, height, margin, "Age group", "Positive tests");

    renderLegend(container, drugTypes.map(drug => ({
        label: drug,
        color: color(drug)
    })));
}


// 7. Geographic Map
function createMap() {
    if (!globalGeoData) return;

    const yearVal = d3.select("#map-year").property("value");

    let filtered = filterByYearRange(globalAgg.mapByStateLocation || []);
    if (yearVal !== "All") {
        filtered = filtered.filter(d => d.YEAR === +yearVal);
    }

    const hasDetailedLocation = filtered.some(d => d.LOCATION && d.LOCATION !== "All regions" && d.LOCATION !== "Unknown");
    if ((!filtered.length || !hasDetailedLocation) && globalData.length) {
        let fallback = filterByYearRange(globalData, d => d.YEAR);
        if (yearVal !== "All") {
            fallback = fallback.filter(d => d.YEAR === +yearVal);
        }
        fallback = fallback.filter(d => d.LOCATION && d.LOCATION !== "Unknown");
        if (fallback.length) {
            filtered = fallback.map(d => ({
                YEAR: d.YEAR,
                JURISDICTION: d.JURISDICTION,
                LOCATION: d.LOCATION,
                COUNT: d.COUNT
            }));
        }
    }

    // Aggregate counts by JURISDICTION
    const counts = new Map();
    d3.rollups(filtered, v => d3.sum(v, d => d.COUNT), d => d.JURISDICTION)
        .forEach(([jur, count]) => counts.set(jur, count));

    const maxCount = d3.max(Array.from(counts.values())) || 1;

    const stateMap = {
        "New South Wales": "NSW",
        "Victoria": "VIC",
        "Queensland": "QLD",
        "South Australia": "SA",
        "Western Australia": "WA",
        "Tasmania": "TAS",
        "Northern Territory": "NT",
        "Australian Capital Territory": "ACT"
    };

    const capitals = {
        "NSW": { coords: [151.2093, -33.8688], name: "Sydney" },
        "VIC": { coords: [144.9631, -37.8136], name: "Melbourne" },
        "QLD": { coords: [153.0251, -27.4698], name: "Brisbane" },
        "SA": { coords: [138.6007, -34.9285], name: "Adelaide" },
        "WA": { coords: [115.8605, -31.9505], name: "Perth" },
        "TAS": { coords: [147.3272, -42.8821], name: "Hobart" },
        "NT": { coords: [130.8456, -12.4634], name: "Darwin" },
        "ACT": { coords: [149.1300, -35.2809], name: "Canberra" }
    };

    const locationData = new Map();
    filtered.forEach(d => {
        if (d.LOCATION === "All regions" || d.LOCATION === "Unknown") return;
        if (!locationData.has(d.JURISDICTION)) {
            locationData.set(d.JURISDICTION, { metro: 0, regional: 0 });
        }
        const rec = locationData.get(d.JURISDICTION);
        if (d.LOCATION === "Major Cities of Australia") {
            rec.metro += d.COUNT;
        } else {
            rec.regional += d.COUNT;
        }
    });

    const container = d3.select("#map-chart");
    container.html("");

    if (!filtered.length) {
        renderEmptyState(container, "No geographic data for selected filters.");
        return;
    }

    const { width, height } = getChartSize(container, 500);

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const projection = d3.geoMercator()
        .center([133, -28])
        .translate([width / 2, height / 2])
        .scale(Math.min(width, height) * 1.1 + 100);

    const path = d3.geoPath().projection(projection);

    const color = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, maxCount]);

    svg.selectAll("path")
        .data(globalGeoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
            const jur = stateMap[d.properties.STATE_NAME];
            if (!jur) return "#e5e7eb";
            const data = locationData.get(jur);
            if (data && (data.metro > 0 || data.regional > 0)) {
                return color(data.regional);
            }
            const count = counts.get(jur) || 0;
            return color(count);
        })
        .attr("stroke", "#777")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
            const jur = stateMap[d.properties.STATE_NAME];
            const data = locationData.get(jur) || { metro: 0, regional: 0 };
            const total = counts.get(jur) || 0;
            let content = `<strong>${d.properties.STATE_NAME} (${jur})</strong><br>`;
            if (data.metro || data.regional) {
                content += `Regional/Remote: ${data.regional.toLocaleString()}<br>Major Cities: ${data.metro.toLocaleString()}<br><em style="font-size:0.8em">Base map colored by Regional count</em>`;
            } else {
                content += `Positive tests: ${total.toLocaleString()}`;
            }
            tooltip.style("opacity", 1)
                .html(content)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .on("click", (event, d) => {
            const jur = stateMap[d.properties.STATE_NAME];
            if (jur) {
                const trendSelect = d3.select("#trend-jurisdiction");
                trendSelect.property("value", jur);
                trendSelect.dispatch("change");
                svg.selectAll("path").attr("opacity", 0.6);
                d3.select(event.currentTarget).attr("opacity", 1);
            }
        });

    svg.selectAll("circle.city")
        .data(Object.entries(capitals))
        .enter()
        .append("circle")
        .attr("class", "city")
        .attr("cx", d => projection(d[1].coords)[0])
        .attr("cy", d => projection(d[1].coords)[1])
        .attr("r", d => {
            const data = locationData.get(d[0]);
            if (data && data.metro > 0) {
                const r = Math.sqrt(data.metro) * 0.8;
                return Math.max(4, Math.min(r, 25));
            }
            return 0;
        })
        .attr("fill", "#f59e0b")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .attr("opacity", 0.8)
        .style("pointer-events", "none");

    const legend = container.append("div").attr("class", "map-legend");
    legend.append("div").attr("class", "legend-title").text("Map key");
    legend.append("div")
        .attr("class", "legend-row")
        .html('<span class="legend-gradient"></span><span>Regional/Remote count (lighter → darker)</span>');
    legend.append("div")
        .attr("class", "legend-row")
        .html('<span class="legend-bubble"></span><span>Major Cities circles sized by metro positives</span>');
}

function redrawAll() {
    if (!globalData.length) return;
    renderSummary();
    createTrendChart();
    createJurisdictionChart();
    createMap();
    createAgeGroupChart();
    createDrugTypeChart();
    createHeatmap();
    createStackedDrugChart();
    createRemotenessChart();
    createEvolutionChart();
    createCompositionChart();
    renderRadialChart();
    renderBubbleChart();
    renderRadarChart();
    renderStreamGraph();
    renderAnimatedTimeline();
}

// 9. Evolution of Drug Types Over Time (Stacked Area)
function createEvolutionChart() {
    const container = d3.select("#evolution-chart");
    container.html("");

    const { width, height } = getChartSize(container, 400);
    const margin = { top: 30, right: 100, bottom: 50, left: 70 };

    // Prepare data: Year -> { Drug1: Count, Drug2: Count ... }
    const filteredData = filterByYearRange(globalData, d => d.YEAR);
    const years = uniqueSorted(filteredData.map(d => d.YEAR));
    if (!years.length) {
        renderEmptyState(container, "No data for selected years.");
        return;
    }

    const stackedData = years.map(year => {
        const yearData = filteredData.filter(d => d.YEAR === year);
        const row = { YEAR: year };
        drugTypes.forEach(drug => {
            row[drug] = d3.sum(yearData, d => (d[drug] === 1 ? d.COUNT : 0));
        });
        return row;
    });

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(stackedData, d => d3.sum(drugTypes, k => d[k])) || 0])
        .nice()
        .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal()
        .domain(drugTypes)
        .range(["#38bdf8", "#6366f1", "#ec4899", "#f97316", "#22c55e"]);

    const area = d3.area()
        .x(d => x(d.data.YEAR))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

    const stack = d3.stack().keys(drugTypes);
    const series = stack(stackedData);

    svg.selectAll("path")
        .data(series)
        .enter()
        .append("path")
        .attr("fill", d => color(d.key))
        .attr("d", area)
        .append("title")
        .text(d => d.key);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    addAxisLabels(svg, width, height, margin, "Year", "Positive Tests");

    renderLegend(container, drugTypes.map(drug => ({
        label: drug,
        color: color(drug)
    })).reverse()); // Reverse to match stack order visually
}

// 10. Drug Composition by Jurisdiction (Normalized Stacked Bar)
function createCompositionChart() {
    const yearVal = d3.select("#composition-year").property("value");
    
    const baseData = filterByYearRange(globalData, d => d.YEAR);
    let filtered = yearVal === "All" ? baseData : baseData.filter(d => d.YEAR === +yearVal);
    
    const jurisdictions = uniqueSorted(filtered.map(d => d.JURISDICTION));

    // Prepare data: Jurisdiction -> { Drug1: Count ... }
    const data = jurisdictions.map(jur => {
        const jurData = filtered.filter(d => d.JURISDICTION === jur);
        const row = { JURISDICTION: jur };
        let total = 0;
        drugTypes.forEach(drug => {
            const count = d3.sum(jurData, d => (d[drug] === 1 ? d.COUNT : 0));
            row[drug] = count;
            total += count;
        });
        // Normalize to 100%
        row.total = total;
        drugTypes.forEach(drug => {
            row[drug] = total ? (row[drug] / total) * 100 : 0;
        });
        return row;
    }).filter(d => d.total > 0);

    const container = d3.select("#composition-chart");
    container.html("");

    if (!data.length) {
        renderEmptyState(container, "No composition data for selected filters.");
        return;
    }

    const { width, height } = getChartSize(container, 400);
    const margin = { top: 30, right: 20, bottom: 50, left: 70 };

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3.scaleBand()
        .domain(data.map(d => d.JURISDICTION))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal()
        .domain(drugTypes)
        .range(["#38bdf8", "#6366f1", "#ec4899", "#f97316", "#22c55e"]);

    const stack = d3.stack().keys(drugTypes);
    const series = stack(data);

    svg.selectAll("g.layer")
        .data(series)
        .enter()
        .append("g")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("x", d => x(d.data.JURISDICTION))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .on("mousemove", (event, d) => {
            const drug = event.currentTarget.parentNode.__data__.key;
            const pct = d[1] - d[0];
            tooltip.style("opacity", 1)
                .html(`
                    <strong>${d.data.JURISDICTION}</strong><br>
                    <strong>Drug:</strong> ${drug}<br>
                    <strong>Share:</strong> ${pct.toFixed(1)}%<br>
                    <em style="font-size:0.8em">Total tests: ${d.data.total.toLocaleString()}</em>
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickFormat(d => d + "%"));

    addAxisLabels(svg, width, height, margin, "Jurisdiction", "Percentage of Positive Tests");
    
    renderLegend(container, drugTypes.map(drug => ({
        label: drug,
        color: color(drug)
    })).reverse());
}

// 8. Remoteness Chart
function createRemotenessChart() {
    const yearVal = d3.select("#remoteness-year").property("value");

    let filtered = filterByYearRange(globalAgg.mapByStateLocation || []).filter(d => d.LOCATION !== "All regions" && d.LOCATION !== "Unknown");
    if (yearVal !== "All") {
        filtered = filtered.filter(d => d.YEAR === +yearVal);
    }

    if (!filtered.length && globalData.length) {
        let fallback = filterByYearRange(globalData, d => d.YEAR);
        if (yearVal !== "All") {
            fallback = fallback.filter(d => d.YEAR === +yearVal);
        }
        filtered = fallback
            .filter(d => d.LOCATION && d.LOCATION !== "Unknown" && d.LOCATION !== "All regions")
            .map(d => ({ LOCATION: d.LOCATION, COUNT: d.COUNT }));
    }

    const container = d3.select("#remoteness-chart");
    container.html("");

    if (filtered.length === 0) {
        container.append("div")
            .style("text-align", "center")
            .style("padding", "40px")
            .style("color", "#666")
            .text("No detailed location data available for the selected year. Try 2023 or 2024.");
        return;
    }

    const byLocation = d3.rollups(
        filtered,
        v => d3.sum(v, d => d.COUNT),
        d => d.LOCATION
    ).sort((a, b) => b[1] - a[1]);

    const { width, height } = getChartSize(container, 360);
    const margin = { top: 30, right: 40, bottom: 50, left: 160 };

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const y = d3.scaleBand()
        .domain(byLocation.map(d => d[0]))
        .range([margin.top, height - margin.bottom])
        .padding(0.2);

    const x = d3.scaleLinear()
        .domain([0, d3.max(byLocation, d => d[1]) || 0])
        .nice()
        .range([margin.left, width - margin.right]);

    const color = d3.scaleOrdinal()
        .domain(byLocation.map(d => d[0]))
        .range(d3.schemeTableau10);

    const showRemotenessTooltip = (event, d) => {
         const rect = event.currentTarget.getBoundingClientRect();
         tooltip.style("opacity", 1)
            .html(`
                    <strong>${d[0]}</strong><br>
                    <strong>Positive tests:</strong> ${d[1].toLocaleString()}<br>
                    <strong>Year:</strong> ${yearVal === "All" ? "2023–2024" : yearVal}
                `)
            .style("left", ((event.pageX) || rect.x + rect.width / 2) + "px")
            .style("top", ((event.pageY) || rect.y - 10) + "px");
    };

    const remotenessBars = svg.selectAll("rect.bar")
        .data(byLocation)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d[0]))
        .attr("x", x(0))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d[1]) - x(0))
        .attr("fill", d => color(d[0]))
        .on("mousemove", showRemotenessTooltip)
        .on("mouseout", () => tooltip.style("opacity", 0));

    addAccessibleInteraction(remotenessBars, d => `${d[0]} remoteness, ${formatNumber(d[1])} positive tests`, showRemotenessTooltip);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    addAxisLabels(svg, width, height, margin, "Positive tests", "Remoteness Area");
}
// Advanced Data Analysis Functions for Enhanced Insights

function calculateTrendAnalysis(data) {
    const years = uniqueSorted(data.map(d => d.YEAR));
    const trendData = years.map(year => {
        const yearData = data.filter(d => d.YEAR === year);
        return {
            year,
            total: d3.sum(yearData, d => d.COUNT),
            jurisdictions: uniqueSorted(yearData.map(d => d.JURISDICTION)).length
        };
    });

    // Calculate trend direction
    const recentYears = trendData.slice(-3);
    const earlierYears = trendData.slice(0, 3);
    const recentAvg = d3.mean(recentYears, d => d.total);
    const earlierAvg = d3.mean(earlierYears, d => d.total);
    const trendDirection = recentAvg > earlierAvg ? 'increasing' : 'decreasing';
    const trendStrength = Math.abs((recentAvg - earlierAvg) / earlierAvg) * 100;

    return {
        trendData,
        trendDirection,
        trendStrength,
        peakYear: trendData.reduce((max, d) => d.total > max.total ? d : max, trendData[0]),
        growthRate: trendData.length > 1 ? 
            ((trendData[trendData.length - 1].total - trendData[0].total) / trendData[0].total) * 100 : 0
    };
}

function calculateSubstanceEvolution(data) {
    const evolution = drugTypes.map(drug => {
        const drugData = data.filter(d => d[drug] === 1);
        const byYear = d3.rollup(drugData, v => d3.sum(v, d => d.COUNT), d => d.YEAR);
        
        const yearCounts = Array.from(byYear, ([year, count]) => ({ year, count }))
            .sort((a, b) => a.year - b.year);
            
        // Calculate trend for this substance
        const recentYears = yearCounts.slice(-3);
        const earlierYears = yearCounts.slice(0, 3);
        const recentAvg = d3.mean(recentYears, d => d.count) || 0;
        const earlierAvg = d3.mean(earlierYears, d => d.count) || 0;
        const trend = recentAvg > earlierAvg ? 'rising' : 'declining';
        
        return {
            drug,
            data: yearCounts,
            trend,
            peak: yearCounts.reduce((max, d) => d.count > max.count ? d : max, { count: 0 }),
            total: d3.sum(yearCounts, d => d.count)
        };
    });
    
    return evolution;
}

function calculateJurisdictionProfiles(data) {
    const profiles = d3.rollup(data, v => {
        const total = d3.sum(v, d => d.COUNT);
        const arrests = d3.sum(v, d => d.ARRESTS);
        const fines = d3.sum(v, d => d.FINES);
        const charges = d3.sum(v, d => d.CHARGES);
        
        // Calculate drug diversity
        const drugTypesDetected = new Set();
        v.forEach(d => {
            drugTypes.forEach(drug => {
                if (d[drug] === 1) drugTypesDetected.add(drug);
            });
        });
        
        // Calculate efficiency metrics
        const arrestRate = total > 0 ? (arrests / total) * 100 : 0;
        const finePerTest = total > 0 ? fines / total : 0;
        const chargePerArrest = arrests > 0 ? (charges / arrests) * 100 : 0;
        
        // Calculate age distribution
        const ageDistribution = d3.rollup(v, v2 => d3.sum(v2, d => d.COUNT), d => d.AGE_GROUP);
        
        return {
            total,
            arrests,
            fines,
            charges,
            arrestRate,
            finePerTest,
            chargePerArrest,
            drugDiversity: drugTypesDetected.size,
            ageDistribution: Array.from(ageDistribution, ([age, count]) => ({ age, count })),
            drugProfile: drugTypes.map(drug => ({
                drug,
                count: d3.sum(v, d => (d[drug] === 1 ? d.COUNT : 0)),
                percentage: total > 0 ? (d3.sum(v, d => (d[drug] === 1 ? d.COUNT : 0)) / total) * 100 : 0
            }))
        };
    }, d => d.JURISDICTION);
    
    return Array.from(profiles, ([jurisdiction, profile]) => ({ jurisdiction, ...profile }));
}

function generateInsights(data) {
    const trendAnalysis = calculateTrendAnalysis(data);
    const substanceEvolution = calculateSubstanceEvolution(data);
    const jurisdictionProfiles = calculateJurisdictionProfiles(data);
    
    // Generate key insights
    const insights = [];
    
    // Trend insights
    if (trendAnalysis.trendDirection === 'increasing') {
        insights.push({
            type: 'trend',
            level: 'high',
            title: 'Rising Enforcement Activity',
            description: `Positive tests have increased by ${trendAnalysis.trendStrength.toFixed(1)}% in recent years, with ${trendAnalysis.growthRate.toFixed(1)}% overall growth since ${trendAnalysis.trendData[0].year}.`,
            recommendation: 'Consider resource allocation to handle increased volume and analyze underlying causes.'
        });
    }
    
    // Substance insights
    const dominantDrug = substanceEvolution.reduce((max, d) => d.total > max.total ? d : max, substanceEvolution[0]);
    const risingDrug = substanceEvolution.filter(d => d.trend === 'rising').sort((a, b) => b.total - a.total)[0];
    
    insights.push({
        type: 'substance',
        level: 'medium',
        title: 'Substance Patterns',
        description: `${dominantDrug.drug} remains the most detected substance (${dominantDrug.total.toLocaleString()} tests), while ${risingDrug.drug} shows concerning growth trends.`,
        recommendation: 'Target enforcement and education programs toward rising substances.'
    });
    
    // Jurisdiction insights
    const highestArrestRate = jurisdictionProfiles.reduce((max, d) => d.arrestRate > max.arrestRate ? d : max, jurisdictionProfiles[0]);
    const mostDiverse = jurisdictionProfiles.reduce((max, d) => d.drugDiversity > max.drugDiversity ? d : max, jurisdictionProfiles[0]);
    
    insights.push({
        type: 'jurisdiction',
        level: 'medium',
        title: 'Regional Variations',
        description: `${highestArrestRate.jurisdiction} has the highest arrest rate (${highestArrestRate.arrestRate.toFixed(1)}%), while ${mostDiverse.jurisdiction} shows the most diverse substance profile (${mostDiverse.drugDiversity} types).`,
        recommendation: 'Share best practices between jurisdictions and tailor approaches to local patterns.'
    });
    
    return {
        trendAnalysis,
        substanceEvolution,
        jurisdictionProfiles,
        insights
    };
}

// Creative Visualization Functions

function renderRadialChart() {
    const container = d3.select("#radial-chart");
    container.html("");

    const { width, height } = getChartSize(container, 600);
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Aggregate data by YEAR using uppercase fields from the cleaned dataset
    const baseData = filterByYearRange(globalData, d => d.YEAR);
    const byYear = d3.rollups(
        baseData,
        v => d3.sum(v, d => d.COUNT),
        d => d.YEAR
    ).map(([year, count]) => ({ year, count }))
     .sort((a, b) => a.year - b.year);

    if (!byYear.length) {
        renderEmptyState(container, "No radial data for selected filters.");
        return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 80;
    const minRadius = 60;

    const maxCount = d3.max(byYear, d => d.count) || 1;
    const angleScale = d3.scaleLinear()
        .domain([0, byYear.length])
        .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([minRadius, maxRadius]);

    const colorScale = d3.scaleOrdinal(creativePalettes.vibrant);

    // Draw circular grid
    for (let i = 1; i <= 5; i++) {
        const radius = minRadius + (maxRadius - minRadius) * i / 5;
        svg.append("circle")
            .attr("cx", centerX)
            .attr("cy", centerY)
            .attr("r", radius)
            .attr("fill", "none")
            .attr("stroke", "#e0e0e0")
            .attr("stroke-width", 1);
    }

    // Draw radial segments
    const segments = svg.selectAll(".segment")
        .data(byYear)
        .enter()
        .append("g")
        .attr("class", "segment");

    segments.each(function(d, i) {
        const angle = angleScale(i) - Math.PI / 2;
        const nextAngle = angleScale(i + 1) - Math.PI / 2;
        const radius = radiusScale(d.count);

        // Create filled segment
        const points = [
            [centerX, centerY],
            [centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)],
            [centerX + radius * Math.cos(nextAngle), centerY + radius * Math.sin(nextAngle)]
        ];

        d3.select(this)
            .append("polygon")
            .attr("points", points.map(p => p.join(",")).join(" "))
            .attr("fill", colorScale(i))
            .attr("fill-opacity", 0.7)
            .attr("stroke", colorScale(i))
            .attr("stroke-width", 2)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 1)
                    .html(`<strong>Year:</strong> ${d.year}<br><strong>Count:</strong> ${d.count.toLocaleString()}`);
            })
            .on("mouseout", () => tooltip.style("opacity", 0));

        // Add year label
        const labelRadius = maxRadius + 20;
        const labelX = centerX + labelRadius * Math.cos(angle);
        const labelY = centerY + labelRadius * Math.sin(angle);

        svg.append("text")
            .attr("x", labelX)
            .attr("y", labelY)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#333")
            .text(d.year);
    });

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .text("Radial Trend: Drug Enforcement Over Time");
}

function renderBubbleChart() {
    const year = d3.select("#bubble-year").property("value");
    const container = d3.select("#bubble-chart");
    container.html("");

    const { width, height } = getChartSize(container, 500);
    const margin = { top: 60, right: 150, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Filter and aggregate data using uppercase metric fields
    const baseData = filterByYearRange(globalData, d => d.YEAR);
    const filtered = year === "All" ? baseData : baseData.filter(d => d.YEAR === +year);
    const byJurisdiction = d3.rollup(filtered,
        v => ({
            count: d3.sum(v, d => d.COUNT),
            fines: d3.sum(v, d => d.FINES),
            arrests: d3.sum(v, d => d.ARRESTS),
            charges: d3.sum(v, d => d.CHARGES)
        }),
        d => d.JURISDICTION
    );

    const data = Array.from(byJurisdiction, ([jurisdiction, values]) => ({
        jurisdiction,
        ...values
    }));

    if (!data.length) {
        renderEmptyState(container, "No bubble chart data for selected filters.");
        return;
    }

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.fines) || 1])
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count) || 1])
        .range([innerHeight, 0]);

    const rScale = d3.scaleSqrt()
        .domain([0, d3.max(data, d => d.arrests) || 1])
        .range([10, 40]);

    const colorScale = d3.scaleOrdinal(creativePalettes.vibrant)
        .domain(data.map(d => d.jurisdiction));

    // Add force simulation for better bubble positioning
    const simulation = d3.forceSimulation(data)
        .force("x", d3.forceX(d => xScale(d.fines)).strength(0.8))
        .force("y", d3.forceY(d => yScale(d.count)).strength(0.8))
        .force("collide", d3.forceCollide(d => rScale(d.arrests) + 2))
        .stop();

    for (let i = 0; i < 120; ++i) simulation.tick();

    // Create gradient definitions for advanced visual effects
    const defs = svg.append("defs");
    
    data.forEach((d, i) => {
        const gradient = defs.append("radialGradient")
            .attr("id", `bubble-gradient-${i}`);
        
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", colorScale(d.jurisdiction))
            .attr("stop-opacity", 0.8);
            
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", colorScale(d.jurisdiction))
            .attr("stop-opacity", 0.3);
    });

    // Add interactive bubbles with advanced tooltips
    const bubbles = g.selectAll(".bubble")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "bubble");

    bubbles.append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 0)
        .attr("fill", (d, i) => `url(#bubble-gradient-${i})`)
        .attr("stroke", d => colorScale(d.jurisdiction))
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", rScale(d.arrests) * 1.2)
                .attr("stroke-width", 3);
                
            tooltip.style("opacity", 1)
                .html(`
                    <strong>${d.jurisdiction}</strong><br>
                    <strong>Positive Tests:</strong> ${d.count.toLocaleString()}<br>
                    <strong>Fines:</strong> ${d.fines.toLocaleString()}<br>
                    <strong>Arrests:</strong> ${d.arrests.toLocaleString()}<br>
                    <strong>Charges:</strong> ${d.charges.toLocaleString()}<br>
                    <strong>Year:</strong> ${year === "All" ? "All years" : year}
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", rScale(d.arrests))
                .attr("stroke-width", 2);
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            // Cross-filter with other charts
            d3.select("#trend-jurisdiction").property("value", d.jurisdiction).dispatch("change");
            d3.select("#drugtype-jurisdiction").property("value", d.jurisdiction).dispatch("change");
        })
        .transition()
        .duration(800)
        .ease(d3.easeElastic.period(0.4))
        .attr("r", d => rScale(d.arrests));

    // Add jurisdiction labels
    bubbles.append("text")
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("fill", "white")
        .attr("pointer-events", "none")
        .style("opacity", 0)
        .text(d => d.jurisdiction)
        .transition()
        .delay(800)
        .duration(400)
        .style("opacity", 1);

    // Add axes with enhanced styling
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.format(".0s"))
        .tickSize(-innerHeight);
        
    const yAxis = d3.axisLeft(yScale)
        .tickFormat(d3.format(".0s"))
        .tickSize(-innerWidth);

    g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis)
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.3);

    g.append("g")
        .attr("class", "grid")
        .call(yAxis)
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.3);

    // Add axis labels
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (innerHeight / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#4b5563")
        .text("Positive Tests");

    g.append("text")
        .attr("transform", `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#4b5563")
        .text("Fines Issued");

    // Add annotations for key insights
    const maxArrests = data.reduce((max, d) => d.arrests > max.arrests ? d : max, data[0]);
    if (maxArrests) {
        const annotation = g.append("g")
            .attr("class", "annotation");
            
        annotation.append("line")
            .attr("x1", maxArrests.x)
            .attr("y1", maxArrests.y)
            .attr("x2", maxArrests.x + 60)
            .attr("y2", maxArrests.y - 40)
            .attr("stroke", "#ef4444")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,3")
            .style("opacity", 0)
            .transition()
            .delay(1200)
            .duration(600)
            .style("opacity", 1);
            
        annotation.append("text")
            .attr("x", maxArrests.x + 65)
            .attr("y", maxArrests.y - 45)
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .attr("fill", "#ef4444")
            .style("opacity", 0)
            .text(`Highest arrests: ${maxArrests.jurisdiction}`)
            .transition()
            .delay(1200)
            .duration(600)
            .style("opacity", 1);
    }
}

    const sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(data, d => d.arrests) || 1])
        .range([10, 50]);

    const bubbleColorScale = d3.scaleOrdinal(creativePalettes.warm);

    // Draw axes
    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

    g.append("g")
        .call(d3.axisLeft(yScale));

    // Draw bubbles
    const bubbles = g.selectAll(".bubble")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "bubble");

    bubbles.append("circle")
        .attr("cx", d => xScale(d.fines))
        .attr("cy", d => yScale(d.count))
        .attr("r", d => sizeScale(d.arrests))
        .attr("fill", (d, i) => colorScale(i))
        .attr("fill-opacity", 0.6)
        .attr("stroke", (d, i) => colorScale(i))
        .attr("stroke-width", 2)
        .on("mouseover", function(event, d) {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.jurisdiction}</strong><br>
                       <strong>Fines:</strong> ${d.fines.toLocaleString()}<br>
                       <strong>Positive tests:</strong> ${d.count.toLocaleString()}<br>
                       <strong>Arrests:</strong> ${d.arrests.toLocaleString()}`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    bubbles.append("text")
        .attr("x", d => xScale(d.fines))
        .attr("y", d => yScale(d.count))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "10px")
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .text(d => d.jurisdiction);

    // Add labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .text(`Bubble Chart: Enforcement Metrics (${year === "All" ? "All years" : year})`);

    addAxisLabels(svg, width, height, margin, "Fines", "Positive tests");
}

function renderRadarChart() {
    const year = d3.select("#radar-year").property("value");
    const container = d3.select("#radar-chart");
    container.html("");

    const { width, height } = getChartSize(container, 500);
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Filter and aggregate data with enhanced metrics
    const baseData = filterByYearRange(globalData, d => d.YEAR);
    const filtered = year === "All" ? baseData : baseData.filter(d => d.YEAR === +year);
    
    // Calculate additional metrics for advanced analysis
    const byJurisdiction = d3.rollup(filtered,
        v => {
            const count = d3.sum(v, d => d.COUNT);
            const fines = d3.sum(v, d => d.FINES);
            const arrests = d3.sum(v, d => d.ARRESTS);
            const charges = d3.sum(v, d => d.CHARGES);
            
            // Calculate derived metrics
            const arrestRate = count > 0 ? (arrests / count) * 100 : 0;
            const fineRate = count > 0 ? (fines / count) : 0;
            const chargeRate = arrests > 0 ? (charges / arrests) * 100 : 0;
            
            // Calculate drug diversity (number of different drug types detected)
            const drugTypesDetected = new Set();
            v.forEach(d => {
                drugTypes.forEach(drug => {
                    if (d[drug] === 1) drugTypesDetected.add(drug);
                });
            });
            
            return {
                count,
                fines,
                arrests,
                charges,
                arrestRate,
                fineRate,
                chargeRate,
                drugDiversity: drugTypesDetected.size
            };
        },
        d => d.JURISDICTION
    );

    const data = Array.from(byJurisdiction, ([jurisdiction, values]) => ({
        jurisdiction,
        ...values
    }));

    if (!data.length) {
        renderEmptyState(container, "No radar chart data for selected filters.");
        return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 80;

    // Enhanced metrics for comprehensive analysis
    const metrics = [
        { key: 'count', label: 'Tests', weight: 1 },
        { key: 'arrestRate', label: 'Arrest Rate %', weight: 2 },
        { key: 'fineRate', label: 'Fine per Test', weight: 50 },
        { key: 'chargeRate', label: 'Charge Rate %', weight: 1 },
        { key: 'drugDiversity', label: 'Drug Types', weight: 20 }
    ];
    
    const angleSlice = (Math.PI * 2) / metrics.length;

    // Normalize metrics to 0-100 scale for fair comparison
    const scales = {};
    metrics.forEach(metric => {
        const values = data.map(d => d[metric.key]);
        scales[metric.key] = d3.scaleLinear()
            .domain([0, d3.max(values) || 1])
            .range([0, 100]);
    });

    const colorScale = d3.scaleOrdinal(creativePalettes.vibrant)
        .domain(data.map(d => d.jurisdiction));

    // Create advanced radar grid with gradient
    const defs = svg.append("defs");
    const gridGradient = defs.append("radialGradient")
        .attr("id", "radar-grid-gradient");
    gridGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#f0f9ff")
        .attr("stop-opacity", 0.3);
    gridGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#0284c7")
        .attr("stop-opacity", 0.1);

    // Draw enhanced radar grid
    for (let level = 1; level <= 5; level++) {
        const levelRadius = (radius / 5) * level;
        const points = metrics.map((_, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            return [
                centerX + levelRadius * Math.cos(angle),
                centerY + levelRadius * Math.sin(angle)
            ];
        });

        svg.append("polygon")
            .attr("points", points.map(p => p.join(",")).join(" "))
            .attr("fill", level === 5 ? "url(#radar-grid-gradient)" : "none")
            .attr("fill-opacity", level === 5 ? 0.5 : 0)
            .attr("stroke", level === 5 ? "#0284c7" : "#e0e0e0")
            .attr("stroke-width", level === 5 ? 2 : 1)
            .attr("stroke-dasharray", level === 5 ? "0" : "2,2");
    }

    // Draw enhanced axes with labels
    metrics.forEach((metric, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        // Main axis line
        svg.append("line")
            .attr("x1", centerX)
            .attr("y1", centerY)
            .attr("x2", x)
            .attr("y2", y)
            .attr("stroke", "#94a3b8")
            .attr("stroke-width", 1.5);

        // Add percentage labels on axes
        for (let level = 1; level <= 4; level++) {
            const labelRadius = (radius / 5) * level;
            const labelX = centerX + labelRadius * Math.cos(angle);
            const labelY = centerY + labelRadius * Math.sin(angle);
            
            svg.append("text")
                .attr("x", labelX)
                .attr("y", labelY)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("font-size", "9px")
                .attr("fill", "#64748b")
                .text(`${level * 20}%`);
        }

        // Enhanced axis labels
        const labelX = centerX + (radius + 30) * Math.cos(angle);
        const labelY = centerY + (radius + 30) * Math.sin(angle);
        
        const labelGroup = svg.append("g")
            .attr("transform", `translate(${labelX}, ${labelY})`);
            
        labelGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .attr("fill", "#1e293b")
            .text(metric.label);
            
        // Add metric weight indicator
        labelGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "hanging")
            .attr("font-size", "8px")
            .attr("fill", "#64748b")
            .attr("y", 12)
            .text(`weight: ${metric.weight}`);
    });

    // Draw data polygons with advanced interactions
    const radarGroups = svg.selectAll(".radar-group")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "radar-group");

    radarGroups.each(function(d, index) {
        const points = metrics.map((metric, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const normalizedValue = scales[metric.key](d[metric.key]);
            const value = (normalizedValue / 100) * radius;
            return [
                centerX + value * Math.cos(angle),
                centerY + value * Math.sin(angle)
            ];
        });

        // Create gradient for each jurisdiction
        const gradient = defs.append("radialGradient")
            .attr("id", `radar-gradient-${index}`);
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", colorScale(d.jurisdiction))
            .attr("stop-opacity", 0.4);
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", colorScale(d.jurisdiction))
            .attr("stop-opacity", 0.1);

        // Animated polygon entrance
        const polygon = d3.select(this)
            .append("polygon")
            .attr("points", points.map(p => p.join(",")).join(" "))
            .attr("fill", `url(#radar-gradient-${index})`)
            .attr("stroke", colorScale(d.jurisdiction))
            .attr("stroke-width", 2)
            .attr("stroke-linejoin", "round")
            .style("cursor", "pointer")
            .style("opacity", 0)
            .on("mouseover", function(event, data) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("fill-opacity", 0.7)
                    .attr("stroke-width", 4)
                    .attr("filter", "drop-shadow(0 0 8px rgba(0,0,0,0.3))");
                    
                // Enhanced tooltip with all metrics
                const tooltipContent = `
                    <strong>${data.jurisdiction}</strong><br>
                    <strong>Tests:</strong> ${data.count.toLocaleString()}<br>
                    <strong>Arrest Rate:</strong> ${data.arrestRate.toFixed(1)}%<br>
                    <strong>Fine per Test:</strong> $${data.fineRate.toFixed(2)}<br>
                    <strong>Charge Rate:</strong> ${data.chargeRate.toFixed(1)}%<br>
                    <strong>Drug Types:</strong> ${data.drugDiversity}<br>
                    <strong>Year:</strong> ${year === "All" ? "All years" : year}
                `;
                
                tooltip.style("opacity", 1)
                    .html(tooltipContent)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
                    
                // Highlight corresponding data points
                d3.selectAll(".radar-point")
                    .filter(point => point.jurisdiction === data.jurisdiction)
                    .transition()
                    .duration(200)
                    .attr("r", 6);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("fill-opacity", 0.4)
                    .attr("stroke-width", 2)
                    .attr("filter", "none");
                tooltip.style("opacity", 0);
                
                // Reset data points
                d3.selectAll(".radar-point")
                    .transition()
                    .duration(200)
                    .attr("r", 4);
            })
            .on("click", function(event, d) {
                // Cross-filter functionality
                d3.select("#trend-jurisdiction").property("value", d.jurisdiction).dispatch("change");
                d3.select("#drugtype-jurisdiction").property("value", d.jurisdiction).dispatch("change");
            });

        // Animate entrance
        polygon.transition()
            .delay(index * 200)
            .duration(800)
            .ease(d3.easeBackOut.overshoot(1.2))
            .style("opacity", 1);

        // Add enhanced data points with animations
        metrics.forEach((metric, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const normalizedValue = scales[metric.key](d[metric.key]);
            const value = (normalizedValue / 100) * radius;
            const x = centerX + value * Math.cos(angle);
            const y = centerY + value * Math.sin(angle);

            d3.select(this)
                .append("circle")
                .attr("class", "radar-point")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", 0)
                .attr("fill", colorScale(d.jurisdiction))
                .attr("stroke", "white")
                .attr("stroke-width", 2)
                .datum({ jurisdiction: d.jurisdiction, metric: metric.key, value: d[metric.key] })
                .transition()
                .delay(index * 200 + i * 100)
                .duration(400)
                .ease(d3.easeBackOut.overshoot(1.2))
                .attr("r", 4);
        });
    });

    // Enhanced legend with interactive features
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 140}, 20)`);

    data.forEach((d, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 22})`)
            .style("cursor", "pointer")
            .on("click", function() {
                // Toggle visibility of radar polygon
                const polygon = d3.selectAll(".radar-group polygon").filter((data, index) => index === i);
                const currentOpacity = polygon.style("opacity");
                polygon.style("opacity", currentOpacity === "0.3" ? 1 : 0.3);
            });

        legendRow.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", colorScale(d.jurisdiction))
            .attr("rx", 2);

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .attr("font-size", "12px")
            .attr("font-weight", "500")
            .attr("fill", "#374151")
            .text(d.jurisdiction);
            
        // Add mini-stats
        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 20)
            .attr("font-size", "9px")
            .attr("fill", "#6b7280")
            .text(`Score: ${Math.round(d3.mean(metrics.map(m => scales[m.key](d[m.key]))))}%`);
    });

    // Add title and subtitle
    svg.append("text")
        .attr("x", centerX)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "700")
        .attr("fill", "#1e293b")
        .text("Multi-Dimensional Enforcement Analysis");

    svg.append("text")
        .attr("x", centerX)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#64748b")
        .text(`Normalized comparison across ${metrics.length} key metrics`);
}
    const maxValues = {};
    metrics.forEach(metric => {
        maxValues[metric] = d3.max(Array.from(byJurisdiction.values()), d => d[metric]) || 1;
    });

    const colorScale = d3.scaleOrdinal(creativePalettes.cool);

    // Draw grid
    for (let level = 1; level <= 5; level++) {
        const levelRadius = (radius / 5) * level;
        const points = metrics.map((_, i) => {
            const angle = i * angleSlice - Math.PI / 2;
            return [
                centerX + levelRadius * Math.cos(angle),
                centerY + levelRadius * Math.sin(angle)
            ];
        });

        svg.append("polygon")
            .attr("points", points.map(p => p.join(",")).join(" "))
            .attr("fill", "none")
            .attr("stroke", "#e0e0e0")
            .attr("stroke-width", 1);
    }

    // Draw axes
    metrics.forEach((metric, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        svg.append("line")
            .attr("x1", centerX)
            .attr("y1", centerY)
            .attr("x2", x)
            .attr("y2", y)
            .attr("stroke", "#e0e0e0")
            .attr("stroke-width", 1);

        // Add metric labels
        const labelX = centerX + (radius + 30) * Math.cos(angle);
        const labelY = centerY + (radius + 30) * Math.sin(angle);

        svg.append("text")
            .attr("x", labelX)
            .attr("y", labelY)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#333")
            .text(metric.charAt(0).toUpperCase() + metric.slice(1));
    });

    // Draw data for each jurisdiction
    jurisdictions.forEach((jurisdiction, jIndex) => {
        const data = byJurisdiction.get(jurisdiction);
        const points = metrics.map((metric, i) => {
            const angle = i * angleSlice - Math.PI / 2;
            const value = data[metric] / maxValues[metric];
            const r = radius * value;
            return [
                centerX + r * Math.cos(angle),
                centerY + r * Math.sin(angle)
            ];
        });

        svg.append("polygon")
            .attr("points", points.map(p => p.join(",")).join(" "))
            .attr("fill", colorScale(jIndex))
            .attr("fill-opacity", 0.3)
            .attr("stroke", colorScale(jIndex))
            .attr("stroke-width", 2);
    });

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 150}, 100)`);

    jurisdictions.forEach((jurisdiction, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 25})`);

        legendRow.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", colorScale(i));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .attr("font-size", "12px")
            .attr("fill", "#333")
            .text(jurisdiction);
    });

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .text(`Radar Chart: Jurisdiction Comparison (${year === "All" ? "All years" : year})`);
}

function renderStreamGraph() {
    const container = d3.select("#stream-chart");
    container.html("");

    const { width, height } = getChartSize(container, 400);
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Prepare enhanced data with smoothing
    const baseData = filterByYearRange(globalData, d => d.YEAR);
    const years = uniqueSorted(baseData.map(d => d.YEAR));
    
    if (!years.length) {
        renderEmptyState(container, "No stream data for selected filters.");
        return;
    }

    // Create enhanced stream data with interpolation for smoother flows
    const streamData = years.map(year => {
        const yearData = baseData.filter(d => d.YEAR === year);
        const row = { YEAR: year };
        drugTypes.forEach(drug => {
            row[drug] = d3.sum(yearData, d => (d[drug] === 1 ? d.COUNT : 0));
        });
        return row;
    });

    // Add interpolated data points for smoother animation
    const interpolatedData = [];
    for (let i = 0; i < streamData.length - 1; i++) {
        interpolatedData.push(streamData[i]);
        const current = streamData[i];
        const next = streamData[i + 1];
        const interpolated = { YEAR: current.YEAR + 0.5 };
        drugTypes.forEach(drug => {
            interpolated[drug] = (current[drug] + next[drug]) / 2;
        });
        interpolatedData.push(interpolated);
    }
    interpolatedData.push(streamData[streamData.length - 1]);

    const x = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(streamData, d => d3.sum(drugTypes, k => d[k])) || 0])
        .range([height - margin.bottom, margin.top]);

    // Enhanced color palette with gradients
    const color = d3.scaleOrdinal()
        .domain(drugTypes)
        .range(["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"]);

    // Create gradient definitions for each drug type
    const defs = svg.append("defs");
    drugTypes.forEach((drug, i) => {
        const gradient = defs.append("linearGradient")
            .attr("id", `stream-gradient-${i}`)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", margin.left)
            .attr("x2", width - margin.right);
            
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", color(drug))
            .attr("stop-opacity", 0.7);
            
        gradient.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", color(drug))
            .attr("stop-opacity", 0.9);
            
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", color(drug))
            .attr("stop-opacity", 0.7);
    });

    // Enhanced stream area generator with smooth curves
    const area = d3.area()
        .x(d => x(d.data.YEAR))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    // Use wiggle offset for better stream visualization
    const stack = d3.stack()
        .keys(drugTypes)
        .offset(d3.stackOffsetWiggle)
        .order(d3.stackOrderInsideOut);

    const series = stack(interpolatedData);

    // Create clip path for animation
    const clipPath = defs.append("clipPath")
        .attr("id", "stream-clip");
    clipPath.append("rect")
        .attr("x", margin.left)
        .attr("y", 0)
        .attr("width", width - margin.left - margin.right)
        .attr("height", height);

    // Draw enhanced streams with animations
    const streams = svg.selectAll(".stream")
        .data(series)
        .enter()
        .append("g")
        .attr("class", "stream");

    streams.append("path")
        .attr("class", "stream-area")
        .attr("clip-path", "url(#stream-clip)")
        .attr("fill", (d, i) => `url(#stream-gradient-${i})`)
        .attr("fill-opacity", 0.8)
        .attr("stroke", d => color(d.key))
        .attr("stroke-width", 1)
        .attr("stroke-linejoin", "round")
        .attr("d", area)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            // Highlight current stream
            d3.selectAll(".stream-area")
                .transition()
                .duration(200)
                .attr("fill-opacity", 0.4);
                
            d3.select(this)
                .transition()
                .duration(200)
                .attr("fill-opacity", 1)
                .attr("stroke-width", 3);
                
            // Enhanced tooltip with trend analysis
            const peakYear = d.reduce((max, layer) => {
                const value = layer[1] - layer[0];
                return value > max.value ? { year: layer.data.YEAR, value } : max;
            }, { year: 0, value: 0 });
            
            const totalValue = d3.sum(d, layer => layer[1] - layer[0]);
            const avgValue = totalValue / d.length;
            
            tooltip.style("opacity", 1)
                .html(`
                    <strong>${d.key}</strong><br>
                    <strong>Peak Year:</strong> ${Math.round(peakYear.year)}<br>
                    <strong>Peak Count:</strong> ${Math.round(peakYear.value).toLocaleString()}<br>
                    <strong>Average:</strong> ${Math.round(avgValue).toLocaleString()}<br>
                    <strong>Total:</strong> ${Math.round(totalValue).toLocaleString()}<br>
                    <strong>Trend:</strong> ${peakYear.year > years[years.length/2] ? '📈 Rising' : '📉 Declining'}
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.selectAll(".stream-area")
                .transition()
                .duration(200)
                .attr("fill-opacity", 0.8)
                .attr("stroke-width", 1);
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            // Filter other charts by this drug type
            d3.select("#age-drug").property("value", d.key).dispatch("change");
        });

    // Add animated entrance effect
    streams.each(function(d, i) {
        const path = d3.select(this).select(".stream-area");
        const length = path.node().getTotalLength();
        
        path
            .attr("stroke-dasharray", `${length} ${length}`)
            .attr("stroke-dashoffset", length)
            .transition()
            .delay(i * 200)
            .duration(1500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0)
            .on("end", function() {
                d3.select(this)
                    .attr("stroke-dasharray", "none");
            });
    });

    // Enhanced axes with better formatting
    const xAxis = d3.axisBottom(x)
        .tickFormat(d3.format("d"))
        .tickSize(-height + margin.top + margin.bottom);
        
    const yAxis = d3.axisLeft(y)
        .tickFormat(d3.format(".0s"))
        .tickSize(-width + margin.left + margin.right);

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis)
        .style("stroke-dasharray", "2,2")
        .style("opacity", 0.3);

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis)
        .style("stroke-dasharray", "2,2")
        .style("opacity", 0.3);

    // Add axis labels
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#4b5563")
        .text("Positive Tests");

    svg.append("text")
        .attr("transform", `translate(${width / 2}, ${height - 10})`)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#4b5563")
        .text("Year");

    // Enhanced legend with interactive features
    const legendContainer = container.append("div")
        .attr("class", "legend")
        .style("margin-top", "20px");

    const legend = legendContainer.selectAll(".legend-item")
        .data(drugTypes)
        .enter()
        .append("div")
        .attr("class", "legend-item")
        .style("cursor", "pointer")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("margin", "4px")
        .style("display", "inline-block")
        .style("transition", "all 0.3s ease")
        .on("click", function(event, drug) {
            // Toggle stream visibility
            const stream = d3.selectAll(".stream").filter(d => d.key === drug);
            const currentOpacity = stream.select(".stream-area").style("fill-opacity");
            const newOpacity = currentOpacity === "0.1" ? 0.8 : 0.1;
            stream.select(".stream-area").style("fill-opacity", newOpacity);
            
            // Update legend styling
            d3.selectAll(".legend-item")
                .style("background-color", "#f9fafb")
                .style("border", "1px solid #e5e7eb");
            d3.select(this)
                .style("background-color", newOpacity === 0.8 ? "#eff6ff" : "#f3f4f6")
                .style("border", `2px solid ${color(drug)}`);
        })
        .on("mouseover", function(event, drug) {
            d3.select(this)
                .style("background-color", "#eff6ff")
                .style("transform", "translateY(-2px)");
        })
        .on("mouseout", function(event, drug) {
            d3.select(this)
                .style("background-color", "#f9fafb")
                .style("transform", "translateY(0px)");
        });

    legend.append("div")
        .attr("class", "legend-swatch")
        .style("display", "inline-block")
        .style("width", "12px")
        .style("height", "12px")
        .style("border-radius", "2px")
        .style("margin-right", "8px")
        .style("vertical-align", "middle")
        .style("background-color", d => color(d));

    legend.append("span")
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("color", "#374151")
        .text(d => d);

    // Add title and subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "700")
        .attr("fill", "#1f2937")
        .text("Temporal Flow of Substance Detection");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 38)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#6b7280")
        .text("Smoothed visualization showing evolution and trends over time");
}
    const stackedRows = years.map(year => {
        const row = { YEAR: year };
        const yearData = filteredData.filter(d => d.YEAR === year);
        drugTypes.forEach(drug => {
            row[drug] = d3.sum(yearData, d => (d[drug] === 1 ? d.COUNT : 0));
        });
        return row;
    });

    const stackedData = d3.stack()
        .keys(drugTypes)(stackedRows);

    const xScale = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(stackedData, d => d3.max(d, dd => dd[1])) || 1])
        .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal(creativePalettes.gradient);

    const area = d3.area()
        .x(d => xScale(d.data.YEAR))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveCatmullRom);

    g.selectAll(".stream")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", "stream")
        .attr("d", area)
        .attr("fill", d => colorScale(d.key))
        .attr("fill-opacity", 0.7)
        .attr("stroke", d => colorScale(d.key))
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.key}</strong>`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    // Axes
    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .text("Stream Graph: Drug Type Evolution");

    // Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 140}, 100)`);

    drugTypes.forEach((drug, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 25})`);

        legendRow.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", colorScale(drug));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .attr("font-size", "12px")
            .attr("fill", "#333")
            .text(drug.charAt(0) + drug.slice(1).toLowerCase());
    });
}

function renderAnimatedTimeline() {
    const container = d3.select("#timeline-chart");
    container.html("");

    const { width, height } = getChartSize(container, 500);
    const margin = { top: 50, right: 60, bottom: 80, left: 90 };

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const baseData = filterByYearRange(globalData, d => d.YEAR);
    const years = uniqueSorted(baseData.map(d => d.YEAR));
    
    if (!years.length) {
        renderEmptyState(container, "No timeline data for selected filters.");
        return;
    }

    // Enhanced animation state
    let isPlaying = false;
    let currentYearIndex = 0;
    let animationSpeed = 1500;
    let transitionProgress = 0;

    const x = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(baseData, d => d.COUNT) || 0])
        .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal(creativePalettes.vibrant)
        .domain(drugTypes);

    // Create advanced gradient definitions
    const defs = svg.append("defs");
    
    // Time-based gradient for background
    const timeGradient = defs.append("linearGradient")
        .attr("id", "time-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right);
    
    timeGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#dbeafe")
        .attr("stop-opacity", 0.3);
    timeGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#1e40af")
        .attr("stop-opacity", 0.1);

    // Create main visualization group
    const mainGroup = svg.append("g")
        .attr("class", "timeline-main");

    // Add background with gradient
    mainGroup.append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "url(#time-gradient)")
        .attr("rx", 8);

    // Enhanced axes with better styling
    const xAxis = d3.axisBottom(x)
        .tickFormat(d3.format("d"))
        .tickSize(-height + margin.top + margin.bottom);
        
    const yAxis = d3.axisLeft(y)
        .tickFormat(d3.format(".0s"))
        .tickSize(-width + margin.left + margin.right);

    mainGroup.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis)
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.2);

    mainGroup.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis)
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.2);

    // Add axis labels
    mainGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#4b5563")
        .text("Positive Tests");

    mainGroup.append("text")
        .attr("transform", `translate(${width / 2}, ${height - 20})`)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#4b5563")
        .text("Year");

    // Create timeline visualization group
    const timelineGroup = mainGroup.append("g")
        .attr("class", "timeline-group");

    // Pre-compute all year data for smooth transitions
    const yearDataMap = new Map();
    years.forEach(year => {
        const yearData = baseData.filter(d => d.YEAR === year);
        const aggregated = d3.rollup(yearData,
            v => d3.sum(v, d => d.COUNT),
            d => d.JURISDICTION
        );
        yearDataMap.set(year, Array.from(aggregated, ([jur, count]) => ({ jurisdiction: jur, count })));
    });

    // Enhanced year indicator with animation
    const yearIndicator = timelineGroup.append("g")
        .attr("class", "year-indicator");

    yearIndicator.append("line")
        .attr("class", "year-line")
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 3)
        .attr("stroke-linecap", "round");

    yearIndicator.append("rect")
        .attr("class", "year-label-bg")
        .attr("x", -40)
        .attr("y", margin.top - 35)
        .attr("width", 80)
        .attr("height", 28)
        .attr("rx", 14)
        .attr("fill", "#ef4444");

    yearIndicator.append("text")
        .attr("class", "year-label")
        .attr("y", margin.top - 18)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "700")
        .attr("fill", "white");

    // Create jurisdiction bars for each year
    const jurisdictionGroups = timelineGroup.selectAll(".jurisdiction-group")
        .data(drugTypes)
        .enter()
        .append("g")
        .attr("class", "jurisdiction-group");

    // Enhanced animation controls
    const controlsContainer = container.append("div")
        .style("margin-top", "20px")
        .style("text-align", "center")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("align-items", "center")
        .style("gap", "15px");

    // Play/Pause button with enhanced styling
    const playPauseBtn = controlsContainer.append("button")
        .attr("id", "play-pause-btn")
        .style("padding", "10px 20px")
        .style("border", "none")
        .style("border-radius", "8px")
        .style("background", "#3b82f6")
        .style("color", "white")
        .style("font-weight", "600")
        .style("cursor", "pointer")
        .style("transition", "all 0.3s ease")
        .text("▶ Play")
        .on("click", toggleAnimation)
        .on("mouseover", function() {
            d3.select(this).style("background", "#2563eb").style("transform", "translateY(-2px)");
        })
        .on("mouseout", function() {
            d3.select(this).style("background", "#3b82f6").style("transform", "translateY(0px)");
        });

    // Speed control
    controlsContainer.append("label")
        .style("font-weight", "600")
        .style("color", "#4b5563")
        .text("Speed:");

    const speedSlider = controlsContainer.append("input")
        .attr("type", "range")
        .attr("min", 500)
        .attr("max", 3000)
        .attr("step", 100)
        .attr("value", animationSpeed)
        .style("width", "120px")
        .on("input", function() {
            animationSpeed = +this.value;
        });

    const speedLabel = controlsContainer.append("span")
        .style("font-weight", "500")
        .style("color", "#6b7280")
        .style("min-width", "60px")
        .text(`${animationSpeed}ms`);

    speedSlider.on("input", function() {
        speedLabel.text(`${this.value}ms`);
    });

    // Year slider for manual control
    const yearSliderContainer = container.append("div")
        .style("margin-top", "15px")
        .style("text-align", "center");

    yearSliderContainer.append("label")
        .style("font-weight", "600")
        .style("color", "#4b5563")
        .style("margin-right", "10px")
        .text("Year:");

    const yearSlider = yearSliderContainer.append("input")
        .attr("type", "range")
        .attr("min", 0)
        .attr("max", years.length - 1)
        .attr("step", 1)
        .attr("value", 0)
        .style("width", "200px")
        .on("input", function() {
            currentYearIndex = +this.value;
            if (!isPlaying) {
                updateTimelineVisualization(years[currentYearIndex]);
            }
        });

    const yearDisplay = yearSliderContainer.append("span")
        .style("font-weight", "700")
        .style("color", "#1f2937")
        .style("margin-left", "10px")
        .style("min-width", "50px")
        .text(years[0]);

    // Enhanced animation functions
    function toggleAnimation() {
        isPlaying = !isPlaying;
        playPauseBtn.text(isPlaying ? "⏸ Pause" : "▶ Play")
            .style("background", isPlaying ? "#ef4444" : "#3b82f6");
        
        if (isPlaying) {
            animateTimeline();
        }
    }

    function animateTimeline() {
        if (!isPlaying) return;
        
        if (currentYearIndex >= years.length) {
            currentYearIndex = 0; // Loop back to start
        }

        updateTimelineVisualization(years[currentYearIndex]);
        
        currentYearIndex++;
        yearSlider.property("value", currentYearIndex);
        
        setTimeout(() => animateTimeline(), animationSpeed);
    }

    function updateTimelineVisualization(year) {
        const yearData = yearDataMap.get(year) || [];
        
        // Update year indicator position with smooth transition
        yearIndicator.transition()
            .duration(300)
            .ease(d3.easeQuadInOut)
            .attr("transform", `translate(${x(year)}, 0)`);

        yearIndicator.select(".year-label")
            .text(year);

        // Clear previous bars
        timelineGroup.selectAll(".year-bar").remove();

        // Create animated bars for each jurisdiction
        const bars = timelineGroup.selectAll(".year-bar")
            .data(yearData)
            .enter()
            .append("g")
            .attr("class", "year-bar");

        bars.append("rect")
            .attr("x", d => x(year) - 25)
            .attr("y", height - margin.bottom)
            .attr("width", 50)
            .attr("height", 0)
            .attr("fill", d => color(d.jurisdiction))
            .attr("fill-opacity", 0.8)
            .attr("stroke", d => color(d.jurisdiction))
            .attr("stroke-width", 2)
            .attr("rx", 4)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("fill-opacity", 1)
                    .attr("stroke-width", 3);
                    
                tooltip.style("opacity", 1)
                    .html(`
                        <strong>${d.jurisdiction}</strong><br>
                        <strong>Year:</strong> ${year}<br>
                        <strong>Positive Tests:</strong> ${d.count.toLocaleString()}
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("fill-opacity", 0.8)
                    .attr("stroke-width", 2);
                tooltip.style("opacity", 0);
            })
            .transition()
            .duration(600)
            .ease(d3.easeBackOut.overshoot(1.3))
            .attr("y", d => y(d.count))
            .attr("height", d => height - margin.bottom - y(d.count));

        // Add value labels on top of bars
        bars.append("text")
            .attr("x", d => x(year))
            .attr("y", d => y(d.count) - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .attr("fill", "#374151")
            .style("opacity", 0)
            .text(d => d.count.toLocaleString())
            .transition()
            .delay(600)
            .duration(300)
            .style("opacity", 1);

        // Update year display
        yearDisplay.text(year);

        // Add transition effect between years
        if (currentYearIndex > 0) {
            const prevYear = years[currentYearIndex - 1];
            const prevData = yearDataMap.get(prevYear) || [];
            
            // Draw connection lines
            const connections = timelineGroup.selectAll(".connection")
                .data(prevData)
                .enter()
                .append("line")
                .attr("class", "connection")
                .attr("x1", d => x(prevYear))
                .attr("y1", d => y(d.count))
                .attr("x2", d => x(year))
                .attr("y2", d => y(d.count))
                .attr("stroke", d => color(d.jurisdiction))
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5")
                .attr("opacity", 0.3);
        }
    }

    // Enhanced control bindings
    d3.select("#play-timeline").on("click", () => {
        isPlaying = true;
        playPauseBtn.text("⏸ Pause").style("background", "#ef4444");
        animateTimeline();
    });

    d3.select("#pause-timeline").on("click", () => {
        isPlaying = false;
        playPauseBtn.text("▶ Play").style("background", "#3b82f6");
    });

    // Initialize with first year
    updateTimelineVisualization(years[0]);

    // Add title and subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "700")
        .attr("fill", "#1f2937")
        .text("Interactive Timeline: Year-by-Year Evolution");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 43)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#6b7280")
        .text("Watch patterns emerge and evolve across jurisdictions over time");
}
    currentYearIndex = 0;

    const { width, height } = getChartSize(container, 400);
    const margin = { top: 60, right: 150, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const filteredData = filterByYearRange(globalData, d => d.YEAR);
    const years = uniqueSorted(filteredData.map(d => d.YEAR));
    const jurisdictions = uniqueSorted(filteredData.map(d => d.JURISDICTION));
    if (!years.length || !jurisdictions.length) {
        renderEmptyState(container, "No timeline data for selected filters.");
        return;
    }

    const xScale = d3.scaleBand()
        .domain(jurisdictions)
        .range([0, innerWidth])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.COUNT) || 1])
        .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal(creativePalettes.vibrant);

    // Create bars for each jurisdiction
    const bars = g.selectAll(".jurisdiction-group")
        .data(jurisdictions)
        .enter()
        .append("g")
        .attr("class", "jurisdiction-group")
        .attr("transform", d => `translate(${xScale(d)}, 0)`);

    bars.append("rect")
        .attr("x", 0)
        .attr("y", innerHeight)
        .attr("width", xScale.bandwidth())
        .attr("height", 0)
        .attr("fill", (d, i) => colorScale(i))
        .attr("fill-opacity", 0.8);

    // Axes
    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .attr("text-anchor", "end");

    g.append("g")
        .call(d3.axisLeft(yScale));

    // Year display
    const yearDisplay = svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "24px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .text(years[0]);

    function animateYear(yearIndex) {
        const year = years[yearIndex];
        const yearData = filteredData.filter(d => d.YEAR === year);
        const byJurisdiction = d3.rollup(yearData, v => d3.sum(v, d => d.COUNT), d => d.JURISDICTION);

        yearDisplay.text(year);

        bars.select("rect")
            .transition()
            .duration(500)
            .attr("y", d => yScale(byJurisdiction.get(d) || 0))
            .attr("height", d => innerHeight - yScale(byJurisdiction.get(d) || 0));
    }

    // Play/pause
    d3.select("#play-timeline").on("click", () => {
        if (animationTimer) return;
        animationTimer = setInterval(() => {
            animateYear(currentYearIndex);
            currentYearIndex = (currentYearIndex + 1) % years.length;
        }, 1000);
    });

    d3.select("#pause-timeline").on("click", () => {
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
        }
    });

    // Initialize
    animateYear(0);

    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#666")
        .text("Animated Timeline: Jurisdiction Patterns Over Time");
}

// Navigation scrolling functionality (works for both story and dashboard layouts)
function initStoryScrolling() {
    const storyNav = document.getElementById('story-nav');
    const mainNav = document.getElementById('main-nav');
    
    // Story layout navigation
    if (storyNav) {
        const chapterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    
                    const chapterId = entry.target.id;
                    document.querySelectorAll('.chapter-link').forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${chapterId}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '-100px 0px -100px 0px'
        });

        document.querySelectorAll('.story-chapter').forEach(chapter => {
            chapterObserver.observe(chapter);
        });

        document.querySelectorAll('.chapter-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop - 150;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });

        let lastScrollTop = 0;
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > 300 && scrollTop > lastScrollTop) {
                storyNav.classList.add('hidden');
            } else {
                storyNav.classList.remove('hidden');
            }
            
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        }, { passive: true });

        document.querySelectorAll('.story-chapter').forEach((chapter, index) => {
            chapter.style.transitionDelay = `${index * 0.1}s`;
        });
    }
    
    // Dashboard layout navigation
    if (mainNav) {
        const sections = document.querySelectorAll('.viz-section, .hero-section');
        
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${sectionId}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '-20% 0px -60% 0px'
        });

        sections.forEach(section => sectionObserver.observe(section));

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    const navHeight = mainNav.offsetHeight + 80;
                    const targetPosition = targetElement.offsetTop - navHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}
