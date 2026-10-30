/**
 * MovePro Storage Manager - Complete & Synchronized with Warehouse Data
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

window.saveTrash = saveTrashBin;
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
window.loadTruckRentals = loadTruckRentals;
window.saveTruckRentals = saveTruckRentals;


// --- Warehouse Records Management (Full Dataset Integration) ---
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
    
    // القائمة الشاملة والكاملة لسجلات المستودع والمصروفات
    const initialWarehouseRecords = [
        { date: "6/4/2026", services: "Flooring", amount: 2200, paymentType: "Cash", details: "Flooring installation and materials" },
        { date: "6/5/2026", services: "Palettes", amount: 2000, paymentType: "Cash", details: "Warehouse palettes purchase" },
        { date: "6/6/2026", services: "Fridge", amount: 700, paymentType: "Others", details: "Warehouse fridge equipment" },
        { date: "6/7/2026", services: "Warehouse Labor", amount: 700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "6/14/2026", services: "Warehouse Labor", amount: 700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "6/21/2026", services: "Warehouse", amount: 700, paymentType: "Cash", details: "Warehouse services and handling" },
        { date: "6/28/2026", services: "Warehouse Labor", amount: 700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "6/29/2026", services: "Office Supplies", amount: 200, paymentType: "Others", details: "Office and warehouse supplies" },
        { date: "7/5/2026", services: "Warehouse Labor", amount: 700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "7/12/2026", services: "Warehouse Labor", amount: 700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "7/15/2026", services: "Craiglist", amount: 240, paymentType: "Cash", details: "Equipment/Service via Craiglist" },
        { date: "7/16/2026", services: "Materials", amount: 342, paymentType: "Cash", details: "Warehouse materials" },
        { date: "7/19/2026", services: "Contracts", amount: 760, paymentType: "Others", details: "Service contracts" },
        { date: "7/20/2026", services: "Materials", amount: 204, paymentType: "Cash", details: "Warehouse materials" },
        { date: "7/21/2026", services: "Materials", amount: 163, paymentType: "Cash", details: "Warehouse materials" },
        { date: "7/22/2026", services: "Materials", amount: 167, paymentType: "Cash", details: "Warehouse materials" },
        { date: "7/25/2026", services: "Warehouse Labor", amount: 700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "7/26/2026", services: "Warehouse Labor", amount: 700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "8/10/2026", services: "Warehouse Labor", amount: 1700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "8/11/2026", services: "Warehouse Labor", amount: 1700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "8/20/2026", services: "Warehouse Labor", amount: 1700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "8/27/2026", services: "Warehouse Labor", amount: 1700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "9/3/2026", services: "Warehouse Labor", amount: 1700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "9/5/2026", services: "Rent", amount: 5500, paymentType: "Others", details: "Warehouse monthly rent" },
        { date: "9/5/2026", services: "Diesel WF", amount: 2453, paymentType: "Others", details: "Diesel and warehouse facility expenses" },
        { date: "9/16/2026", services: "Warehouse", amount: 700, paymentType: "Cash", details: "Warehouse services" },
        { date: "9/28/2026", services: "Warehouse Labor", amount: 700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "9/29/2026", services: "Materials", amount: 312, paymentType: "Cash", details: "Warehouse materials" },
        { date: "10/9/2026", services: "Warehouse Labor", amount: 700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "10/16/2026", services: "Warehouse", amount: 700, paymentType: "Cash", details: "Warehouse services" },
        { date: "10/22/2026", services: "Warehouse Labor", amount: 700, paymentType: "Cash", details: "Warehouse labor and handling" },
        { date: "10/25/2026", services: "Materials", amount: 450, paymentType: "Cash", details: "Warehouse supplies and materials" }
    ];

    saveWarehouseRecords(initialWarehouseRecords);
    return initialWarehouseRecords;
}

function saveWarehouseRecords(data) {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(data));
}

window.loadWarehouseRecords = loadWarehouseRecords;
window.saveWarehouseRecords = saveWarehouseRecords;
