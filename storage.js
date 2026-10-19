const STORAGE_KEY = 'movePro_masterJobs';

function loadMasterJobs() {
    const savedJobs = localStorage.getItem(STORAGE_KEY);
    if (savedJobs) {
        try {
            return JSON.parse(savedJobs);
        } catch (e) {
            console.error('Error parsing stored jobs:', e);
        }
    }
    
    if (window.masterJobs && Array.isArray(window.masterJobs)) {
        saveMasterJobs(window.masterJobs);
        return window.masterJobs;
    }
    return [];
}

function saveMasterJobs(jobsArray) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobsArray));
}

let masterJobs = loadMasterJobs();
