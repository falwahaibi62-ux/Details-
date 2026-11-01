// Initialize and export the Supabase client for use across all project files
const SUPABASE_URL = 'https://xxqmvrbsurvoepubnful.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'your_publishable_key_here';

// Create a global client instance
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Helper function to fetch job records from the jobs_report table
async function getJobs() {
    const { data, error } = await window.supabaseClient
        .from('jobs_report')
        .select('*');
    
    if (error) {
        console.error('Error fetching data:', error);
        return [];
    } else {
        console.log('Data from Supabase:', data);
        return data;
    }
}
