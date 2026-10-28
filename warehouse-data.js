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

if (!localStorage.getItem('movepro_warehouse_records')) {
    localStorage.setItem('movepro_warehouse_records', JSON.stringify(initialWarehouseRecords));
} else {
    localStorage.setItem('movepro_warehouse_records', JSON.stringify(initialWarehouseRecords));
}
