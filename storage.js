const STORAGE_KEY = 'movePro_masterJobs';
const TRASH_STORAGE_KEY = 'movepro_trash';

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
