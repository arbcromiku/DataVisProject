// Load and process data for D3.js visualizations
d3.json('processed_police_data.json').then(function(data) {
    console.log('Data loaded successfully:', data.length, 'records');
    
    // Update record count in the UI
    document.getElementById('record-count').textContent = data.length;
    
    // Data processing for visualizations
    processData(data);
}).catch(function(error) {
    console.error('Error loading data:', error);
    document.getElementById('chart-container').innerHTML = 
        '<p class="error">Error loading data. Please check the console for details.</p>';
});

function processData(data) {
    // Filter data to only include records with age group information (not "All ages")
    const ageSpecificData = data.filter(d => d.AGE_GROUP !== "All ages");
    
    // Create visualizations for each research question
    createAgePatternsVisualization(ageSpecificData);
    createGeographicTrendsVisualization(data);
    createDrugCorrelationsVisualization(data);
    createEnforcementAnalysisVisualization(data);
    createDetectionImpactVisualization(data);
}

// 1. Age Patterns: How do drug test rates vary across age groups, and which drugs are most prevalent in each age demographic?
function createAgePatternsVisualization(data) {
    const container = d3.select('#age-patterns-chart');
    container.html('');
    
    // Group data by age group and sum drug types
    const ageGroups = [...new Set(data.map(d => d.AGE_GROUP))];
    const drugTypes = ['AMPHETAMINE', 'CANNABIS', 'COCAINE', 'ECSTASY', 'METHYLAMPHETAMINE'];
    
    const ageDrugData = ageGroups.map(ageGroup => {
        const groupData = data.filter(d => d.AGE_GROUP === ageGroup);
        const result = { ageGroup: ageGroup };
        drugTypes.forEach(drug => {
            result[drug] = d3.sum(groupData, d => d[drug] === 'Yes' ? 1 : 0);
        });
        return result;
    });
    
    // Create stacked bar chart
    const margin = {top: 20, right: 30, bottom: 60, left: 60};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const x = d3.scaleBand()
        .domain(ageGroups)
        .range([0, width])
        .padding(0.1);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(ageDrugData, d => d3.sum(drugTypes, drug => d[drug]))])
        .nice()
        .range([height, 0]);
    
    const color = d3.scaleOrdinal()
        .domain(drugTypes)
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']);
    
    // Stack the data
    const stack = d3.stack()
        .keys(drugTypes);
    
    const series = stack(ageDrugData);
    
    // Add bars
    g.selectAll('g')
        .data(series)
        .enter().append('g')
        .attr('fill', d => color(d.key))
        .selectAll('rect')
        .data(d => d)
        .enter().append('rect')
        .attr('x', d => x(d.data.ageGroup))
        .attr('y', d => y(d[1]))
        .attr('height', d => y(d[0]) - y(d[1]))
        .attr('width', x.bandwidth());
    
    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');
    
    g.append('g')
        .call(d3.axisLeft(y));
    
    // Add axis labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Number of Positive Tests');
    
    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .text('Age Group');
    
    // Add legend
    const legend = g.append('g')
        .attr('font-family', 'sans-serif')
        .attr('font-size', 10)
        .attr('transform', `translate(${width - 150}, 0)`);
    
    const legendItems = legend.selectAll('g')
        .data(drugTypes)
        .enter().append('g')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);
    
    legendItems.append('rect')
        .attr('x', 0)
        .attr('width', 19)
        .attr('height', 19)
        .attr('fill', color);
    
    legendItems.append('text')
        .attr('x', 24)
        .attr('y', 9.5)
        .attr('dy', '0.35em')
        .text(d => d);
    
    // Add title
    container.insert('h4', ':first-child')
        .text('Drug Test Rates by Age Group')
        .style('margin-top', '0');
}

// 2. Geographic Trends: How have drug test rates evolved over time across Australian jurisdictions?
function createGeographicTrendsVisualization(data) {
    const container = d3.select('#geographic-trends-chart');
    container.html('');
    
    // Group data by year and jurisdiction
    const years = [...new Set(data.map(d => d.YEAR))].sort();
    const jurisdictions = [...new Set(data.map(d => d.JURISDICTION))];
    
    const geoData = jurisdictions.map(jurisdiction => {
        const result = { jurisdiction: jurisdiction };
        years.forEach(year => {
            const yearData = data.filter(d => d.JURISDICTION === jurisdiction && d.YEAR === year);
            result[year] = d3.sum(yearData, d => d.COUNT || 0);
        });
        return result;
    });
    
    // Create line chart
    const margin = {top: 20, right: 100, bottom: 60, left: 60};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const x = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(geoData, d => d3.max(years, year => d[year]))])
        .nice()
        .range([height, 0]);
    
    const color = d3.scaleOrdinal()
        .domain(jurisdictions)
        .range(d3.schemeCategory10);
    
    // Create lines
    const line = d3.line()
        .x((d, i) => x(years[i]))
        .y(d => y(d));
    
    const jurisdictionLines = geoData.map(d => {
        return {
            jurisdiction: d.jurisdiction,
            values: years.map(year => d[year])
        };
    });
    
    g.selectAll('.line')
        .data(jurisdictionLines)
        .enter().append('path')
        .attr('class', 'line')
        .attr('d', d => line(d.values))
        .attr('stroke', d => color(d.jurisdiction))
        .attr('stroke-width', 2)
        .attr('fill', 'none');
    
    // Add dots
    jurisdictionLines.forEach(jurisdictionLine => {
        g.selectAll('.dot')
            .data(jurisdictionLine.values)
            .enter().append('circle')
            .attr('cx', (d, i) => x(years[i]))
            .attr('cy', d => y(d))
            .attr('r', 3)
            .attr('fill', color(jurisdictionLine.jurisdiction));
    });
    
    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')));
    
    g.append('g')
        .call(d3.axisLeft(y));
    
    // Add axis labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Number of Positive Tests');
    
    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .text('Year');
    
    // Add legend
    const legend = g.append('g')
        .attr('font-family', 'sans-serif')
        .attr('font-size', 10)
        .attr('transform', `translate(${width + 10}, 0)`);
    
    const legendItems = legend.selectAll('g')
        .data(jurisdictions)
        .enter().append('g')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);
    
    legendItems.append('rect')
        .attr('x', 0)
        .attr('width', 19)
        .attr('height', 19)
        .attr('fill', color);
    
    legendItems.append('text')
        .attr('x', 24)
        .attr('y', 9.5)
        .attr('dy', '0.35em')
        .text(d => d);
    
    // Add title
    container.insert('h4', ':first-child')
        .text('Drug Test Trends by Jurisdiction Over Time')
        .style('margin-top', '0');
}

// 3. Drug Correlations: What correlations exist between different drug types in positive tests?
function createDrugCorrelationsVisualization(data) {
    const container = d3.select('#drug-correlations-chart');
    container.html('');
    
    // Calculate correlation matrix
    const drugTypes = ['AMPHETAMINE', 'CANNABIS', 'COCAINE', 'ECSTASY', 'METHYLAMPHETAMINE'];
    
    // Convert drug test results to binary values (1 for 'Yes', 0 for 'No')
    const binaryData = data.map(d => {
        const result = {};
        drugTypes.forEach(drug => {
            result[drug] = d[drug] === 'Yes' ? 1 : 0;
        });
        return result;
    });
    
    // Calculate correlation coefficients
    const correlations = [];
    drugTypes.forEach((rowDrug, i) => {
        drugTypes.forEach((colDrug, j) => {
            if (i <= j) { // Only calculate upper triangle to avoid duplication
                const rowValues = binaryData.map(d => d[rowDrug]);
                const colValues = binaryData.map(d => d[colDrug]);
                
                // Simple correlation calculation
                const n = rowValues.length;
                const sumRow = d3.sum(rowValues);
                const sumCol = d3.sum(colValues);
                const sumRowSq = d3.sum(rowValues, d => d * d);
                const sumColSq = d3.sum(colValues, d => d * d);
                const sumRowCol = d3.sum(rowValues.map((d, idx) => d * colValues[idx]));
                
                const numerator = n * sumRowCol - sumRow * sumCol;
                const denominator = Math.sqrt((n * sumRowSq - sumRow * sumRow) * (n * sumColSq - sumCol * sumCol));
                
                const correlation = denominator !== 0 ? numerator / denominator : 0;
                
                correlations.push({
                    row: rowDrug,
                    col: colDrug,
                    value: correlation
                });
            }
        });
    });
    
    // Create heatmap
    const margin = {top: 50, right: 50, bottom: 100, left: 100};
    const width = 500 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const x = d3.scaleBand()
        .domain(drugTypes)
        .range([0, width])
        .padding(0.05);
    
    const y = d3.scaleBand()
        .domain(drugTypes)
        .range([0, height])
        .padding(0.05);
    
    // Color scale for correlation values (-1 to 1)
    const color = d3.scaleSequential(d3.interpolateRdBu)
        .domain([1, -1]); // Reverse domain to make positive correlations red and negative blue
    
    // Add rectangles
    g.selectAll()
        .data(correlations)
        .enter()
        .append('rect')
        .attr('x', d => x(d.col))
        .attr('y', d => y(d.row))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .style('fill', d => color(d.value))
        .attr('stroke', 'white');
    
    // Add text labels
    g.selectAll()
        .data(correlations)
        .enter()
        .append('text')
        .attr('x', d => x(d.col) + x.bandwidth() / 2)
        .attr('y', d => y(d.row) + y.bandwidth() / 2)
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .text(d => d.value.toFixed(2))
        .style('fill', d => Math.abs(d.value) > 0.5 ? 'white' : 'black')
        .style('font-size', '12px');
    
    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');
    
    g.append('g')
        .call(d3.axisLeft(y));
    
    // Add axis labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Drug Type');
    
    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 30})`)
        .style('text-anchor', 'middle')
        .text('Drug Type');
    
    // Add title
    g.append('text')
        .attr('x', width / 2)
        .attr('y', 0 - (margin.top / 2))
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text('Drug Type Correlation Matrix');
    
    // Add color legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legend = g.append('g')
        .attr('transform', `translate(${(width - legendWidth) / 2}, ${height + 40})`);
    
    const legendScale = d3.scaleLinear()
        .domain([-1, 1])
        .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format('.1f'));
    
    const legendGradient = legend.append('defs')
        .append('linearGradient')
        .attr('id', 'legend-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
    
    legendGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color(-1));
    
    legendGradient.append('stop')
        .attr('offset', '50%')
        .attr('stop-color', color(0));
    
    legendGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color(1));
    
    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#legend-gradient)');
    
    legend.append('g')
        .attr('transform', `translate(0, ${legendHeight})`)
        .call(legendAxis);
    
    // Add legend label
    legend.append('text')
        .attr('transform', `translate(${legendWidth / 2}, ${legendHeight + 30})`)
        .style('text-anchor', 'middle')
        .text('Correlation Coefficient');
    
    // Add title
    container.insert('h4', ':first-child')
        .text('Correlation Between Drug Types in Positive Tests')
        .style('margin-top', '0');
}

// 4. Enforcement Analysis: Relationship between positive drug tests and enforcement outcomes
function createEnforcementAnalysisVisualization(data) {
    const container = d3.select('#enforcement-analysis-chart');
    container.html('');
    
    // Group data by jurisdiction and sum enforcement outcomes
    const jurisdictions = [...new Set(data.map(d => d.JURISDICTION))];
    
    const enforcementData = jurisdictions.map(jurisdiction => {
        const groupData = data.filter(d => d.JURISDICTION === jurisdiction);
        return {
            jurisdiction: jurisdiction,
            positiveTests: d3.sum(groupData, d => d.COUNT || 0),
            fines: d3.sum(groupData, d => d.FINES || 0),
            arrests: d3.sum(groupData, d => d.ARRESTS || 0),
            charges: d3.sum(groupData, d => d.CHARGES || 0)
        };
    });
    
    // Create grouped bar chart
    const margin = {top: 20, right: 30, bottom: 100, left: 60};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const x0 = d3.scaleBand()
        .domain(jurisdictions)
        .range([0, width])
        .padding(0.1);
    
    const x1 = d3.scaleBand()
        .domain(['positiveTests', 'fines', 'arrests', 'charges'])
        .range([0, x0.bandwidth()])
        .padding(0.05);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(enforcementData, d => Math.max(d.positiveTests, d.fines, d.arrests, d.charges))])
        .nice()
        .range([height, 0]);
    
    const color = d3.scaleOrdinal()
        .domain(['positiveTests', 'fines', 'arrests', 'charges'])
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']);
    
    // Add bars
    g.append('g')
        .selectAll('g')
        .data(enforcementData)
        .enter().append('g')
        .attr('transform', d => `translate(${x0(d.jurisdiction)},0)`)
        .selectAll('rect')
        .data(d => [
            {name: 'positiveTests', value: d.positiveTests},
            {name: 'fines', value: d.fines},
            {name: 'arrests', value: d.arrests},
            {name: 'charges', value: d.charges}
        ])
        .enter().append('rect')
        .attr('x', d => x1(d.name))
        .attr('y', d => y(d.value))
        .attr('width', x1.bandwidth())
        .attr('height', d => height - y(d.value))
        .attr('fill', d => color(d.name));
    
    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');
    
    g.append('g')
        .call(d3.axisLeft(y));
    
    // Add axis labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Count');
    
    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 30})`)
        .style('text-anchor', 'middle')
        .text('Jurisdiction');
    
    // Add legend
    const legend = g.append('g')
        .attr('font-family', 'sans-serif')
        .attr('font-size', 10)
        .attr('transform', `translate(${width - 180}, 0)`);
    
    const legendItems = legend.selectAll('g')
        .data(['positiveTests', 'fines', 'arrests', 'charges'])
        .enter().append('g')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);
    
    legendItems.append('rect')
        .attr('x', 0)
        .attr('width', 19)
        .attr('height', 19)
        .attr('fill', color);
    
    legendItems.append('text')
        .attr('x', 24)
        .attr('y', 9.5)
        .attr('dy', '0.35em')
        .text(d => {
            switch(d) {
                case 'positiveTests': return 'Positive Tests';
                case 'fines': return 'Fines';
                case 'arrests': return 'Arrests';
                case 'charges': return 'Charges';
                default: return d;
            }
        });
    
    // Add title
    container.insert('h4', ':first-child')
        .text('Enforcement Outcomes by Jurisdiction')
        .style('margin-top', '0');
}

// 5. Detection Impact: How do different detection methods affect accuracy and outcomes?
function createDetectionImpactVisualization(data) {
    const container = d3.select('#detection-impact-chart');
    container.html('');
    
    // Filter data to only include records with detection method information
    const detectionData = data.filter(d => d.DETECTION_METHOD && d.DETECTION_METHOD !== '');
    
    // Group data by detection method
    const detectionMethods = [...new Set(detectionData.map(d => d.DETECTION_METHOD))];
    
    const methodData = detectionMethods.map(method => {
        const groupData = detectionData.filter(d => d.DETECTION_METHOD === method);
        return {
            method: method,
            count: groupData.length,
            avgPositiveRate: d3.mean(groupData, d => d.COUNT || 0),
            bestDetection: d3.sum(groupData, d => d.BEST_DETECTION_METHOD === 'Yes' ? 1 : 0)
        };
    });
    
    // Create horizontal bar chart for detection method counts
    const margin = {top: 20, right: 150, bottom: 60, left: 150};
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(methodData, d => d.count)])
        .nice()
        .range([0, width]);
    
    const y = d3.scaleBand()
        .domain(methodData.map(d => d.method))
        .range([0, height])
        .padding(0.1);
    
    // Add bars
    g.selectAll('.bar')
        .data(methodData)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', d => y(d.method))
        .attr('width', d => x(d.count))
        .attr('height', y.bandwidth())
        .attr('fill', '#1f77b4');
    
    // Add value labels
    g.selectAll('.label')
        .data(methodData)
        .enter().append('text')
        .attr('class', 'label')
        .attr('x', d => x(d.count) + 5)
        .attr('y', d => y(d.method) + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .text(d => d.count);
    
    // Add axes
    g.append('g')
        .attr('class', 'x-axis')
        .call(d3.axisTop(x));
    
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y));
    
    // Add axis labels
    g.append('text')
        .attr('transform', `translate(${width / 2}, ${0 - margin.top + 10})`)
        .style('text-anchor', 'middle')
        .text('Number of Tests');
    
    g.append('text')
        .attr('transform', `translate(${-margin.left + 20}, ${height / 2}) rotate(-90)`)
        .style('text-anchor', 'middle')
        .text('Detection Method');
    
    // Add title
    container.insert('h4', ':first-child')
        .text('Distribution of Detection Methods')
        .style('margin-top', '0');
    
    // Add additional information
    container.append('p')
        .text('Note: This visualization shows the distribution of different detection methods used in drug testing.')
        .style('font-style', 'italic')
        .style('margin-top', '10px');
}