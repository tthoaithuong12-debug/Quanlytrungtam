export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  parentName: string;
  parentPhone: string;
  goal: string;
  classes: string[]; // Class IDs
  status: 'active' | 'inactive' | 'on-hold';
  joinedDate: string;
  statusStartDate?: string;
  statusEndDate?: string;
  statusReason?: string;
  totalPaid: number;
  balance: number;
  performance?: {
    date: string;
    comment: string;
    progress: 'improving' | 'stable' | 'declining';
  }[];
}

export interface Teacher {
  id: string;
  name: string;
  shortName?: string;
  email: string;
  phone: string;
  specialization: string;
  baseSalary: number;
  hourlyRate: number;
  kpi: number;
  status: 'active' | 'inactive';
  type: 'full-time' | 'part-time';
  color?: string;
  avatar?: string;
  startDate: string;
  statusDate?: string;
  statusReason?: string;
  salaryAdjustments?: Record<string, { // key is YYYY-MM
    allowance: number;
    penalty: number;
    notes: string;
    paid?: boolean;
  }>;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  schedule: {
    day: number; // 0-6 (Sunday-Saturday)
    startTime: string;
    endTime: string;
    teacherId: string;
    assistantId?: string;
  }[];
  startDate: string;
  endDate: string;
  tuitionFee: number;
  color: string;
  students: string[]; // Student IDs
  status: 'active' | 'completed' | 'upcoming';
  type: 'IELTS' | 'Communication' | 'TOEIC' | 'Kids' | 'General';
  room: string;
  generalNotes?: string;
  studentDiscounts?: Record<string, { value: number, type: 'amount' | 'percent' }>;
  syllabus?: {
    week: number;
    topic: string;
    description: string;
  }[];
}

export interface Lesson {
  id: string;
  classId: string;
  teacherId: string;
  assistantId?: string;
  date: string;
  attendance: {
    studentId: string;
    status: 'present' | 'absent' | 'make-up' | 'late';
    remarks?: string;
  }[];
  content: string;
  homework: string;
  status: 'normal' | 'cancel' | 'make-up';
  startTime?: string;
  endTime?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  relatedId?: string; // Student ID or Teacher ID
}

export interface MonthlyBill {
  id: string;
  studentId: string;
  month: string; // YYYY-MM
  status: 'billed' | 'paid' | 'debt' | 'partial';
  amountPaid: number;
  totalAmount: number;
  deductions: number;
  totalSessions: number;
  absentSessions: number;
  makeupSessions: number;
  notes?: string;
}

export interface User {
  id: string;
  username: string;
  password?: string; // Only on server
  role: 'admin' | 'teacher';
  teacherId?: string;
  isFirstLogin?: boolean;
}

export interface AppData {
  students: Student[];
  teachers: Teacher[];
  classes: Class[];
  lessons: Lesson[];
  transactions: Transaction[];
  monthlyBills?: MonthlyBill[];
  users?: User[];
  settings: {
    currency: string;
    theme: 'light' | 'dark';
    centerName: string;
    geminiApiKey?: string;
    aiModel: string;
  };
}
