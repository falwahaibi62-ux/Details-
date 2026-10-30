/**
 * MovePro Storage Manager
 * Centralized LocalStorage keys and data persistence handlers.
 */


if (typeof window.saveTrash === 'undefined') {
    window.saveTrash = function(/* parameters here */) {
        // Function body / implementation
    };
}
if (typeof window.STORAGE_KEY === 'undefined') {
    window.STORAGE_KEY = 'movePro_masterJobs';
}
if (typeof window.TRASH_STORAGE_KEY === 'undefined') {
    window.TRASH_STORAGE_KEY = 'movepro_trash_bin';
}
if (typeof window.RENTALS_STORAGE_KEY === 'undefined') {
    window.RENTALS_STORAGE_KEY = 'movepro_private_truck_rentals';
}
if (typeof window.WAREHOUSE_STORAGE_KEY === 'undefined') {
    window.WAREHOUSE_STORAGE_KEY = 'movepro_warehouse_records';
}

// --- Master Jobs Management ---
function loadMasterJobs() {
    // التحقق المباشر من التخزين المحلي أولاً لضمان جلب أحدث التحديثات
    const savedJobs = localStorage.getItem(STORAGE_KEY);
    if (savedJobs) {
        try {
            const parsed = JSON.parse(savedJobs);
            if (Array.isArray(parsed) && parsed.length > 0) {
                window.masterJobs = parsed;
                return parsed;
            }
        } catch (e) {
            console.error('Error parsing stored jobs:', e);
        }
    }
    
    // إذا لم يوجد في التخزين، يتم الاعتماد على الكائن العام أو مصفوفة فارغة
    if (window.masterJobs && Array.isArray(window.masterJobs) && window.masterJobs.length > 0) {
        saveMasterJobs(window.masterJobs);
        return window.masterJobs;
    }
    
    return [];
}

function saveMasterJobs(jobsArray) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobsArray));
    window.masterJobs = jobsArray; 
}

// Initialize Global State
window.masterJobs = loadMasterJobs();


// --- Trash Bin Management ---
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

const saveTrash = saveTrashBin;
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
