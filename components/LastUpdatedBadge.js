// LastUpdatedBadge Component
// Displays last updated timestamp from Supabase with real-time updates
// Now positioned in the left sidebar instead of map overlay

function formatMonthDayYear(iso) {
    const d = new Date(iso);
    const month = d.toLocaleString("en-US", { month: "long" }); // e.g., August
    const day = String(d.getDate()).padStart(2, "0");           // 01..31
    const year = d.getFullYear();                                // 2025
    // Requested format: Month, DD YYYY
    return `${month}, ${day} ${year}`;
}

class LastUpdatedBadge {
    constructor(container) {
        this.container = container;
        this.text = "Last updated — loading…";
        this.element = null;
        this.channel = null;
        this.init();
    }

    init() {
        // Create badge element with sidebar class
        this.element = document.createElement('div');
        this.element.className = 'last-updated-sidebar';
        this.element.textContent = this.text;
        
        // Add to container
        this.container.appendChild(this.element);
        
        // Wait for Supabase client to be available, then initialize
        this.waitForSupabase();
    }

    waitForSupabase() {
        // Check if Supabase client is available
        if (window.supabase) {
            this.initializeBadge();
        } else {
            // Wait a bit and try again
            setTimeout(() => this.waitForSupabase(), 100);
        }
    }

    initializeBadge() {
        // Load initial data
        this.loadLastUpdated();
        
        // Subscribe to real-time updates
        this.subscribeToUpdates();
    }

    async loadLastUpdated() {
        try {
            const { data, error } = await window.supabase
                .from("firm_locations_meta")
                .select("last_updated")
                .maybeSingle(); // Use maybeSingle() to avoid throwing when 0 rows

            if (error) {
                console.error("last_updated error:", error);
                this.text = "Last updated — unavailable";
                this.updateDisplay();
                return;
            }

            if (!data?.last_updated) {
                this.text = "Last updated — unavailable";
                this.updateDisplay();
                return;
            }

            this.text = `Last updated — ${formatMonthDayYear(data.last_updated)}`;
            this.updateDisplay();
            
        } catch (error) {
            console.error('Error loading last updated:', error);
            this.text = "Last updated — error";
            this.updateDisplay();
        }
    }

    updateDisplay() {
        if (this.element) {
            this.element.textContent = this.text;
        }
    }

    subscribeToUpdates() {
        try {
            // Subscribe to real-time changes on firm_locations
            this.channel = window.supabase
                .channel("firm_locations-updates")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "firm_locations" },
                    () => {
                        console.log('Firm locations updated, refreshing last updated badge');
                        this.loadLastUpdated();
                    }
                )
                .subscribe();
        } catch (error) {
            console.error('Error setting up real-time subscription:', error);
        }
    }

    destroy() {
        if (this.channel && window.supabase) {
            window.supabase.removeChannel(this.channel);
        }
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export for use in main.js
window.LastUpdatedBadge = LastUpdatedBadge;
