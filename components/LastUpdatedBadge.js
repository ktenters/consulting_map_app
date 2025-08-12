// LastUpdatedBadge Component
// Displays last updated timestamp from Supabase with real-time updates

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
        // Create badge element
        this.element = document.createElement('div');
        this.element.className = 'last-updated';
        this.element.textContent = this.text;
        
        // Add to container
        this.container.appendChild(this.element);
        
        // Load initial data
        this.loadLastUpdated();
        
        // Subscribe to real-time updates
        this.subscribeToUpdates();
    }

    async loadLastUpdated() {
        try {
            const { data, error } = await supabase
                .from("firm_locations_meta")
                .select("last_updated")
                .single();

            if (error || !data?.last_updated) {
                this.text = "Last updated — unavailable";
            } else {
                this.text = `Last updated — ${formatMonthDayYear(data.last_updated)}`;
            }
            
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
        // Subscribe to real-time changes on firm_locations
        this.channel = supabase
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
    }

    destroy() {
        if (this.channel) {
            supabase.removeChannel(this.channel);
        }
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export for use in main.js
window.LastUpdatedBadge = LastUpdatedBadge;
