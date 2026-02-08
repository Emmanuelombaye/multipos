// Mock data for the EdenDropInvestment system
import { subDays, format, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';

export interface Branch {
  id: string;
  name: string;
  status: 'open' | 'closed';
  todaySales: number;
  staffCount: number;
  location: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  pricePerKg: number;
  stock: number;
  branchStock: { [branchId: string]: number };
  image: string;
  lowStockThreshold: number;
}

export interface StockEntry {
  id: string;
  productId: string;
  branchId: string;
  openingStock: number;
  closingStock?: number;
  date: string; // YYYY-MM-DD
  addedBy: string;
}

export interface Expense {
  id: string;
  branchId: string;
  category: 'supplies' | 'utilities' | 'petty-cash' | 'maintenance' | 'other';
  amount: number;
  description: string;
  timestamp: Date;
  cashier: string;
}

export interface Transaction {
  id: string;
  branchId: string;
  branchName: string;
  cashier: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  paymentMethod: 'cash' | 'mpesa' | 'card';
  timestamp: Date;
}

export interface Staff {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier';
  branchId: string;
  status: 'active' | 'inactive';
}

export const branches: Branch[] = [
  {
    id: 'branch-1',
    name: 'Edendrop Tamasha',
    status: 'open',
    todaySales: 45820,
    staffCount: 8,
    location: 'Tamasha Complex',
  },
  {
    id: 'branch-2',
    name: 'Edendrop Reem',
    status: 'open',
    todaySales: 38950,
    staffCount: 6,
    location: 'Reem Plaza',
  },
  {
    id: 'branch-3',
    name: 'Edendrop Msabweni',
    status: 'open',
    todaySales: 52340,
    staffCount: 7,
    location: 'Msabweni Road',
  },
];

export const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Beef - Premium Cut',
    category: 'Beef',
    pricePerKg: 850,
    stock: 125,
    branchStock: {
      'branch-1': 45,
      'branch-2': 35,
      'branch-3': 45,
    },
    image: '🥩',
    lowStockThreshold: 20,
  },
  {
    id: 'prod-2',
    name: 'Goat Meat',
    category: 'Goat',
    pricePerKg: 950,
    stock: 85,
    branchStock: {
      'branch-1': 30,
      'branch-2': 25,
      'branch-3': 30,
    },
    image: '🍖',
    lowStockThreshold: 15,
  },
  {
    id: 'prod-3',
    name: 'Chicken Whole',
    category: 'Chicken',
    pricePerKg: 450,
    stock: 180,
    branchStock: {
      'branch-1': 60,
      'branch-2': 50,
      'branch-3': 70,
    },
    image: '🍗',
    lowStockThreshold: 30,
  },
];

// Generate more detailed stock history
export const stockHistory: StockEntry[] = [
  // Today Feb 7
  { id: 'st-1', productId: 'prod-1', branchId: 'branch-1', openingStock: 50, date: '2026-02-07', addedBy: 'John Doe' },
  { id: 'st-2', productId: 'prod-2', branchId: 'branch-1', openingStock: 35, date: '2026-02-07', addedBy: 'John Doe' },
  { id: 'st-3', productId: 'prod-1', branchId: 'branch-2', openingStock: 40, date: '2026-02-07', addedBy: 'Peter Omondi' },
  { id: 'st-4', productId: 'prod-1', branchId: 'branch-3', openingStock: 55, date: '2026-02-07', addedBy: 'Mary Wanjiku' },
  // Yesterday Feb 6
  { id: 'st-5', productId: 'prod-1', branchId: 'branch-1', openingStock: 55, closingStock: 50, date: '2026-02-06', addedBy: 'David Kimani' },
  { id: 'st-6', productId: 'prod-2', branchId: 'branch-1', openingStock: 40, closingStock: 35, date: '2026-02-06', addedBy: 'David Kimani' },
  { id: 'st-7', productId: 'prod-1', branchId: 'branch-2', openingStock: 45, closingStock: 40, date: '2026-02-06', addedBy: 'Peter Omondi' },
];

export const expenses: Expense[] = [
  { id: 'exp-1', branchId: 'branch-1', category: 'supplies', amount: 1500, description: 'Cleaning supplies', timestamp: new Date('2026-02-07T09:00:00'), cashier: 'John Doe' },
  { id: 'exp-2', branchId: 'branch-1', category: 'petty-cash', amount: 500, description: 'Tea and sugar', timestamp: new Date('2026-02-07T11:30:00'), cashier: 'John Doe' },
  { id: 'exp-3', branchId: 'branch-2', category: 'utilities', amount: 3000, description: 'Electricity bill', timestamp: new Date('2026-02-06T15:00:00'), cashier: 'Peter Omondi' },
  { id: 'exp-4', branchId: 'branch-3', category: 'maintenance', amount: 4500, description: 'Cooler repair', timestamp: new Date('2026-02-07T10:00:00'), cashier: 'Mary Wanjiku' },
  { id: 'exp-5', branchId: 'branch-2', category: 'supplies', amount: 1200, description: 'Packing bags', timestamp: new Date('2026-02-07T16:00:00'), cashier: 'Grace Achieng' },
];

// More transactions for diverse reports
export const recentTransactions: Transaction[] = [
  {
    id: 'txn-1',
    branchId: 'branch-1',
    branchName: 'Edendrop Tamasha',
    cashier: 'John Doe',
    items: [{ productId: 'prod-1', productName: 'Beef', quantity: 2.5, price: 2125 }],
    total: 2125,
    paymentMethod: 'mpesa',
    timestamp: new Date('2026-02-07T14:32:00'),
  },
  {
    id: 'txn-2',
    branchId: 'branch-3',
    branchName: 'Edendrop Msabweni',
    cashier: 'Mary Wanjiku',
    items: [{ productId: 'prod-2', productName: 'Goat Meat', quantity: 3.0, price: 2850 }],
    total: 2850,
    paymentMethod: 'cash',
    timestamp: new Date('2026-02-07T14:25:00'),
  },
  {
    id: 'txn-3',
    branchId: 'branch-2',
    branchName: 'Edendrop Reem',
    cashier: 'Peter Omondi',
    items: [{ productId: 'prod-1', productName: 'Beef', quantity: 1.5, price: 1275 }],
    total: 1275,
    paymentMethod: 'mpesa',
    timestamp: new Date('2026-02-07T14:18:00'),
  },
  {
    id: 'txn-4',
    branchId: 'branch-1',
    branchName: 'Edendrop Tamasha',
    cashier: 'Jane Muthoni',
    items: [{ productId: 'prod-1', productName: 'Beef', quantity: 5.0, price: 4250 }],
    total: 4250,
    paymentMethod: 'cash',
    timestamp: new Date('2026-02-06T11:00:00'),
  },
];

export const staff: Staff[] = [
  { id: 'staff-1', name: 'Admin User', role: 'admin', branchId: 'all', status: 'active' },
  { id: 'staff-2', name: 'John Doe', role: 'cashier', branchId: 'branch-1', status: 'active' },
  { id: 'staff-3', name: 'Jane Muthoni', role: 'cashier', branchId: 'branch-1', status: 'active' },
  { id: 'staff-4', name: 'Peter Omondi', role: 'manager', branchId: 'branch-2', status: 'active' },
  { id: 'staff-5', name: 'Mary Wanjiku', role: 'cashier', branchId: 'branch-3', status: 'active' },
  { id: 'staff-6', name: 'David Kimani', role: 'manager', branchId: 'branch-1', status: 'active' },
];

// Generate growth data for different timeframes
const generateGrowthData = () => {
  const data: any = {
    day: [],
    '3day': [],
    week: [],
    month: [],
    '3month': [],
  };

  const now = new Date('2026-02-07T18:00:00');

  // Day (Hourly)
  for (let i = 8; i <= 18; i++) {
    data.day.push({
      time: `${i}:00`,
      sales: 5000 + Math.random() * 15000,
      expenses: Math.random() * 2000,
    });
  }

  // 3 Days
  for (let i = 2; i >= 0; i--) {
    const d = subDays(now, i);
    data['3day'].push({
      date: format(d, 'MMM dd'),
      sales: 80000 + Math.random() * 40000,
      expenses: 5000 + Math.random() * 5000,
    });
  }

  // Week
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    data.week.push({
      date: format(d, 'EEE'),
      sales: 70000 + Math.random() * 90000,
      expenses: 4000 + Math.random() * 8000,
    });
  }

  // Month
  for (let i = 29; i >= 0; i--) {
    const d = subDays(now, i);
    data.month.push({
      date: format(d, 'dd MMM'),
      sales: 60000 + Math.random() * 100000,
      expenses: 3000 + Math.random() * 10000,
    });
  }

  // 3 Months (Weekly average)
  for (let i = 12; i >= 0; i--) {
    const d = subDays(now, i * 7);
    data['3month'].push({
      date: `Week ${13 - i}`,
      sales: 500000 + Math.random() * 300000,
      expenses: 50000 + Math.random() * 40000,
    });
  }

  return data;
};

export const growthData = generateGrowthData();

export const weeklySalesData = growthData.week;

export const branchSalesComparison = [
  { branch: 'Tamasha', sales: 45820 },
  { branch: 'Reem', sales: 38950 },
  { branch: 'Msabweni', sales: 52340 },
];

export const topProducts = [
  { name: 'Beef - Premium Cut', sales: 2850, percentage: 35 },
  { name: 'Goat Meat', sales: 2340, percentage: 30 },
  { name: 'Chicken Whole', sales: 2120, percentage: 35 },
];
