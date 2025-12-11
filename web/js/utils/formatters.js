/**
 * Utility functions for formatting data
 */

/**
 * Centralized color palette (Okabe-Ito colorblind-safe)
 * All charts should reference this for visual consistency.
 * @type {Object}
 */
export const COLORS = {
    // Primary palette
    primary: '#0072B2',      // Blue
    secondary: '#D55E00',    // Vermillion/Orange
    accent: '#009E73',       // Teal/Green
    highlight: '#CC79A7',    // Pink
    muted: '#666666',        // Dark Gray
    
    // Drug type colors
    drugs: {
        Amphetamine: '#D55E00',  // Vermillion
        Cannabis: '#009E73',      // Teal
        Ecstasy: '#CC79A7',       // Pink
        Cocaine: '#0072B2',       // Blue
        Unknown: '#666666',       // Dark Gray (Screening Only)
        'Screening Only': '#666666',
        Other: '#999999'
    },
    
    // Chart-specific semantic colors
    trend: {
        line: '#0072B2',
        area: '#0072B2',
        dot: '#0072B2',
        annotation: '#D55E00'
    },
    donut: {
        cleared: '#009E73',
        positive: '#D55E00'
    },
    comparison: {
        tests: '#0072B2',
        detections: '#D55E00',
        rate: '#009E73'
    }
};

/**
 * Format number with thousand separators
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
    if (num === null || num === undefined) return '—';
    return new Intl.NumberFormat('en-AU').format(num);
}

/**
 * Format number in compact form (e.g., 1.2K, 3.4M)
 * @param {number} num
 * @returns {string}
 */
export function formatCompact(num) {
    if (num === null || num === undefined) return '—';
    return new Intl.NumberFormat('en-AU', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(num);
}

/**
 * Format percentage
 * @param {number} num - Value between 0 and 1 or 0-100
 * @param {boolean} isDecimal - Whether input is decimal (0-1)
 * @returns {string}
 */
export function formatPercent(num, isDecimal = false) {
    if (num === null || num === undefined) return '—';
    const value = isDecimal ? num * 100 : num;
    return `${value.toFixed(1)}%`;
}

/**
 * Format year range
 * @param {number} start
 * @param {number} end
 * @returns {string}
 */
export function formatYearRange(start, end) {
    if (start === end) return String(start);
    return `${start}–${end}`;
}

/**
 * Drug type display labels and descriptions
 * 'Unknown' represents positive screening tests without lab confirmation (Stage 1 only)
 */
const DRUG_LABELS = {
    'Unknown': 'Screening Only',
    'Amphetamine': 'Amphetamine',
    'Cannabis': 'Cannabis',
    'Ecstasy': 'Ecstasy',
    'Cocaine': 'Cocaine',
    'Other': 'Other'
};

const DRUG_DESCRIPTIONS = {
    'Unknown': 'Positive roadside screening without laboratory confirmation of specific drug type. Common in QLD, TAS, and NT jurisdictions.',
    'Amphetamine': 'Includes methamphetamine and other amphetamine-type stimulants',
    'Cannabis': 'THC detected in oral fluid sample',
    'Ecstasy': 'MDMA and related compounds',
    'Cocaine': 'Cocaine detected in oral fluid sample',
    'Other': 'Other controlled substances'
};

/**
 * Get display label for drug type
 * @param {string} drugType - Raw drug type from data
 * @returns {string} Display label
 */
export function getDrugLabel(drugType) {
    return DRUG_LABELS[drugType] || drugType;
}

/**
 * Get description/tooltip text for drug type
 * @param {string} drugType - Raw drug type from data
 * @returns {string} Description text
 */
export function getDrugDescription(drugType) {
    return DRUG_DESCRIPTIONS[drugType] || '';
}

/**
 * Get color for drug type (color-blind safe)
 * @param {string} drugType
 * @returns {string}
 */
export function getDrugColor(drugType) {
    return COLORS.drugs[drugType] || COLORS.drugs.Other;
}

/**
 * Get all drug colors as array (excludes Unknown/Other)
 * @returns {string[]}
 */
export function getDrugColors() {
    return [
        COLORS.drugs.Amphetamine,
        COLORS.drugs.Cannabis,
        COLORS.drugs.Ecstasy,
        COLORS.drugs.Cocaine
    ];
}

/**
 * Get color scale for sequential data
 * @param {number} min
 * @param {number} max
 * @returns {Function}
 */
export function getSequentialScale(min, max) {
    return d3.scaleSequential()
        .domain([min, max])
        .interpolator(d3.interpolateBlues);
}

/**
 * Normalize drug name from raw data to canonical Title Case
 * Handles UPPERCASE/lowercase variations from KNIME exports
 * @param {string} drug - Raw drug name from data
 * @returns {string} Normalized drug type name
 */
export function normalizeDrugType(drug) {
    if (!drug) return 'Unknown';
    const lower = drug.toLowerCase();
    const drugMap = {
        'amphetamine': 'Amphetamine',
        'methylamphetamine': 'Amphetamine',
        'cannabis': 'Cannabis',
        'ecstasy': 'Ecstasy',
        'mdma': 'Ecstasy',
        'cocaine': 'Cocaine',
        'unknown': 'Unknown'
    };
    return drugMap[lower] || drug.charAt(0).toUpperCase() + drug.slice(1).toLowerCase();
}

/**
 * Get jurisdiction full name
 * @param {string} abbrev
 * @returns {string}
 */
export function getJurisdictionName(abbrev) {
    const names = {
        'NSW': 'New South Wales',
        'VIC': 'Victoria',
        'QLD': 'Queensland',
        'WA': 'Western Australia',
        'SA': 'South Australia',
        'TAS': 'Tasmania',
        'ACT': 'Australian Capital Territory',
        'NT': 'Northern Territory'
    };
    return names[abbrev] || abbrev;
}

// ============================================
// Data Normalization Utilities
// ============================================

/**
 * Field aliases for KNIME export normalization
 * Maps canonical field names to possible source variations
 * @type {Object<string, string[]>}
 */
const FIELD_ALIASES = {
    year: ['YEAR', 'year', 'Year'],
    count: ['COUNT', 'count', 'total', 'TOTAL', 'value'],
    jurisdiction: ['JURISDICTION', 'jurisdiction', 'Jurisdiction', 'state', 'STATE'],
    drug_type: ['DRUG', 'drug_type', 'Drug_Type', 'drugType', 'drug'],
    tests_conducted: ['tests_conducted', 'TESTS_CONDUCTED', 'testsCount'],
    positive_detections: ['positive_detections', 'POSITIVE_DETECTIONS', 'positive'],
    cleared: ['cleared', 'CLEARED'],
    positive_rate: ['positive_rate', 'POSITIVE_RATE'],
    population: ['population', 'POPULATION'],
    age_group: ['AGE_GROUP', 'age_group', 'ageGroup'],
    location: ['LOCATION', 'location']
};

/**
 * Get first defined value from record using field aliases
 * Uses proper existence check (not truthy) to handle zero values correctly
 * @param {Object} record - Data record
 * @param {string} field - Target field name
 * @param {string[]} [customAliases] - Optional custom aliases to use
 * @returns {*} First found value or undefined
 */
function getFieldValue(record, field, customAliases = null) {
    const aliases = customAliases || FIELD_ALIASES[field] || [field];
    for (const key of aliases) {
        if (record[key] !== undefined) {
            return record[key];
        }
    }
    return undefined;
}

/**
 * Normalize a dataset with field mapping and type coercion
 * Fixes the truthy-zero bug by using proper existence checks
 * 
 * @param {Array} data - Raw data array
 * @param {Object} schema - Field schema
 *   Each key is the output field name, value is an object with:
 *   - from: {string} source field name (defaults to output field name)
 *   - type: {'number'|'string'} type coercion
 *   - default: {*} default value if field not found
 *   - aliases: {string[]} custom aliases (overrides FIELD_ALIASES)
 *   - transform: {Function} optional transform function (d) => value
 * @returns {Array} Normalized data array
 * 
 * @example
 * const normalized = normalizeDataset(rawData, {
 *     year: { type: 'number' },
 *     total: { from: 'count', type: 'number' },
 *     jurisdiction: {}
 * });
 */
export function normalizeDataset(data, schema) {
    if (!Array.isArray(data)) return [];
    
    return data.map(record => {
        const result = {};
        
        for (const [outField, opts] of Object.entries(schema)) {
            const fieldOpts = opts || {};
            const sourceField = fieldOpts.from || outField;
            
            // Handle custom transform function
            if (fieldOpts.transform) {
                result[outField] = fieldOpts.transform(record);
                continue;
            }
            
            // Get raw value using aliases
            const raw = getFieldValue(record, sourceField, fieldOpts.aliases);
            
            // Apply type coercion and defaults
            if (fieldOpts.type === 'number') {
                result[outField] = raw !== undefined ? +raw : (fieldOpts.default ?? 0);
            } else {
                result[outField] = raw ?? fieldOpts.default ?? null;
            }
        }
        
        return result;
    });
}
