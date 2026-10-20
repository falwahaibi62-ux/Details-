const STORAGE_KEY = 'movePro_masterJobs';
const TRASH_STORAGE_KEY = 'movepro_trash';
const RENTALS_STORAGE_KEY = 'movepro_private_truck_rentals';
const WAREHOUSE_STORAGE_KEY = 'movepro_warehouse_records';

function loadMasterJobs() {
    if (window.masterJobs && Array.isArray(window.masterJobs)) {
        saveMasterJobs(window.masterJobs);
        return window.masterJobs;
    }

    const savedJobs = localStorage.getItem(STORAGE_KEY);
    if (savedJobs) {
        try {
            return JSON.parse(savedJobs);
        } catch (e) {
            console.error('Error parsing stored jobs:', e);
        }
    }
    
    return [];
}

function saveMasterJobs(jobsArray) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobsArray));
}

let masterJobs = loadMasterJobs();
let masterTrash = JSON.parse(localStorage.getItem(TRASH_STORAGE_KEY)) || [];

function saveTrash(trashData) {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(trashData));
}

function loadTruckRentals() {
    const saved = localStorage.getItem(RENTALS_STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing rentals:', e);
        }
    }
    return [];
}

function saveTruckRentals(data) {
    localStorage.setItem(RENTALS_STORAGE_KEY, JSON.stringify(data));
}

function loadWarehouseRecords() {
    const saved = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing warehouse records:', e);
        }
    }
    return [];
}

function saveWarehouseRecords(data) {
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(data));
}
