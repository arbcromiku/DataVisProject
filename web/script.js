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
const tooltip = d3.select("#tooltip");

// Utility: get unique sorted values
function uniqueSorted(arr) {
    return Array.from(new Set(arr)).sort();
}

function formatNumber(value) {
    return d3.format(",.0f")(value);
}

function getChartSize(container, baseHeight = 360) {
    const width = Math.max(320, Math.min(1000, container.node().clientWidth || 900));
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

// Load & preprocess data

Promise.all([
    d3.json("processed_police_data.json"),
    d3.json("australian-states.geojson")
]).then(([raw, geoData]) => {
    globalGeoData = geoData;
    console.log("Raw data loaded:", raw.length);

    // 1. Keep only confirmed positive drug tests
    let data = raw.filter(d => d.METRIC === "positive_drug_tests");

    // 2. Remove rows that explicitly say "no drugs detected"
    data = data.filter(d => d.NO_DRUGS_DETECTED !== "Yes");

    // 3. Convert drug fields (“Yes” → 1, everything else → 0)
    data = data.map(d => {
        drugTypes.forEach(drug => {
            d[drug] =
                d[drug] && d[drug].toString().toLowerCase() === "yes" ? 1 : 0;
        });

        d.YEAR = +d.YEAR;
        d.COUNT = +d.COUNT;

        return d;
    });

    console.log("Cleaned positive dataset:", data.length);

    globalData = data;

    initFilters(globalData);
    renderSummary(globalData);

    // Initial draw
    createTrendChart();
    createJurisdictionChart();
    createMap();
    createAgeGroupChart();
    createDrugTypeChart();
    createHeatmap();
    createStackedDrugChart();
    createRemotenessChart();

    window.addEventListener("resize", redrawAll, { passive: true });
});

// Initialise dropdowns

function initFilters(data) {
    const years = uniqueSorted(data.map(d => d.YEAR));
    const jurisdictions = uniqueSorted(data.map(d => d.JURISDICTION));
    const ageGroups = uniqueSorted(data.map(d => d.AGE_GROUP));

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
    ["jurisdiction-year", "age-year", "drugtype-year", "stacked-year", "map-year", "remoteness-year", "composition-year"].forEach(
        id => {
            const sel = d3.select("#" + id);
            sel.html("");
            sel.append("option").attr("value", "All").text("All years");
            
            // For remoteness, prioritise 2023-2024 if they exist
            years.forEach(y => {
                sel.append("option").attr("value", y).text(y);
            });
            
            // Set default for remoteness
            if (id === "remoteness-year" && years.includes(2023)) {
                sel.property("value", 2023);
            }
        }
    );

    // Drug type filter (for age chart)
    const ageDrugSel = d3.select("#age-drug");
    ageDrugSel.html("");
    ageDrugSel.append("option").attr("value", "All").text("All drugs");
    drugTypes.forEach(d => {
        ageDrugSel.append("option").attr("value", d).text(d);
    });

    // Heatmap filter
    const heatmapYearSel = d3.select("#heatmap-year");
    heatmapYearSel.html("");
    heatmapYearSel.append("option").attr("value", "All").text("All years");
    years.forEach(y => {
        heatmapYearSel.append("option").attr("value", y).text(y);
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
}

function renderSummary(data) {
    if (!data.length) {
        return;
    }

    const totalPositives = d3.sum(data, d => d.COUNT);

    const yearTotals = new Map(
        d3.rollups(
            data,
            v => d3.sum(v, d => d.COUNT),
            d => d.YEAR
        )
    );

    const peak = { jurisdiction: "", year: "", share: 0, count: 0 };

    d3.rollups(
        data,
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
        total: d3.sum(data, d => (d[drug] === 1 ? d.COUNT : 0))
    }));
    const topDrug = drugTotals.sort((a, b) => b.total - a.total)[0];

    document.getElementById("stat-total").textContent = formatNumber(totalPositives);
    document.getElementById("stat-top-jurisdiction").textContent = `${peak.jurisdiction} • ${(peak.share * 100).toFixed(1)}% (${peak.year})`;
    document.getElementById("stat-top-drug").textContent = `${topDrug.drug} • ${formatNumber(topDrug.total)} tests`;
}

// 1. Positive Drug Rate Over Time – Line Chart

function createTrendChart() {
    const jurisdiction = d3.select("#trend-jurisdiction").property("value");

    let filtered =
        jurisdiction === "All"
            ? globalData
            : globalData.filter(d => d.JURISDICTION === jurisdiction);

    // Aggregate by YEAR
    const yearly = d3
        .rollups(
            filtered,
            v => d3.sum(v, d => d.COUNT),
            d => d.YEAR
        )
        .map(([year, total]) => ({ YEAR: year, COUNT: total }))
        .sort((a, b) => a.YEAR - b.YEAR);

    const container = d3.select("#trend-chart");
    container.html("");

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

    // Line
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

    // Points
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
          <strong>Jurisdiction:</strong> ${jurisdiction === "All" ? "All jurisdictions" : jurisdiction
                    }
        `
                )
                .style("left", event.pageX + 12 + "px")
                .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

    // Axes
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

    let filtered =
        yearVal === "All"
            ? globalData
            : globalData.filter(d => d.YEAR === +yearVal);

    // Aggregate by jurisdiction
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
        .style("cursor", "pointer") // Add pointer cursor
        .on("click", (event, d) => {
            // Update other filters
            const trendSelect = d3.select("#trend-jurisdiction");
            const drugSelect = d3.select("#drugtype-jurisdiction");
            
            // Set value if it exists in options
            trendSelect.property("value", d.JURISDICTION);
            drugSelect.property("value", d.JURISDICTION);
            
            // Trigger change events to redraw
            trendSelect.dispatch("change");
            drugSelect.dispatch("change");

            // Visual feedback on this chart (optional highlight)
            d3.selectAll(".bar").attr("opacity", 0.6);
            d3.select(event.currentTarget).attr("opacity", 1);
        })
        .on("mousemove", (event, d) => {
            const share = (d.COUNT / totalAll) * 100;
            tooltip
                .style("opacity", 1)
                .html(
                    `
          <strong>Jurisdiction:</strong> ${d.JURISDICTION}<br>
          <strong>Positive tests:</strong> ${d.COUNT.toLocaleString()}<br>
          <strong>Share of total:</strong> ${share.toFixed(1)}%<br>
          <strong>Year:</strong> ${yearVal === "All" ? "All years" : yearVal
                    }
        `
                )
                .style("left", event.pageX + 12 + "px")
                .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    bars
        .transition()
        .duration(700)
        .attr("width", d => x(d.COUNT) - x(0));

    // Axes
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

    let filtered =
        yearVal === "All" ? globalData : globalData.filter(d => d.YEAR === +yearVal);

    // If a specific drug selected, filter to rows where that drug is present
    if (drugVal !== "All") {
        filtered = filtered.filter(d => d[drugVal] === 1);
    }

    // Aggregate by age group
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
        .on("mousemove", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(
                    `
          <strong>Age group:</strong> ${d.AGE_GROUP}<br>
          <strong>Positive tests:</strong> ${d.COUNT.toLocaleString()}<br>
          <strong>Drug filter:</strong> ${drugVal === "All" ? "All drugs" : drugVal
                    }<br>
          <strong>Year:</strong> ${yearVal === "All" ? "All years" : yearVal}
        `
                )
                .style("left", event.pageX + 12 + "px")
                .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    bars
        .transition()
        .duration(700)
        .attr("y", d => y(d.COUNT))
        .attr("height", d => y(0) - y(d.COUNT));

    // Axes
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

    let filtered = globalData;

    if (yearVal !== "All") {
        filtered = filtered.filter(d => d.YEAR === +yearVal);
    }

    if (jurisVal !== "All") {
        filtered = filtered.filter(d => d.JURISDICTION === jurisVal);
    }

    const drugData = drugTypes.map(drug => {
        const total = d3.sum(filtered, d => (d[drug] === 1 ? d.COUNT : 0));
        return { DRUG: drug, COUNT: total };
    });

    const container = d3.select("#drugtype-chart");
    container.html("");

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
        .on("mousemove", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(
                    `
          <strong>Drug:</strong> ${d.DRUG}<br>
          <strong>Positive tests:</strong> ${d.COUNT.toLocaleString()}<br>
          <strong>Jurisdiction:</strong> ${jurisVal === "All" ? "All jurisdictions" : jurisVal
                    }<br>
          <strong>Year:</strong> ${yearVal === "All" ? "All years" : yearVal}
        `
                )
                .style("left", event.pageX + 12 + "px")
                .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

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

    let filtered =
        yearVal === "All" ? globalData : globalData.filter(d => d.YEAR === +yearVal);

    const jurisdictions = uniqueSorted(globalData.map(d => d.JURISDICTION));
    
    // Prepare data: flat list of {x: jurisdiction, y: drug, value: count}
    const matrix = [];
    jurisdictions.forEach(j => {
        const jRows = filtered.filter(d => d.JURISDICTION === j);
        drugTypes.forEach(drug => {
            const val = d3.sum(jRows, d => (d[drug] === 1 ? d.COUNT : 0));
            matrix.push({
                jurisdiction: j,
                drug: drug,
                value: val
            });
        });
    });

    const container = d3.select("#heatmap-chart");
    container.html("");

    const { width, height } = getChartSize(container, 400);
    const margin = { top: 30, right: 30, bottom: 70, left: 120 };

    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Scales
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

    // Draw cells
    svg.selectAll("rect")
        .data(matrix)
        .enter()
        .append("rect")
        .attr("x", d => x(d.jurisdiction))
        .attr("y", d => y(d.drug))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => color(d.value))
        .style("stroke", "#f4f6f8") // grid effect
        .style("stroke-width", 1)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            // Update filters
            const trendSelect = d3.select("#trend-jurisdiction");
            const drugSelect = d3.select("#age-drug"); // Filter Age chart by drug

            trendSelect.property("value", d.jurisdiction);
            drugSelect.property("value", d.drug);

            trendSelect.dispatch("change");
            drugSelect.dispatch("change");
            
            // Scroll to Age chart to see result? Maybe just alert or visual feedback.
            // highlighting this cell
            svg.selectAll("rect").style("opacity", 0.4);
            d3.select(event.currentTarget).style("opacity", 1);
        })
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

    // Axes
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

    let filtered =
        yearVal === "All" ? globalData : globalData.filter(d => d.YEAR === +yearVal);

    // Aggregate per AGE_GROUP & drug type
    const ageGroups = uniqueSorted(filtered.map(d => d.AGE_GROUP));

    const stackedData = ageGroups.map(age => {
        const rows = filtered.filter(d => d.AGE_GROUP === age);
        const base = { AGE_GROUP: age };
        drugTypes.forEach(drug => {
            base[drug] = d3.sum(rows, d => (d[drug] === 1 ? d.COUNT : 0));
        });
        return base;
    });

    const container = d3.select("#stacked-chart");
    container.html("");

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

    // Draw stacks
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

    // Axes
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
    
    let filtered = yearVal === "All" ? globalData : globalData.filter(d => d.YEAR === +yearVal);

    // Aggregate counts by JURISDICTION
    const counts = new Map();
    d3.rollups(filtered, v => d3.sum(v, d => d.COUNT), d => d.JURISDICTION)
      .forEach(([jur, count]) => counts.set(jur, count));
    
    const maxCount = d3.max(Array.from(counts.values())) || 1;

    // Mapping from State Name to Jurisdiction Code
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

    // Prepare granular data (Metro vs Regional)
    const locationData = new Map();
    
    filtered.forEach(d => {
        if (d.LOCATION === "All regions" || d.LOCATION === "Unknown") return;
        
        if (!locationData.has(d.JURISDICTION)) {
            locationData.set(d.JURISDICTION, { metro: 0, regional: 0, total: 0 });
        }
        const rec = locationData.get(d.JURISDICTION);
        
        if (d.LOCATION === "Major Cities of Australia") {
            rec.metro += d.COUNT;
        } else {
            rec.regional += d.COUNT;
        }
        rec.total += d.COUNT;
    });

    const container = d3.select("#map-chart");
    container.html("");

    const { width, height } = getChartSize(container, 500);
    
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Projection
    const projection = d3.geoMercator()
        .center([133, -28])
        .translate([width / 2, height / 2])
        .scale(Math.min(width, height) * 1.1 + 100); 

    const path = d3.geoPath().projection(projection);

    const color = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, maxCount]);

    // Draw states
    svg.selectAll("path")
        .data(globalGeoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
            const stateName = d.properties.STATE_NAME;
            const jur = stateMap[stateName];
            
            const hasGranular = locationData.has(jur) && (locationData.get(jur).metro > 0 || locationData.get(jur).regional > 0);
            
            if (hasGranular) {
                // Color base by REGIONAL count
                return color(locationData.get(jur).regional);
            } else {
                const count = counts.get(jur) || 0;
                return color(count);
            }
        })
        .attr("stroke", "#777")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
            const stateName = d.properties.STATE_NAME;
            const jur = stateMap[stateName];
            const data = locationData.get(jur);
            const total = counts.get(jur) || 0;
            
            let content = `<strong>${stateName} (${jur})</strong><br>`;
            
            if (data && (data.metro > 0 || data.regional > 0)) {
                content += `
                    Regional/Remote: ${data.regional.toLocaleString()}<br>
                    Major Cities: ${data.metro.toLocaleString()}<br>
                    <em style="font-size:0.8em">Base map colored by Regional count</em>
                `;
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
             const stateName = d.properties.STATE_NAME;
             const jur = stateMap[stateName];
             if (jur) {
                 const trendSelect = d3.select("#trend-jurisdiction");
                 trendSelect.property("value", jur);
                 trendSelect.dispatch("change");
                 
                 svg.selectAll("path").attr("opacity", 0.6);
                 d3.select(event.currentTarget).attr("opacity", 1);
             }
        });

    // Draw City Bubbles (Metro Count)
    svg.selectAll("circle.city")
        .data(Object.entries(capitals))
        .enter()
        .append("circle")
        .attr("class", "city")
        .attr("cx", d => projection(d[1].coords)[0])
        .attr("cy", d => projection(d[1].coords)[1])
        .attr("r", d => {
            const jur = d[0];
            const data = locationData.get(jur);
            if (data && data.metro > 0) {
                // Scale radius
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
}

function redrawAll() {
    if (!globalData.length) return;
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
}

// 9. Evolution of Drug Types Over Time (Stacked Area)
function createEvolutionChart() {
    const container = d3.select("#evolution-chart");
    container.html("");

    const { width, height } = getChartSize(container, 400);
    const margin = { top: 30, right: 100, bottom: 50, left: 70 };

    // Prepare data: Year -> { Drug1: Count, Drug2: Count ... }
    const years = uniqueSorted(globalData.map(d => d.YEAR));
    const stackedData = years.map(year => {
        const yearData = globalData.filter(d => d.YEAR === year);
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
    
    let filtered = yearVal === "All" ? globalData : globalData.filter(d => d.YEAR === +yearVal);
    
    const jurisdictions = uniqueSorted(globalData.map(d => d.JURISDICTION));

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
    });

    const container = d3.select("#composition-chart");
    container.html("");

    const { width, height } = getChartSize(container, 400);
    const margin = { top: 30, right: 20, bottom: 50, left: 70 };

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3.scaleBand()
        .domain(jurisdictions)
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
    
    let filtered = globalData.filter(d => d.LOCATION !== "All regions");

    if (yearVal !== "All") {
        filtered = filtered.filter(d => d.YEAR === +yearVal);
    }
    
    // If filtered data is empty (common for years < 2023), show message
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

    // Aggregate by LOCATION
    const byLocation = d3.rollups(
        filtered,
        v => d3.sum(v, d => d.COUNT),
        d => d.LOCATION
    ).sort((a, b) => b[1] - a[1]);

    const { width, height } = getChartSize(container, 360);
    const margin = { top: 30, right: 40, bottom: 50, left: 160 }; // Wide left margin for labels

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

    // Bars
    svg.selectAll("rect.bar")
        .data(byLocation)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d[0]))
        .attr("x", x(0))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d[1]) - x(0))
        .attr("fill", d => color(d[0]))
        .on("mousemove", (event, d) => {
             tooltip.style("opacity", 1)
                .html(`
                    <strong>${d[0]}</strong><br>
                    <strong>Positive tests:</strong> ${d[1].toLocaleString()}<br>
                    <strong>Year:</strong> ${yearVal === "All" ? "2023–2024" : yearVal}
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    addAxisLabels(svg, width, height, margin, "Positive tests", "Remoteness Area");
}
