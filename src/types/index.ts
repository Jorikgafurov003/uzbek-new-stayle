export interface User {
  id: number | string;
  name: string;
  phone: string;
  role: 'admin' | 'agent' | 'courier' | 'client';
  carType?: string;
  carPhoto?: string;
  photo?: string;
  lat?: number;
  lng?: number;
  lastSeen?: string;
  agentId?: number | string;
  commission?: number;
}

export interface Category {
  id: number | string;
  name: string;
}

export interface Product {
  id: number | string;
  name: string;
  price: number;
  discountPrice?: number;
  categoryId: number | string;
  categoryName?: string;
  image: string;
  videoUrl?: string;
  description: string;
  stock?: number;
}

export interface Banner {
  id: number | string;
  title: string;
  imageUrl: string;
  videoUrl?: string;
  link?: string;
  isActive: number;
}

export interface OrderItem {
  id: number | string;
  orderId: number | string;
  productId: number | string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number | string;
  clientId: number | string;
  clientName: string;
  clientPhone?: string;
  agentId?: number | string;
  agentName?: string;
  courierId?: number | string;
  courierName?: string;
  courierCarType?: string;
  courierCarPhoto?: string;
  totalPrice: number;
  paymentType: 'payme' | 'click' | 'cash' | 'debt';
  paymentStatus: 'pending' | 'paid';
  collectionStatus: 'pending' | 'collected';
  orderStatus: 'new' | 'confirmed' | 'on_way' | 'delivered' | 'cancelled';
  location: string;
  latitude?: number;
  longitude?: number;
  deliveryPhoto?: string;
  invoicePhoto?: string;
  createdAt: string;
  items: OrderItem[];
}

export interface Stats {
  revenue: number;
  orders: number;
  users: number;
  salesByCategory: { name: string; value: number }[];
  topAgent?: any;
  topCourier?: any;
  topClient?: any;
}

export interface Debt {
  id: number | string;
  clientId: number | string;
  clientName: string;
  clientPhone: string;
  orderId?: number | string;
  amount: number;
  dueDate?: string;
  status: 'pending' | 'paid';
  paidAt?: string;
  increasedAmount?: number;
  increaseReason?: string;
  createdAt: string;
}

export interface Salary {
  id: number | string;
  userId: number | string;
  userName: string;
  userPhoto?: string;
  month: string;
  baseSalary: number;
  salesPercentage: number;
  salesAmount: number;
  bonus: number;
  advance: number;
  total: number;
  status: 'pending' | 'paid';
  paidAt?: string;
  createdAt: string;
}

export interface BusinessInsight {
  id: number;
  summary: string;
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface EmployeeKPI {
  id: number;
  userId: number;
  role: string;
  score: number;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  updatedAt: string;
}

export interface ProfitForecast {
  date: string;
  expectedOrders: number;
  expectedRevenue: number;
  confidence: number;
}

export interface SystemHealthLog {
  id: number;
  service: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  autoFixApplied: number;
  createdAt: string;
}

export interface SecurityAlert {
  id: number;
  userId?: number;
  type: string;
  riskScore: number;
  createdAt: string;
}

export interface Rating {
  id: number;
  userId: number;
  role: string;
  rating: number;
  totalOrders: number;
  updatedAt: string;
}
