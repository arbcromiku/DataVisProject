/**
 * DataService - Handles data loading and caching
 */
export class DataService {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Load JSON data from a path
     * @param {string} path - Path to JSON file
     * @returns {Promise<any>} Parsed JSON data
     */
    async load(path) {
        // Check cache first
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            
            // Cache the result
            this.cache.set(path, data);
            return data;
        } catch (error) {
            console.error(`Failed to load ${path}:`, error);
            throw error;
        }
    }

    /**
     * Load multiple files in parallel
     * @param {Object} paths - Object with keys and paths
     * @returns {Promise<Object>} Object with loaded data
     */
    async loadAll(paths) {
        const entries = Object.entries(paths);
        const results = await Promise.all(
            entries.map(([key, path]) => 
                this.load(path).then(data => [key, data])
            )
        );
        return Object.fromEntries(results);
    }

    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }
}
