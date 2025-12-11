/**
 * FilterController - Manages global filter state and UI
 */
export class FilterController {
    constructor(options = {}) {
        this.onFilterChange = options.onFilterChange || (() => {});
        
        // Default filter state
        this.filters = {
            yearStart: 2008,
            yearEnd: 2024,
            jurisdiction: 'all',
            drugTypes: ['Amphetamine', 'Cannabis', 'Ecstasy', 'Cocaine', 'Unknown']
        };

        this.init();
    }

    /**
     * Initialize filter controls
     */
    init() {
        this.bindYearRange();
        this.bindJurisdiction();
        this.bindDrugTypes();
        this.bindReset();
    }

    /**
     * Bind year range slider events
     */
    bindYearRange() {
        const startSlider = document.getElementById('year-start');
        const endSlider = document.getElementById('year-end');
        const startLabel = document.getElementById('range-start-label');
        const endLabel = document.getElementById('range-end-label');

        if (!startSlider || !endSlider) return;

        const updateRange = () => {
            let start = parseInt(startSlider.value);
            let end = parseInt(endSlider.value);

            // Ensure start <= end
            if (start > end) {
                [start, end] = [end, start];
            }

            this.filters.yearStart = start;
            this.filters.yearEnd = end;

            if (startLabel) startLabel.textContent = start;
            if (endLabel) endLabel.textContent = end;

            this.emitChange();
        };

        startSlider.addEventListener('input', updateRange);
        endSlider.addEventListener('input', updateRange);
    }

    /**
     * Bind jurisdiction select events
     */
    bindJurisdiction() {
        const select = document.getElementById('jurisdiction-filter');
        if (!select) return;

        select.addEventListener('change', (e) => {
            this.filters.jurisdiction = e.target.value;
            this.emitChange();
        });
    }

    /**
     * Bind drug type checkbox events
     */
    bindDrugTypes() {
        const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.filters.drugTypes = Array.from(checkboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.value);
                this.emitChange();
            });
        });
    }

    /**
     * Bind reset button
     */
    bindReset() {
        const resetBtn = document.getElementById('reset-filters');
        if (!resetBtn) return;

        resetBtn.addEventListener('click', () => {
            this.reset();
        });
    }

    /**
     * Reset all filters to defaults
     */
    reset() {
        this.filters = {
            yearStart: 2008,
            yearEnd: 2024,
            jurisdiction: 'all',
            drugTypes: ['Amphetamine', 'Cannabis', 'Ecstasy', 'Cocaine', 'Unknown']
        };

        // Update UI
        const startSlider = document.getElementById('year-start');
        const endSlider = document.getElementById('year-end');
        const jurisdictionSelect = document.getElementById('jurisdiction-filter');
        const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
        const startLabel = document.getElementById('range-start-label');
        const endLabel = document.getElementById('range-end-label');

        if (startSlider) startSlider.value = 2008;
        if (endSlider) endSlider.value = 2024;
        if (startLabel) startLabel.textContent = '2008';
        if (endLabel) endLabel.textContent = '2024';
        if (jurisdictionSelect) jurisdictionSelect.value = 'all';
        checkboxes.forEach(cb => cb.checked = true);

        this.emitChange();
    }

    /**
     * Get current filter state
     */
    getFilters() {
        return { ...this.filters };
    }

    /**
     * Emit filter change event
     */
    emitChange() {
        this.onFilterChange(this.getFilters());
    }
}
