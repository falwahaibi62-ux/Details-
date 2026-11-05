/**
 * MovePro Storage Manager - Synchronized with Supabase and Soft Delete (Recycle Bin)
 */

if (typeof window.saveTrash === 'undefined') {
    window.saveTrash = function() {};
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


// --- Trash Bin Management (Synced with Supabase is_deleted) ---
async function loadTrashBinFromSupabase() {
    try {
        if (!window.supabaseClient) return [];
        
        let allDeleted = [];

        // 1. الوظائف المحذوفة من jobs_report
        const { data: deletedJobs } = await window.supabaseClient
            .from('jobs_report')
            .select('*')
            .eq('is_deleted', true);
        if (deletedJobs) allDeleted.push(...deletedJobs.map(j => ({ ...j, sourceTable: 'jobs_report' })));

        // 2. إيجارات الشاحنات المحذوفة من truck_rental
        const { data: deletedRentals } = await window.supabaseClient
            .from('truck_rental')
            .select('*')
            .eq('is_deleted', true);
        if (deletedRentals) allDeleted.push(...deletedRentals.map(r => ({ ...r, sourceTable: 'truck_rental' })));

        // 3. مصروفات المستودع المحذوفة من warehouse_expenses
        const { data: deletedWarehouse } = await window.supabaseClient
            .from('warehouse_expenses')
            .select('*')
            .eq('is_deleted', true);
        if (deletedWarehouse) allDeleted.push(...deletedWarehouse.map(w => ({ ...w, sourceTable: 'warehouse_expenses' })));

        window.masterTrash = allDeleted;
        localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(allDeleted));
        return allDeleted;
    } catch (e) {
        console.error('Error loading trash from Supabase:', e);
        return [];
    }
}
window.loadTrashBinFromSupabase = loadTrashBinFromSupabase;

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


// --- Soft Delete & Restore Handlers ---
async function softDeleteRecord(tableName, recordId) {
    try {
        if (!window.supabaseClient) return false;
        const { error } = await window.supabaseClient
            .from(tableName)
            .update({ is_deleted: true })
            .eq('id', recordId);

        if (error) {
            console.error(`Error soft deleting from ${tableName}:`, error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Exception in softDeleteRecord:', e);
        return false;
    }
}
window.softDeleteRecord = softDeleteRecord;

async function restoreRecordFromTrash(tableName, recordId) {
    try {
        if (!window.supabaseClient) return false;
        const { error } = await window.supabaseClient
            .from(tableName)
            .update({ is_deleted: false })
            .eq('id', recordId);

        if (error) {
            console.error(`Error restoring from ${tableName}:`, error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Exception in restoreRecordFromTrash:', e);
        return false;
    }
}
window.restoreRecordFromTrash = restoreRecordFromTrash;


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


// --- Warehouse Records Management (Direct from Supabase) ---
async function loadWarehouseRecords() {
    try {
        if (!window.supabaseClient) {
            console.error("Supabase client is not initialized.");
            return [];
        }

        // جلب سجلات المستودع غير المحذوفة فقط مباشرة من Supabase
        const { data, error } = await window.supabaseClient
            .from('warehouse_expenses')
            .select('*')
            .or('is_deleted.is.null,is_deleted.eq.false')
            .order('id', { ascending: false });

        if (error) {
            console.error('Error fetching warehouse records from Supabase:', error);
            return [];
        }

        window.currentWarehouseRecords = data || [];
        localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(window.currentWarehouseRecords));
        
        return window.currentWarehouseRecords;

    } catch (e) {
        console.error('Exception in loadWarehouseRecords:', e);
        return [];
    }
}

function saveWarehouseRecords(data) {
    window.currentWarehouseRecords = data;
    localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(data));
}

window.loadWarehouseRecords = loadWarehouseRecords;
window.saveWarehouseRecords = saveWarehouseRecords;
