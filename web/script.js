// Global config & helpers

const drugTypes = [
    "AMPHETAMINE",
    "CANNABIS",
    "COCAINE",
    "ECSTASY",
    "METHYLAMPHETAMINE"
];

let globalData = [];
const tooltip = d3.select("#tooltip");

// Utility: get unique sorted values
function uniqueSorted(arr) {
    return Array.from(new Set(arr)).sort();
}

// Load & preprocess data

d3.json("processed_police_data.json").then(raw => {
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

    // Initial draw
    createTrendChart();
    createJurisdictionChart();
    createAgeGroupChart();
    createDrugTypeChart();
    createStackedDrugChart();
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
    ["jurisdiction-year", "age-year", "drugtype-year", "stacked-year"].forEach(
        id => {
            const sel = d3.select("#" + id);
            sel.html("");
            sel.append("option").attr("value", "All").text("All years");
            years.forEach(y => {
                sel.append("option").attr("value", y).text(y);
            });
        }
    );

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

    const width = 900;
    const height = 350;
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };

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

    const width = 900;
    const height = 350;
    const margin = { top: 30, right: 40, bottom: 40, left: 100 };

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

    svg
        .selectAll("rect.bar")
        .data(byJurisdiction)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.JURISDICTION))
        .attr("x", x(0))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.COUNT) - x(0))
        .attr("fill", d => color(d.COUNT))
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

    // Axes
    svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5));

    svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
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

    const width = 900;
    const height = 350;
    const margin = { top: 30, right: 40, bottom: 60, left: 60 };

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

    svg
        .selectAll("rect.bar")
        .data(byAge)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.AGE_GROUP))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.COUNT))
        .attr("height", d => y(0) - y(d.COUNT))
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

    const width = 900;
    const height = 350;
    const margin = { top: 30, right: 40, bottom: 60, left: 60 };

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

    svg
        .selectAll("rect.bar")
        .data(drugData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.DRUG))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.COUNT))
        .attr("height", d => y(0) - y(d.COUNT))
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
}

// 5. Drug Type Distribution Across Age Groups – Stacked Bar Chart

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

    const width = 900;
    const height = 380;
    const margin = { top: 30, right: 20, bottom: 60, left: 70 };

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
    svg
        .selectAll("g.layer")
        .data(series)
        .enter()
        .append("g")
        .attr("class", "layer")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("x", d => x(d.data.AGE_GROUP))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
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
        .on("mouseout", () => tooltip.style("opacity", 0));

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
}
