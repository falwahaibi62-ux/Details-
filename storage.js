/**
 * MovePro Storage Manager
 * Centralized LocalStorage keys and data persistence handlers.
 */

const STORAGE_KEY = 'movePro_masterJobs';
const TRASH_STORAGE_KEY = 'movepro_trash_bin'; 
const RENTALS_STORAGE_KEY = 'movepro_private_truck_rentals';
const WAREHOUSE_STORAGE_KEY = 'movepro_warehouse_records';

// --- Master Jobs Management ---
function loadMasterJobs() {
    if (window.masterJobs && Array.isArray(window.masterJobs) && window.masterJobs.length > 0) {
        saveMasterJobs(window.masterJobs);
        return window.masterJobs;
    }

    const savedJobs = localStorage.getItem(STORAGE_KEY);
    if (savedJobs) {
        try {
            const parsed = JSON.parse(savedJobs);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            console.error('Error parsing stored jobs:', e);
        }
    }
    return [];
}

function saveMasterJobs(jobsArray) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobsArray));
    window.masterJobs = jobsArray; 
}

// Initialize Global State
window.masterJobs = loadMasterJobs();


// --- Trash Bin Management (Merged duplicates into a single clean function) ---
function loadTrashBin() {
    const saved = localStorage.getItem(TRASH_STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            console.error('Error parsing trash bin:', e);
        }
    }
    return [];
}

function saveTrashBin(trashData) {
    window.masterTrash = trashData;
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(trashData));
}

// Alias for compatibility if called anywhere else
const saveTrash = saveTrashBin;

// Initialize Trash State
window.masterTrash = loadTrashBin();


// --- Private Truck Rentals Management ---
function loadTruckRentals() {
    const saved = localStorage.getItem(RENTALS_STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            console.error('Error parsing rentals:', e);
        }
    }
    return [];
}

function saveTruckRentals(data) {
    localStorage.setItem(RENTALS_STORAGE_KEY, JSON.stringify(data));
}


// --- Warehouse Records Management ---
function loadWarehouseRecords() {
    const saved = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
            console.error('Error parsing warehouse records:', e);
        }
    }
    
    // Default initial records if storage is empty
    const initialWarehouseRecords = [
        { date: "2026-06-04", services: "Flooring", amount: 2200, paymentType: "Cash", details: "Flooring installation and materials" },
        { date: "2026-06-05", services: "Palettes", amount: 2000, paymentType: "Cash", details: "Warehouse palettes purchase" },
        { date: "2026-09-05", services: "Rent", amount: 5500, paymentType: "Others", details: "Warehouse monthly rent" }
    ];
    saveWarehouseRecords(initialWarehouseRecords);
    return initialWarehouseRecords;
}

function saveWarehouseRecords(data) {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(data));
}
