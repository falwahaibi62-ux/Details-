/**
 * MovePro - Private Truck Rental Data Module (Optimized)
 */

if (typeof window.RENTAL_STORAGE_KEY === 'undefined') {
    window.RENTAL_STORAGE_KEY = 'movepro_private_truck_rentals';
}

if (typeof window.forcedInitialRentals === 'undefined') {
    window.forcedInitialRentals = [
        { date: "6/24/2026", days: 24, amount: 6000, paymentType: "Cheque", paidBy: "Sharef", truckLabel: "24 days rental paid by Sharef" },
        { date: "7/9/2026", days: 13, amount: 3250, paymentType: "Cash", paidBy: "Abu Essa", truckLabel: "13 days rental paid to Abu Essa" },
        { date: "7/20/2026", days: 8, amount: 1860, paymentType: "Cash", paidBy: "Penski", truckLabel: "8 days rental paid by Penski" },
        { date: "8/18/2026", days: 1, amount: 425, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "8/21/2026", days: 1, amount: 675, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "8/26/2026", days: 1, amount: 759, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "8/31/2026", days: 1, amount: 1282, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "9/18/2026", days: 2, amount: 240, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "2 days U-Haul + Storage rental" },
        { date: "9/25/2026", days: 1, amount: 533, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "9/28/2026", days: 1, amount: 568, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "10/5/2026", days: 2, amount: 1150, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "2 days U-Haul rental" },
        { date: "10/12/2026", days: 1, amount: 610, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "1 day U-Haul rental" },
        { date: "10/18/2026", days: 3, amount: 1720, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "3 days U-Haul rental" },
        { date: "10/24/2026", days: 2, amount: 1250, paymentType: "Cash", paidBy: "U-Haul", truckLabel: "2 days U-Haul rental" }
    ];
}

function loadPrivateTruckRentals() {
    const storageKey = window.RENTAL_STORAGE_KEY;
    const initialData = window.forcedInitialRentals;
    
    let saved = localStorage.getItem(storageKey);
    let rentals = [];

    try {
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                rentals = parsed;
            }
        }
    } catch (e) {
        console.error('Error parsing rentals from localStorage:', e);
    }

    // إذا كانت البيانات المخزنة فارغة أو أقل من البيانات الأساسية، يتم إعادة تهئيتها وتعبئتها فوراً
    if (rentals.length === 0) {
        rentals = [...initialData];
        localStorage.setItem(storageKey, JSON.stringify(rentals));
    }

    // ترتيب السجلات تلقائياً من الأحدث للأقدم
    return rentals.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}
window.loadPrivateTruckRentals = loadPrivateTruckRentals;
