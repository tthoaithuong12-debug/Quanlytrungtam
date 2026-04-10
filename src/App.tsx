import React, { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { AppData, Student, Teacher, Class, Lesson, Transaction, MonthlyBill, User } from './types';
import { INITIAL_DATA } from './constants';
import { cn } from './lib/utils';
import { FirebaseDB } from './lib/firebase/db';
import { generateStudentReport } from './lib/docxHelper';
import { exportTransactionsToExcel } from './lib/excelHelper';
import { D3FinancialChart } from './components/D3FinancialChart';
import { ApiKeySettingsModal } from './components/ApiKeySettingsModal';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Calendar, 
  Wallet, 
  Settings, 
  Plus, 
  Search, 
  Bell, 
  Menu, 
  X,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Book,
  ClipboardList,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  DollarSign,
  UserCheck,
  BookOpen,
  Library,
  BrainCircuit,
  Download,
  Upload,
  Eye,
  EyeOff,
  Mail,
  Phone,
  ListTodo,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Sun,
  CloudSun,
  Moon,
  LogIn,
  LogOut,
  Lock,
  User as UserIcon,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { callGeminiAI, AI_PROMPTS } from './services/gemini';
import Markdown from 'react-markdown';
import { toPng } from 'html-to-image';
import download from 'downloadjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-primary text-white shadow-lg shadow-primary/30" 
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon: Icon, trend, color }: { title: string, value: string, icon: any, trend?: string, color: string }) => (
  <div className="glass-card p-6 flex items-center justify-between">
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold mt-1">{value}</h3>
      {trend && (
        <p className={cn("text-xs mt-2 font-medium", trend.startsWith('+') ? "text-success" : "text-error")}>
          {trend} so với tháng trước
        </p>
      )}
    </div>
    <div className={cn("p-4 rounded-2xl", color)}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

const ClassDetailModal = ({ 
  isOpen, 
  onClose, 
  classData, 
  teacher,
  lessons = []
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  classData: Class | null, 
  teacher?: Teacher,
  lessons?: Lesson[]
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview');

  if (!isOpen || !classData) return null;

  const getDayName = (day: number) => {
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[day];
  };

  const classLessons = lessons.filter(l => l.classId === classData.id).sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix());

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="relative h-32 flex items-end p-6" style={{ backgroundColor: classData.color }}>
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                <BookOpen size={32} />
              </div>
              <div className="text-white">
                <h2 className="text-xl font-bold leading-tight">{classData.name}</h2>
                <p className="text-sm opacity-80">{classData.type} Class</p>
              </div>
            </div>
          </div>

          <div className="flex border-b border-slate-100 bg-slate-50 px-6">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2",
                activeTab === 'overview' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              Tổng quan
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={cn(
                "px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2",
                activeTab === 'sessions' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              Buổi học (Sessions)
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giáo viên</p>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {teacher?.name.charAt(0)}
                      </div>
                      <p className="text-sm font-bold text-slate-700">{teacher?.name}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phòng học</p>
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin size={14} className="text-slate-400" />
                      <p className="text-sm font-bold">{classData.room}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lịch học & Thời gian</p>
                  {classData.schedule.map((s, i) => {
                    const start = dayjs(`2024-01-01 ${s.startTime}`);
                    const end = dayjs(`2024-01-01 ${s.endTime}`);
                    const duration = end.diff(start, 'minute');
                    
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary">
                            <Calendar size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">{getDayName(s.day)}</p>
                            <p className="text-[10px] text-slate-500">{s.startTime} - {s.endTime}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                            <Clock size={10} />
                            <span className="text-[9px] font-bold uppercase">Thời lượng</span>
                          </div>
                          <p className="text-xs font-bold text-primary">{duration} phút</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="pb-3">Ngày</th>
                        <th className="pb-3">Nội dung</th>
                        <th className="pb-3">Trạng thái</th>
                        <th className="pb-3">BTVN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classLessons.map(lesson => (
                        <tr key={lesson.id} className="text-xs">
                          <td className="py-3 font-bold text-slate-700">{dayjs(lesson.date).format('DD/MM/YYYY')}</td>
                          <td className="py-3 text-slate-600 max-w-[150px] truncate">{lesson.content}</td>
                          <td className="py-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                              lesson.status === 'normal' ? "bg-success/10 text-success" :
                              lesson.status === 'cancel' ? "bg-error/10 text-error" : "bg-warning/10 text-warning"
                            )}>
                              {lesson.status === 'normal' ? 'Normal' : lesson.status === 'cancel' ? 'Cancel' : 'Make-up'}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500 italic">{lesson.homework || 'Không có'}</td>
                        </tr>
                      ))}
                      {classLessons.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-slate-400 italic">Chưa có dữ liệu buổi học</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                classData.status === 'active' ? "bg-success" : 
                classData.status === 'upcoming' ? "bg-secondary" : "bg-slate-300"
              )} />
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                {classData.status === 'active' ? 'Đang hoạt động' : 
                 classData.status === 'upcoming' ? 'Sắp khai giảng' : 'Đã kết thúc'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const AttendanceModal = ({ 
  isOpen, 
  onClose, 
  classData, 
  students, 
  teachers,
  lesson,
  onSave 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  classData: Class | null, 
  students: Student[],
  teachers: Teacher[],
  lesson?: Lesson | null,
  onSave: (lesson: Lesson | Omit<Lesson, 'id'>) => void
}) => {
  const [attendance, setAttendance] = useState<Record<string, { status: 'present' | 'absent' | 'make-up' | 'late', remarks: string }>>({});
  const [content, setContent] = useState('');
  const [homework, setHomework] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<'normal' | 'cancel' | 'make-up'>('normal');
  const [teacherId, setTeacherId] = useState('');
  const [assistantId, setAssistantId] = useState('');

  useEffect(() => {
    if (isOpen && classData) {
      if (lesson) {
        const initialAttendance: Record<string, { status: 'present' | 'absent' | 'make-up' | 'late', remarks: string }> = {};
        lesson.attendance.forEach(a => {
          initialAttendance[a.studentId] = { status: a.status, remarks: a.remarks || '' };
        });
        setAttendance(initialAttendance);
        setContent(lesson.content);
        setHomework(lesson.homework);
        setDate(lesson.date);
        setStartTime(lesson.startTime || '');
        setEndTime(lesson.endTime || '');
        setStatus(lesson.status);
        setTeacherId(lesson.teacherId);
        setAssistantId(lesson.assistantId || '');
      } else {
        const initialAttendance: Record<string, { status: 'present' | 'absent' | 'make-up' | 'late', remarks: string }> = {};
        classData.students.forEach(sid => {
          initialAttendance[sid] = { status: 'present', remarks: '' };
        });
        setAttendance(initialAttendance);
        setContent('');
        setHomework('');
        setDate(dayjs().format('YYYY-MM-DD'));
        setStartTime('');
        setEndTime('');
        setStatus('normal');
        
        // Default teacher for this session based on schedule or primary teacher
        const dayOfWeek = dayjs().day();
        const scheduledSession = classData.schedule?.find(s => s.day === dayOfWeek);
        setTeacherId(scheduledSession?.teacherId || classData.teacherId);
        setAssistantId(scheduledSession?.assistantId || '');
        if (scheduledSession) {
          setStartTime(scheduledSession.startTime);
          setEndTime(scheduledSession.endTime);
        }
      }
    }
  }, [isOpen, classData, lesson]);

  // Update teacherId and times when date changes (only for new lessons)
  useEffect(() => {
    if (isOpen && classData && date && !lesson) {
      const dayOfWeek = dayjs(date).day();
      const scheduledSession = classData.schedule?.find(s => s.day === dayOfWeek);
      if (scheduledSession) {
        setTeacherId(scheduledSession.teacherId);
        setAssistantId(scheduledSession.assistantId || '');
        setStartTime(scheduledSession.startTime);
        setEndTime(scheduledSession.endTime);
      }
    }
  }, [date, isOpen, classData, lesson]);

  if (!isOpen || !classData) return null;

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'make-up' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleRemarkChange = (studentId: string, remarks: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks }
    }));
  };

  const handleSave = () => {
    const lessonData: Lesson | Omit<Lesson, 'id'> = {
      ...(lesson ? { id: lesson.id } : {}),
      classId: classData.id,
      teacherId,
      assistantId,
      date,
      startTime,
      endTime,
      content,
      homework,
      status,
      attendance: Object.entries(attendance).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        remarks: data.remarks
      }))
    };
    onSave(lessonData);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Điểm danh & Ghi chú buổi học</h2>
              <p className="text-sm text-slate-500">{classData.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ngày học</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Giáo viên buổi này</label>
                <select 
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.filter(t => t.status === 'active').map(t => (
                    <option key={t.id} value={t.id}>{t.shortName || t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trợ giảng buổi này</label>
                <select 
                  value={assistantId}
                  onChange={(e) => setAssistantId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Chọn trợ giảng --</option>
                  {teachers.filter(t => t.status === 'active').map(t => (
                    <option key={t.id} value={t.id}>{t.shortName || t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái buổi học</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="normal">Bình thường</option>
                  <option value="cancel">Hủy buổi</option>
                  <option value="make-up">Dạy bù</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Danh sách học viên</h3>
              <div className="space-y-3">
                {students.map(student => (
                  <div key={student.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-xs font-bold text-primary">
                          {student.name.charAt(0)}
                        </div>
                        <p className="text-sm font-bold text-slate-700">{student.name}</p>
                      </div>
                      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                        {(['present', 'absent', 'make-up'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(student.id, s)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                              attendance[student.id]?.status === s 
                                ? (s === 'present' ? "bg-success text-white" : 
                                   s === 'absent' ? "bg-error text-white" : "bg-secondary text-white")
                                : "text-slate-400 hover:bg-slate-50"
                            )}
                          >
                            {s === 'present' ? 'Có mặt' : s === 'absent' ? 'Vắng' : 'Học bù'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Nhận xét học viên..." 
                      value={attendance[student.id]?.remarks || ''}
                      onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nội dung bài học</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Hôm nay lớp học gì..."
                  className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Bài tập về nhà</label>
                <textarea 
                  value={homework}
                  onChange={(e) => setHomework(e.target.value)}
                  placeholder="Giao bài tập cho học viên..."
                  className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
              Hủy bỏ
            </button>
            <button onClick={handleSave} className="flex-1 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
              Lưu buổi học & Nhật ký
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const StudentModal = ({
  isOpen,
  onClose,
  student,
  onSave,
  geminiApiKey
}: {
  isOpen: boolean,
  onClose: () => void,
  student: Student | null,
  onSave: (student: Student) => void,
  geminiApiKey?: string
}) => {
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    email: '',
    phone: '',
    dob: '',
    parentName: '',
    parentPhone: '',
    goal: '',
    status: 'active',
    classes: [],
    joinedDate: dayjs().format('YYYY-MM-DD'),
    statusStartDate: '',
    statusEndDate: '',
    statusReason: '',
    totalPaid: 0,
    balance: 0
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues: Partial<Student> = {
        name: '',
        email: '',
        phone: '',
        dob: '',
        parentName: '',
        parentPhone: '',
        goal: '',
        status: 'active',
        classes: [],
        joinedDate: dayjs().format('YYYY-MM-DD'),
        statusStartDate: '',
        statusEndDate: '',
        statusReason: '',
        totalPaid: 0,
        balance: 0
      };

      if (student) {
        setFormData({
          ...defaultValues,
          ...student,
          // Ensure optional fields are at least empty strings for controlled inputs
          statusStartDate: student.statusStartDate || '',
          statusEndDate: student.statusEndDate || '',
          statusReason: student.statusReason || ''
        });
      } else {
        setFormData(defaultValues);
      }
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: student?.id || `std_${Date.now()}`,
    } as Student);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{student ? 'Chỉnh sửa học viên' : 'Thêm học viên mới'}</h2>
              <p className="text-sm text-slate-500">Nhập thông tin cá nhân, phụ huynh và trạng thái</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin cá nhân</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Họ và tên</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Số điện thoại</label>
                  <input 
                    required
                    type="tel" 
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email</label>
                  <input 
                    type="email" 
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Ngày sinh</label>
                  <input 
                    type="date" 
                    value={formData.dob || ''}
                    onChange={e => setFormData({...formData, dob: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Mục tiêu học tập</label>
                <input 
                  placeholder="Ví dụ: IELTS 6.5, Giao tiếp cơ bản..."
                  type="text" 
                  value={formData.goal || ''}
                  onChange={e => setFormData({...formData, goal: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin phụ huynh</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Họ tên phụ huynh</label>
                  <input 
                    type="text" 
                    value={formData.parentName || ''}
                    onChange={e => setFormData({...formData, parentName: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">SĐT phụ huynh</label>
                  <input 
                    type="tel" 
                    value={formData.parentPhone || ''}
                    onChange={e => setFormData({...formData, parentPhone: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái học tập</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Trạng thái</label>
                  <select 
                    value={formData.status || 'active'}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Đang học</option>
                    <option value="inactive">Nghỉ học</option>
                    <option value="on-hold">Bảo lưu</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Ngày tham gia</label>
                  <input 
                    type="date" 
                    value={formData.joinedDate || ''}
                    onChange={e => setFormData({...formData, joinedDate: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {(formData.status === 'inactive' || formData.status === 'on-hold') && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-2"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Từ ngày</label>
                      <input 
                        required
                        type="date" 
                        value={formData.statusStartDate || ''}
                        onChange={e => setFormData({...formData, statusStartDate: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    {formData.status === 'on-hold' && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Đến ngày (dự kiến)</label>
                        <input 
                          type="date" 
                          value={formData.statusEndDate || ''}
                          onChange={e => setFormData({...formData, statusEndDate: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Lý do</label>
                    <input 
                      required
                      placeholder="Nhập lý do nghỉ học hoặc bảo lưu..."
                      type="text" 
                      value={formData.statusReason || ''}
                      onChange={e => setFormData({...formData, statusReason: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thành tích học tập</h3>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!student) {
                        Swal.fire('Lỗi', 'Chưa có thông tin học viên. Hãy lưu trước.', 'warning');
                        return;
                      }
                      Swal.fire({ title: 'Đang tạo báo cáo...', didOpen: () => Swal.showLoading() });
                      try {
                        const blob = await generateStudentReport(formData as Student, "English Center Management");
                        download(blob, `Report_${formData.name}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
                        Swal.close();
                      } catch (err: any) {
                        Swal.fire('Lỗi', 'Không thể tạo file docx', 'error');
                      }
                    }}
                    className="text-[10px] flex items-center gap-1 font-bold text-teal-600 hover:underline"
                  >
                    <Download size={12} /> Tải Report (.docx)
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!geminiApiKey) {
                        Swal.fire('Lỗi', 'Vui lòng cấu hình Gemini API Key trong mục Cài đặt trước', 'error');
                        return;
                      }
                      Swal.fire({ title: 'Đang tạo nhận xét...', didOpen: () => Swal.showLoading() });
                      try {
                        const studentDataForAI = JSON.stringify({
                          name: formData.name, 
                          goal: formData.goal, 
                          performance: formData.performance || []
                        });
                        const review = await callGeminiAI(AI_PROMPTS.GENERATE_STUDENT_REVIEW(studentDataForAI), geminiApiKey);
                        const perf = formData.performance || [];
                        setFormData({
                          ...formData,
                          performance: [...perf, { date: dayjs().format('YYYY-MM-DD'), comment: review, progress: 'improving' }]
                        });
                        Swal.close();
                      } catch (err: any) {
                        Swal.fire('Lỗi', err.message, 'error');
                      }
                    }}
                    className="text-[10px] flex items-center gap-1 font-bold text-indigo-500 hover:underline"
                  >
                    <BrainCircuit size={12} /> Sao chép AI
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      const perf = formData.performance || [];
                      setFormData({
                        ...formData,
                        performance: [...perf, { date: dayjs().format('YYYY-MM-DD'), comment: '', progress: 'stable' }]
                      });
                    }}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    + Thêm nhận xét
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {(formData.performance || []).map((p, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        value={p.date}
                        onChange={e => {
                          const newPerf = [...(formData.performance || [])];
                          newPerf[idx].date = e.target.value;
                          setFormData({...formData, performance: newPerf});
                        }}
                        className="text-[10px] bg-white border border-slate-200 rounded px-1"
                      />
                      <select 
                        value={p.progress}
                        onChange={e => {
                          const newPerf = [...(formData.performance || [])];
                          newPerf[idx].progress = e.target.value as any;
                          setFormData({...formData, performance: newPerf});
                        }}
                        className="text-[10px] bg-white border border-slate-200 rounded px-1"
                      >
                        <option value="improving">Tiến bộ</option>
                        <option value="stable">Ổn định</option>
                        <option value="declining">Giảm sút</option>
                      </select>
                      <button 
                        type="button"
                        onClick={() => {
                          const newPerf = (formData.performance || []).filter((_, i) => i !== idx);
                          setFormData({...formData, performance: newPerf});
                        }}
                        className="ml-auto text-error hover:text-error/80"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <textarea 
                      placeholder="Nhận xét, tiến bộ..."
                      value={p.comment}
                      onChange={e => {
                        const newPerf = [...(formData.performance || [])];
                        newPerf[idx].comment = e.target.value;
                        setFormData({...formData, performance: newPerf});
                      }}
                      className="w-full text-[10px] bg-white border border-slate-200 rounded p-2 outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-[10px] text-amber-700 leading-relaxed">
              <p className="font-bold mb-1">Lưu ý về quản lý lớp học:</p>
              <p>Lớp học của học viên được quản lý và đồng bộ tự động từ module Lớp học. Bạn không thể chỉnh sửa danh sách lớp trực tiếp tại đây để đảm bảo tính chính xác của dữ liệu hệ thống.</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
                Hủy bỏ
              </button>
              <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                {student ? 'Cập nhật' : 'Thêm học viên'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const ClassModal = ({
  isOpen,
  onClose,
  classData,
  teachers,
  students,
  onSave
}: {
  isOpen: boolean,
  onClose: () => void,
  classData: Class | null,
  teachers: Teacher[],
  students: Student[],
  onSave: (cls: Class) => void
}) => {
  const [formData, setFormData] = useState<Partial<Class>>({
    name: '',
    teacherId: '',
    schedule: [],
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().add(6, 'month').format('YYYY-MM-DD'),
    tuitionFee: 0,
    color: '#4A90E2',
    students: [],
    status: 'active',
    type: 'General',
    room: ''
  });
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (classData) {
        setFormData({ ...classData });
      } else {
        setFormData({
          name: '',
          teacherId: '',
          schedule: [],
          startDate: dayjs().format('YYYY-MM-DD'),
          endDate: dayjs().add(6, 'month').format('YYYY-MM-DD'),
          tuitionFee: 0,
          color: '#4A90E2',
          students: [],
          status: 'upcoming',
          type: 'General',
          room: ''
        });
      }
    }
  }, [isOpen, classData]);

  // Automatic status calculation
  useEffect(() => {
    if (formData.startDate) {
      const now = dayjs();
      const start = dayjs(formData.startDate);
      const end = formData.endDate ? dayjs(formData.endDate) : null;

      let newStatus: 'active' | 'upcoming' | 'completed' = 'active';
      if (start.isAfter(now, 'day')) {
        newStatus = 'upcoming';
      } else if (end && end.isBefore(now, 'day')) {
        newStatus = 'completed';
      } else {
        newStatus = 'active';
      }

      if (newStatus !== formData.status) {
        setFormData(prev => ({ ...prev, status: newStatus }));
      }
    }
  }, [formData.startDate, formData.endDate]);

  // Automatic primary teacher calculation
  useEffect(() => {
    if (formData.schedule && formData.schedule.length > 0) {
      const teacherCounts: Record<string, number> = {};
      formData.schedule.forEach(s => {
        if (s.teacherId) {
          teacherCounts[s.teacherId] = (teacherCounts[s.teacherId] || 0) + 1;
        }
      });
      
      let primaryTeacherId = '';
      let maxSessions = 0;
      
      Object.entries(teacherCounts).forEach(([tid, count]) => {
        if (count > maxSessions) {
          maxSessions = count;
          primaryTeacherId = tid;
        }
      });
      
      if (primaryTeacherId && primaryTeacherId !== formData.teacherId) {
        setFormData(prev => ({ ...prev, teacherId: primaryTeacherId }));
      }
    }
  }, [formData.schedule]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.teacherId) {
      Swal.fire('Lỗi', 'Vui lòng nhập tên lớp và chọn giáo viên', 'error');
      return;
    }
    onSave({
      ...formData,
      id: classData?.id || `cls_${Date.now()}`,
    } as Class);
    onClose();
  };

  const addSchedule = () => {
    setFormData({
      ...formData,
      schedule: [...(formData.schedule || []), { day: 1, startTime: '18:00', endTime: '20:00', teacherId: formData.teacherId || '' }]
    });
  };

  const removeSchedule = (idx: number) => {
    setFormData({
      ...formData,
      schedule: (formData.schedule || []).filter((_, i) => i !== idx)
    });
  };

  const updateSchedule = (idx: number, field: string, value: any) => {
    const newSchedule = [...(formData.schedule || [])];
    newSchedule[idx] = { ...newSchedule[idx], [field]: value };
    setFormData({ ...formData, schedule: newSchedule });
  };

  const updateStudentDiscount = (sid: string, value: number, type: 'amount' | 'percent') => {
    const currentDiscounts = { ...(formData.studentDiscounts || {}) };
    currentDiscounts[sid] = { value, type };
    setFormData({ ...formData, studentDiscounts: currentDiscounts });
  };

  const calculateActualTuition = (sid: string) => {
    const base = formData.tuitionFee || 0;
    const discount = formData.studentDiscounts?.[sid];
    if (!discount) return base;
    if (discount.type === 'percent') {
      return base * (1 - discount.value / 100);
    }
    return Math.max(0, base - discount.value);
  };

  const totalActualTuition = (formData.students || []).reduce((acc, sid) => acc + calculateActualTuition(sid), 0);

  const toggleStudent = (sid: string) => {
    const currentStudents = [...(formData.students || [])];
    if (currentStudents.includes(sid)) {
      setFormData({ ...formData, students: currentStudents.filter(id => id !== sid) });
    } else {
      setFormData({ ...formData, students: [...currentStudents, sid] });
    }
  };

  const activeTeachers = teachers.filter(t => t.status === 'active');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800">{classData ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Thông tin cơ bản</h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Tên lớp học</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                    placeholder="VD: IELTS Foundation 01"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Loại lớp</label>
                    <select 
                      value={formData.type || 'General'} 
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="IELTS">IELTS</option>
                      <option value="Communication">Giao tiếp</option>
                      <option value="TOEIC">TOEIC</option>
                      <option value="Kids">Tiếng Anh trẻ em</option>
                      <option value="General">Tổng quát</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Trạng thái (Tự động)</label>
                    <div className={cn(
                      "w-full px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2",
                      formData.status === 'active' ? "bg-success/10 text-success" :
                      formData.status === 'upcoming' ? "bg-warning/10 text-warning" :
                      "bg-slate-100 text-slate-500"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        formData.status === 'active' ? "bg-success" :
                        formData.status === 'upcoming' ? "bg-warning" :
                        "bg-slate-400"
                      )} />
                      {formData.status === 'active' ? 'Đang mở' : 
                       formData.status === 'upcoming' ? 'Sắp mở' : 'Đã kết thúc'}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Giáo viên phụ trách (Tự động)</label>
                  <div className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] text-primary">
                      {teachers.find(t => t.id === formData.teacherId)?.name.charAt(0) || '?'}
                    </div>
                    {teachers.find(t => t.id === formData.teacherId)?.name || 'Chưa xác định (Dựa trên lịch học)'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Ngày bắt đầu</label>
                    <input 
                      type="date" 
                      value={formData.startDate || ''} 
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Ngày kết thúc</label>
                    <input 
                      type="date" 
                      value={formData.endDate || ''} 
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Học phí / Học viên (VND)</label>
                    <input 
                      type="number" 
                      value={formData.tuitionFee || 0} 
                      onChange={(e) => setFormData({ ...formData, tuitionFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Tổng học phí lớp (Dự kiến)</label>
                    <div className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-primary">
                      {totalActualTuition.toLocaleString()} VND
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Phòng học</label>
                  <input 
                    type="text" 
                    value={formData.room || ''} 
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                    placeholder="VD: Phòng 101"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Lịch học hàng tuần</h3>
                  <button type="button" onClick={addSchedule} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    <Plus size={14} /> Thêm buổi
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.schedule?.map((s, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <select 
                          value={s.day} 
                          onChange={(e) => updateSchedule(idx, 'day', parseInt(e.target.value))}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none"
                        >
                          <option value={1}>Thứ 2</option>
                          <option value={2}>Thứ 3</option>
                          <option value={3}>Thứ 4</option>
                          <option value={4}>Thứ 5</option>
                          <option value={5}>Thứ 6</option>
                          <option value={6}>Thứ 7</option>
                          <option value={0}>Chủ Nhật</option>
                        </select>
                        <input 
                          type="time" 
                          value={s.startTime} 
                          onChange={(e) => updateSchedule(idx, 'startTime', e.target.value)}
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none" 
                        />
                        <span className="text-slate-400">-</span>
                        <input 
                          type="time" 
                          value={s.endTime} 
                          onChange={(e) => updateSchedule(idx, 'endTime', e.target.value)}
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none" 
                        />
                        <button type="button" onClick={() => removeSchedule(idx)} className="p-1.5 text-slate-400 hover:text-error transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Giáo viên chính</label>
                          <select 
                            value={s.teacherId || ''} 
                            onChange={(e) => updateSchedule(idx, 'teacherId', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] outline-none"
                          >
                            <option value="">-- Chọn GV --</option>
                            {activeTeachers.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Trợ giảng</label>
                          <select 
                            value={s.assistantId || ''} 
                            onChange={(e) => updateSchedule(idx, 'assistantId', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] outline-none"
                          >
                            <option value="">-- Chọn trợ giảng --</option>
                            {activeTeachers.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!formData.schedule || formData.schedule.length === 0) && (
                    <p className="text-xs text-slate-400 italic text-center py-4">Chưa có lịch học được thiết lập</p>
                  )}
                </div>

                <div className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Danh sách học viên ({formData.students?.length || 0})</h3>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Tìm học viên..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] outline-none focus:ring-2 focus:ring-primary/20 w-48"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-2xl p-2 space-y-2">
                    {students
                      .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.phone.includes(studentSearch))
                      .map(s => {
                        const isSelected = formData.students?.includes(s.id);
                        const actualTuition = calculateActualTuition(s.id);
                        const discount = formData.studentDiscounts?.[s.id];
                        
                        return (
                          <div key={s.id} className={cn(
                            "p-3 rounded-xl border transition-all",
                            isSelected ? "bg-primary/5 border-primary/20" : "bg-white border-slate-100 hover:bg-slate-50"
                          )}>
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => toggleStudent(s.id)}
                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-slate-700">{s.name}</p>
                                <p className="text-[10px] text-slate-400">{s.phone}</p>
                              </div>
                              {isSelected && (
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-slate-400 line-through">{(formData.tuitionFee || 0).toLocaleString()}</p>
                                  <p className="text-xs font-bold text-success">{actualTuition.toLocaleString()} VND</p>
                                </div>
                              )}
                            </div>
                            
                            {isSelected && (
                              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Giảm giá:</span>
                                <input 
                                  type="number"
                                  placeholder="Giá trị"
                                  value={discount?.value || 0}
                                  onChange={(e) => updateStudentDiscount(s.id, parseFloat(e.target.value) || 0, discount?.type || 'amount')}
                                  className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] outline-none"
                                />
                                <select 
                                  value={discount?.type || 'amount'}
                                  onChange={(e) => updateStudentDiscount(s.id, discount?.value || 0, e.target.value as 'amount' | 'percent')}
                                  className="px-1 py-1 bg-white border border-slate-200 rounded text-[10px] outline-none"
                                >
                                  <option value="amount">VND</option>
                                  <option value="percent">%</option>
                                </select>
                                {discount && discount.value > 0 && (
                                  <span className="text-[10px] font-medium text-error">
                                    (-{discount.type === 'percent' ? `${discount.value}%` : discount.value.toLocaleString()})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.phone.includes(studentSearch)).length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-4">Không tìm thấy học viên phù hợp</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
              Hủy bỏ
            </button>
            <button onClick={handleSubmit} className="flex-1 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
              {classData ? 'Cập nhật lớp học' : 'Tạo lớp học mới'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const TeacherModal = ({
  isOpen,
  onClose,
  teacher,
  onSave
}: {
  isOpen: boolean,
  onClose: () => void,
  teacher: Teacher | null,
  onSave: (teacher: Teacher) => void
}) => {
  const [formData, setFormData] = useState<Partial<Teacher>>({
    name: '',
    shortName: '',
    email: '',
    phone: '',
    specialization: '',
    baseSalary: 0,
    hourlyRate: 0,
    kpi: 100,
    status: 'active',
    type: 'full-time',
    avatar: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    statusDate: '',
    statusReason: ''
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues: Partial<Teacher> = {
        name: '',
        shortName: '',
        email: '',
        phone: '',
        specialization: '',
        baseSalary: 0,
        hourlyRate: 0,
        kpi: 100,
        status: 'active',
        type: 'full-time',
        avatar: '',
        startDate: dayjs().format('YYYY-MM-DD'),
        statusDate: '',
        statusReason: ''
      };

      if (teacher) {
        setFormData({
          ...defaultValues,
          ...teacher
        });
      } else {
        setFormData(defaultValues);
      }
    }
  }, [isOpen, teacher]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: teacher?.id || `tch_${Date.now()}`,
    } as Teacher);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{teacher ? 'Chỉnh sửa giáo viên' : 'Thêm giáo viên mới'}</h2>
              <p className="text-sm text-slate-500">Nhập thông tin cá nhân, chuyên môn và chế độ lương</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 overflow-hidden relative group">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <>
                      <Upload size={20} />
                      <span className="text-[10px] font-bold mt-1 text-center px-2">Chọn ảnh (JPG/PNG)</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({...formData, avatar: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {formData.avatar && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload size={20} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Họ và tên</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Tên viết tắt</label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: A. Nguyen"
                      value={formData.shortName || ''}
                      onChange={e => setFormData({...formData, shortName: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Số điện thoại</label>
                  <input 
                    required
                    type="tel" 
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Chuyên môn</label>
                  <input 
                    required
                    placeholder="Ví dụ: IELTS, Kids..."
                    type="text" 
                    value={formData.specialization || ''}
                    onChange={e => setFormData({...formData, specialization: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Hình thức</label>
                  <select 
                    value={formData.type || 'full-time'}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ngày bắt đầu giảng dạy</label>
                <input 
                  required
                  type="date" 
                  value={formData.startDate || ''}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chế độ lương & Trạng thái</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Lương cơ bản (Full-time)</label>
                  <input 
                    type="number" 
                    value={formData.baseSalary || 0}
                    onChange={e => setFormData({...formData, baseSalary: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Lương theo giờ</label>
                  <input 
                    required
                    type="number" 
                    value={formData.hourlyRate || 0}
                    onChange={e => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">KPI Hiệu suất (%)</label>
                  <input 
                    type="number" 
                    value={formData.kpi || 0}
                    onChange={e => setFormData({...formData, kpi: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Trạng thái</label>
                  <select 
                    value={formData.status || 'active'}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Đang dạy</option>
                    <option value="inactive">Nghỉ dạy</option>
                  </select>
                </div>
              </div>

              {formData.status === 'inactive' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-2"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Ngày nghỉ dạy</label>
                    <input 
                      required
                      type="date" 
                      value={formData.statusDate || ''}
                      onChange={e => setFormData({...formData, statusDate: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Lý do / Ghi chú</label>
                    <textarea 
                      required
                      placeholder="Nhập lý do nghỉ dạy..."
                      value={formData.statusReason || ''}
                      onChange={e => setFormData({...formData, statusReason: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-[10px] text-amber-700 leading-relaxed">
              <p className="font-bold mb-1">Lưu ý về phân lớp & lịch dạy:</p>
              <p>Việc phân lớp và lịch dạy được quản lý từ module Lớp học. Bạn không thể chỉnh sửa trực tiếp tại đây để đảm bảo tính đồng bộ của hệ thống.</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
                Hủy bỏ
              </button>
              <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                {teacher ? 'Cập nhật' : 'Thêm giáo viên'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// --- Main App ---

export default function App() {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [financeTab, setFinanceTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  useEffect(() => {
    if (user && !localStorage.getItem('gemini_api_key')) {
      setIsApiKeyModalOpen(true);
    }
  }, [user]);

  // Auth check on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const session = localStorage.getItem('auth_session');
        if (session) {
          const userObj = JSON.parse(session);
          setUser(userObj);
        }
      } catch (err) {
        console.error('Session check failed', err);
      } finally {
        setIsAuthReady(true);
      }
    };
    checkAuth();
  }, []);

  // Real-time Data Sync when user is logged in
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (user) {
      setIsDataLoaded(false);
      unsubscribe = FirebaseDB.listenToAllData(
        (newData) => {
          setData(newData);
          setIsDataLoaded(true);
        },
        async (err) => {
          console.error('Failed to sync from Firebase, falling back to local', err);
          try {
            const res = await fetch('/api/data');
            if (res.ok) {
              const fetchedData = await res.json();
              setData(fetchedData);
            }
          } catch (fallbackErr) {
            console.error('Local fetch also failed, using default data', fallbackErr);
          }
          // Even on error, mark data as loaded so the app doesn't stay on loading screen
          setIsDataLoaded(true);
        }
      );
    } else {
      setIsDataLoaded(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  // Hardcoded fallback accounts (used when Firebase has no users or is unreachable)
  const FALLBACK_ACCOUNTS = [
    { id: 'admin_001', username: 'admin', password: 'admin123', role: 'admin' as const },
    { id: 'user_tch_001', username: 'smith', password: 'teacher123', role: 'teacher' as const, teacherId: 'tch_001' },
  ];

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      // 1) Try Firebase first
      const allData = await FirebaseDB.fetchAllData();
      const users = allData.users || [];
      const matchedUser = users.find(u => u.username === username);

      if (matchedUser && matchedUser.password) {
        // Firebase user found, compare hashed password
        if (bcrypt.compareSync(password, matchedUser.password)) {
          setUser(matchedUser);
          localStorage.setItem('auth_session', JSON.stringify(matchedUser));
          setData(allData);
          Swal.fire('Thành công', 'Đã đăng nhập hệ thống', 'success');
          if (matchedUser.isFirstLogin) { handleChangePassword(); }
          return;
        }
      }

      // 2) Fallback: check hardcoded accounts
      const fallback = FALLBACK_ACCOUNTS.find(a => a.username === username && a.password === password);
      if (fallback) {
        const userObj: any = { id: fallback.id, username: fallback.username, role: fallback.role };
        if (fallback.teacherId) userObj.teacherId = fallback.teacherId;
        setUser(userObj);
        localStorage.setItem('auth_session', JSON.stringify(userObj));
        // Load data from Firebase if available, else use INITIAL_DATA
        if (allData.students && allData.students.length > 0) {
          setData(allData);
        }
        Swal.fire('Thành công', 'Đã đăng nhập hệ thống', 'success');
        return;
      }

      Swal.fire('Lỗi', 'Tài khoản hoặc mật khẩu không đúng', 'error');
    } catch (err) {
      console.error('Firebase login failed, trying fallback...', err);
      // 3) If Firebase completely fails, still allow login with hardcoded accounts
      const fallback = FALLBACK_ACCOUNTS.find(a => a.username === username && a.password === password);
      if (fallback) {
        const userObj: any = { id: fallback.id, username: fallback.username, role: fallback.role };
        if (fallback.teacherId) userObj.teacherId = fallback.teacherId;
        setUser(userObj);
        localStorage.setItem('auth_session', JSON.stringify(userObj));
        Swal.fire('Thành công', 'Đã đăng nhập hệ thống (Offline)', 'success');
      } else {
        Swal.fire('Lỗi', 'Tài khoản hoặc mật khẩu không đúng', 'error');
      }
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('auth_session');
    setUser(null);
    setData(INITIAL_DATA);
    setActiveTab('dashboard');
    Swal.fire('Đã đăng xuất', 'Hẹn gặp lại bạn!', 'info');
  };

  const handleChangePassword = async () => {
    const { value: newPassword } = await Swal.fire({
      title: 'Đổi mật khẩu',
      input: 'password',
      inputLabel: 'Mật khẩu mới',
      inputPlaceholder: 'Nhập mật khẩu mới của bạn',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Cập nhật',
      cancelButtonText: 'Để sau'
    });

    if (newPassword && user) {
      try {
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        
        const updatedUsers = data.users.map(u => {
          if (u.id === user.id) {
            return { ...u, password: hashedPassword, isFirstLogin: false };
          }
          return u;
        });
        
        const newData = { ...data, users: updatedUsers };
        setData(newData);
        
        await FirebaseDB.saveAllData(newData);
        
        const updatedUser = updatedUsers.find(u => u.id === user.id);
        setUser(updatedUser!);
        localStorage.setItem('auth_session', JSON.stringify(updatedUser));

        Swal.fire('Thành công', 'Mật khẩu đã được thay đổi', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Lỗi', 'Không thể lưu mật khẩu', 'error');
      }
    }
  };

  const saveDataToServer = async (newData: AppData) => {
    try {
      // First try to save to Firebase
      await FirebaseDB.saveAllData(newData);
    } catch (err) {
      console.error('Failed to save data to Firebase', err);
    }
    // Also save to Express backend as fallback/sync
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
    } catch (err) {
      console.error('Failed to save local data', err);
    }
  };
  const updateData = (updater: (prev: AppData) => AppData) => {
    setData(prev => {
      const next = updater(prev);
      saveDataToServer(next);
      return next;
    });
  };

  const [isClassifying, setIsClassifying] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [viewingClassId, setViewingClassId] = useState<string | null>(null);
  const [classActiveTab, setClassActiveTab] = useState('overview');
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: '', phone: '' });
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [classStatusFilter, setClassStatusFilter] = useState('all');
  const [classTeacherFilter, setClassTeacherFilter] = useState('all');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState('all');
  const [scheduleViewDate, setScheduleViewDate] = useState(dayjs());

  const getSessionsForDate = (date: dayjs.Dayjs, classes: Class[], lessons: Lesson[]) => {
    const dateStr = date.format('YYYY-MM-DD');
    const dayIndex = date.day();

    // 1. Recurring sessions
    const recurring = (classes || []).flatMap(cls => {
      const classStart = dayjs(cls.startDate);
      const classEnd = cls.endDate ? dayjs(cls.endDate) : null;
      
      if (!classStart.isValid()) return [];
      
      // Check if date is within class duration
      const isAfterStart = date.isAfter(classStart.subtract(1, 'day'));
      const isBeforeEnd = !classEnd || !classEnd.isValid() || date.isBefore(classEnd.add(1, 'day'));
      
      if (!isAfterStart || !isBeforeEnd) return [];

      return (cls.schedule || [])
        .filter(s => s.day === dayIndex)
        .map(s => {
          const override = (lessons || []).find(l => l.classId === cls.id && l.date === dateStr && l.startTime === s.startTime && l.status !== 'make-up');
          const teacher = data.teachers.find(t => t.id === (override?.teacherId || s.teacherId || cls.teacherId));
          return {
            id: cls.id,
            name: cls.name,
            color: teacher?.color || cls.color,
            type: cls.type,
            startTime: s.startTime,
            endTime: s.endTime,
            status: override?.status || 'normal',
            teacherId: override?.teacherId || s.teacherId || cls.teacherId,
            assistantId: override?.assistantId,
            room: cls.room,
            lessonId: override?.id,
            isRecurring: true,
            isActual: !!override,
            students: cls.students
          };
        });
    });

    // 2. All actual lessons for this date (including make-ups and unscheduled)
    const actuals = (lessons || [])
      .filter(l => l.date === dateStr)
      .map(l => {
        // Check if this lesson was already included as an override in recurring
        const isOverride = recurring.some(r => r.lessonId === l.id);
        if (isOverride) return null;

        const cls = (classes || []).find(c => c.id === l.classId);
        const teacher = data.teachers.find(t => t.id === l.teacherId);
        return {
          id: l.classId,
          name: cls?.name || 'Lớp học',
          color: teacher?.color || cls?.color || '#64748b',
          type: cls?.type || 'Other',
          startTime: l.startTime || '00:00',
          endTime: l.endTime || '00:00',
          status: l.status,
          teacherId: l.teacherId,
          assistantId: l.assistantId,
          room: cls?.room || 'N/A',
          lessonId: l.id,
          isRecurring: false,
          isActual: true,
          students: cls?.students || []
        };
      })
      .filter(Boolean) as any[];

    return [...recurring, ...actuals].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  };

  useEffect(() => {
    localStorage.setItem('edumanager_data', JSON.stringify(data));
  }, [data]);

  const handleSaveLesson = (lessonData: Lesson | Omit<Lesson, 'id'>) => {
    updateData(prev => {
      const isUpdate = 'id' in lessonData;
      let newLessons;
      if (isUpdate) {
        newLessons = prev.lessons.map(l => l.id === (lessonData as Lesson).id ? (lessonData as Lesson) : l);
      } else {
        const newLesson: Lesson = {
          ...lessonData,
          id: `lsn_${Date.now()}`
        };
        newLessons = [...prev.lessons, newLesson];
      }
      return { ...prev, lessons: newLessons };
    });
    Swal.fire('Thành công', 'Đã lưu điểm danh và nhật ký bài học', 'success');
  };

  const handleDeleteTeacher = (id: string) => {
    Swal.fire({
      title: 'Xác nhận xóa?',
      text: "Dữ liệu giáo viên sẽ bị xóa khỏi danh sách hoạt động. Các lớp học và lịch dạy cũ vẫn được giữ lại để đảm bảo tính lịch sử.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Xóa ngay',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        updateData(prev => ({
          ...prev,
          teachers: prev.teachers.filter(t => t.id !== id)
        }));
        Swal.fire('Đã xóa', 'Giáo viên đã được gỡ khỏi hệ thống', 'success');
      }
    });
  };

  const handleDeleteClass = (id: string) => {
    Swal.fire({
      title: 'Xác nhận xóa?',
      text: "Dữ liệu lớp học và các buổi học liên quan sẽ bị xóa vĩnh viễn!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Xóa ngay',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        updateData(prev => ({
          ...prev,
          classes: prev.classes.filter(c => c.id !== id),
          lessons: prev.lessons.filter(l => l.classId !== id),
          students: prev.students.map(s => ({
            ...s,
            classes: s.classes.filter(cid => cid !== id)
          }))
        }));
        Swal.fire('Đã xóa', 'Lớp học đã được gỡ khỏi hệ thống', 'success');
      }
    });
  };

  const handleSaveClass = (cls: Class) => {
    updateData(prev => {
      const existing = prev.classes.find(c => c.id === cls.id);
      let newClasses;
      if (existing) {
        newClasses = prev.classes.map(c => c.id === cls.id ? cls : c);
      } else {
        newClasses = [...prev.classes, cls];
      }
      
      // Update students' classes list
      const newStudents = prev.students.map(s => {
        const isInClass = cls.students.includes(s.id);
        const wasInClass = s.classes.includes(cls.id);
        
        if (isInClass && !wasInClass) {
          return { ...s, classes: [...s.classes, cls.id] };
        } else if (!isInClass && wasInClass) {
          return { ...s, classes: s.classes.filter(id => id !== cls.id) };
        }
        return s;
      });

      return { ...prev, classes: newClasses, students: newStudents };
    });
    Swal.fire('Thành công', 'Đã lưu thông tin lớp học', 'success');
  };

  const handleSaveStudent = (student: Student) => {
    updateData(prev => {
      const exists = prev.students.find(s => s.id === student.id);
      if (exists) {
        return {
          ...prev,
          students: prev.students.map(s => s.id === student.id ? student : s)
        };
      } else {
        return {
          ...prev,
          students: [...prev.students, student]
        };
      }
    });
    Swal.fire('Thành công', student.id.startsWith('std_') && !data.students.find(s => s.id === student.id) ? 'Đã thêm học viên mới' : 'Đã cập nhật thông tin học viên', 'success');
  };

  const handleSaveTeacher = (teacher: Teacher) => {
    updateData(prev => {
      const exists = prev.teachers.find(t => t.id === teacher.id);
      if (exists) {
        return {
          ...prev,
          teachers: prev.teachers.map(t => t.id === teacher.id ? teacher : t)
        };
      } else {
        return {
          ...prev,
          teachers: [...prev.teachers, teacher]
        };
      }
    });
    Swal.fire('Thành công', (teacher.id || '').startsWith('tch_') && !data.teachers.find(t => t.id === teacher.id) ? 'Đã thêm giáo viên mới' : 'Đã cập nhật thông tin giáo viên', 'success');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.students);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "AnhNguMsThuong_Students.xlsx");
    Swal.fire('Thành công', 'Đã xuất file Excel danh sách học viên', 'success');
  };

  const handleAiAnalysis = async () => {
    if (!data.settings || !data.settings.geminiApiKey) {
      Swal.fire('Thiếu API Key', 'Vui lòng cấu hình Gemini API Key trong phần cài đặt.', 'warning');
      setActiveTab('settings');
      return;
    }

    setIsAnalyzing(true);
    try {
      const financeData = data.transactions.map(t => `${t.date}: ${t.type === 'income' ? '+' : '-'}${t.amount} (${t.category}) - ${t.description}`).join('\n');
      const analysis = await callGeminiAI(AI_PROMPTS.ANALYZE_FINANCE(financeData), data.settings.geminiApiKey, data.settings.aiModel);
      setAiAnalysis(analysis || "Không có phản hồi từ AI.");
    } catch (error: any) {
      Swal.fire('Lỗi AI', error.message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportTuitionNotification = async (student: Student, bill: MonthlyBill) => {
    const element = document.getElementById(`tuition-notification-${student.id}`);
    if (!element) {
      console.error(`Element tuition-notification-${student.id} not found`);
      Swal.fire('Lỗi', 'Không tìm thấy mẫu thông báo', 'error');
      return;
    }
    
    try {
      // Ensure element is visible for capture
      const originalStyle = element.style.cssText;
      element.style.display = 'block';
      element.style.position = 'relative';
      element.style.left = '0';
      
      // Small delay to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(element, { 
        quality: 1, 
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      
      download(dataUrl, `Thong_bao_hoc_phi_${student.name}_${bill.month}.png`);
      
      // Restore style
      element.style.cssText = originalStyle;
      
      if (!Swal.isVisible()) {
        Swal.fire('Thành công', 'Đã xuất ảnh thông báo học phí', 'success');
      }
    } catch (err) {
      console.error('Export error:', err);
      Swal.fire('Lỗi', 'Không thể xuất ảnh thông báo. Vui lòng thử lại.', 'error');
    }
  };

  const handleExportSalaryNotification = async (teacher: Teacher, totalHours: number, basePay: number, totalPay: number, adj: any) => {
    const element = document.getElementById(`salary-notification-${teacher.id}`);
    if (!element) {
      console.error(`Element salary-notification-${teacher.id} not found`);
      Swal.fire('Lỗi', 'Không tìm thấy mẫu phiếu lương', 'error');
      return;
    }
    
    try {
      const originalStyle = element.style.cssText;
      element.style.display = 'block';
      element.style.position = 'relative';
      element.style.left = '0';

      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(element, { 
        quality: 1, 
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      
      download(dataUrl, `Phieu_luong_${teacher.name}_${scheduleViewDate.format('YYYY-MM')}.png`);
      
      element.style.cssText = originalStyle;
      
      Swal.fire('Thành công', 'Đã xuất phiếu lương', 'success');
    } catch (err) {
      console.error('Export error:', err);
      Swal.fire('Lỗi', 'Không thể xuất phiếu lương. Vui lòng thử lại.', 'error');
    }
  };

  const handleAddTransaction = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Thêm giao dịch mới',
      html:
        '<input id="swal-desc" class="swal2-input" placeholder="Mô tả (vd: Tiền điện tháng 3)">' +
        '<input id="swal-amount" type="number" class="swal2-input" placeholder="Số tiền">' +
        '<select id="swal-type" class="swal2-input"><option value="expense">Chi phí</option><option value="income">Thu nhập</option></select>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Tiếp tục',
      preConfirm: () => {
        return {
          description: (document.getElementById('swal-desc') as HTMLInputElement).value,
          amount: parseFloat((document.getElementById('swal-amount') as HTMLInputElement).value),
          type: (document.getElementById('swal-type') as HTMLSelectElement).value as 'income' | 'expense'
        }
      }
    });

    if (formValues) {
      if (!formValues.description || isNaN(formValues.amount)) {
        Swal.fire('Lỗi', 'Vui lòng nhập đầy đủ thông tin', 'error');
        return;
      }

      let category = 'Khác';
      if (data.settings && data.settings.geminiApiKey) {
        setIsClassifying(true);
        try {
          const aiCategory = await callGeminiAI(AI_PROMPTS.CLASSIFY_TRANSACTION(formValues.description), data.settings.geminiApiKey, data.settings.aiModel);
          if (aiCategory) category = aiCategory.trim();
        } catch (e) {
          console.error("AI Classification failed", e);
        } finally {
          setIsClassifying(false);
        }
      }

      const newTxn: Transaction = {
        id: `txn_${Date.now()}`,
        ...formValues,
        category,
        date: dayjs().format('YYYY-MM-DD')
      };

      updateData(prev => ({ ...prev, transactions: [newTxn, ...prev.transactions] }));
      Swal.fire('Thành công', `Đã thêm giao dịch: ${category}`, 'success');
    }
  };

  // --- Render Functions ---

  const renderDashboard = () => {
    const totalStudents = (data.students || []).length;
    const activeClasses = (data.classes || []).filter(c => c.status === 'active').length;
    
    // Automatic Total Debt Calculation
    const totalDebt = (data.students || []).reduce((sum, s) => {
      const studentTuition = (data.classes || [])
        .filter(c => (s.classes || []).includes(c.id))
        .reduce((acc, c) => acc + (c.tuitionFee || 0), 0);
      
      const studentPaid = (data.transactions || [])
        .filter(t => t.relatedId === s.id && t.type === 'income')
        .reduce((acc, t) => acc + (t.amount || 0), 0);
        
      return sum + (studentTuition - studentPaid);
    }, 0);

    const monthlyRevenue = (data.transactions || [])
      .filter(t => t.type === 'income' && dayjs(t.date).isSame(dayjs(), 'month'))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalIncome = (data.transactions || []).filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpense = (data.transactions || []).filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const otherExpenses = (data.transactions || [])
      .filter(t => t.type === 'expense' && t.category !== 'Lương GV' && dayjs(t.date).isSame(dayjs(), 'month'))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Calculate actual teacher costs from lessons in current month
    const currentMonthLessons = (data.lessons || []).filter(l => dayjs(l.date).isSame(dayjs(), 'month'));
    const teacherCosts = currentMonthLessons.reduce((sum, l) => {
      const teacher = data.teachers.find(t => t.id === l.teacherId);
      if (!teacher) return sum;
      const start = dayjs(`2000-01-01 ${l.startTime || '00:00'}`);
      const end = dayjs(`2000-01-01 ${l.endTime || '00:00'}`);
      const hours = end.diff(start, 'hour', true);
      return sum + (hours * (teacher.hourlyRate || 0));
    }, 0);

    const totalMonthlyExpense = teacherCosts + otherExpenses;
    const monthlyProfit = monthlyRevenue - totalMonthlyExpense;

    const chartData = {
      labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
      datasets: [
        {
          label: 'Doanh thu',
          data: [30, 45, 35, 50, 40, 60],
          borderColor: '#4A90E2',
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Chi phí',
          data: [20, 25, 22, 30, 28, 35],
          borderColor: '#FF9500',
          backgroundColor: 'rgba(255, 149, 0, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ]
    };

    const startOfWeek = dayjs().startOf('week').add(1, 'day'); // Monday
    const weekDays = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));

    // Notifications logic
    // For teachers: only show notifications about their own classes
    const myTeacher = user.role !== 'admin' ? data.teachers.find(t => t.id === user.teacherId) : null;
    const myClassIds = user.role !== 'admin' 
      ? data.classes.filter(c => c.teacherId === user.teacherId || (c.schedule || []).some(s => s.teacherId === user.teacherId)).map(c => c.id)
      : data.classes.map(c => c.id);

    const notifications = [
      // Debt notifications - admin only
      ...(user.role === 'admin' ? (data.students || []).filter(s => (s.balance || 0) > 0).map(s => ({
        id: `debt_${s.id}`,
        type: 'debt',
        title: 'Học phí chưa đóng',
        message: `${s.name || 'Học viên'} còn nợ ${formatCurrency(s.balance || 0)}`,
        icon: Wallet,
        color: 'text-error'
      })) : []),
      // Class notifications - filtered by teacher's classes
      ...(data.classes || []).filter(c => {
        const today = dayjs().day();
        const hasScheduleToday = (c.schedule || []).some(s => s.day === today);
        const isMyClass = myClassIds.includes(c.id);
        return hasScheduleToday && isMyClass;
      }).map(c => ({
        id: `class_${c.id}`,
        type: 'upcoming',
        title: 'Lớp sắp diễn ra',
        message: `Lớp ${c.name || 'Lớp học'} có buổi học hôm nay`,
        icon: Calendar,
        color: 'text-primary'
      })),
      // Attendance notifications - admin only
      ...(user.role === 'admin' ? (data.teachers || []).filter(t => {
        const today = dayjs().day();
        const hasClassToday = (data.classes || []).some(c => c.teacherId === t.id && (c.schedule || []).some(s => s.day === today));
        const hasLessonToday = (data.lessons || []).some(l => l.date === dayjs().format('YYYY-MM-DD') && (data.classes || []).find(c => c.id === l.classId)?.teacherId === t.id);
        return hasClassToday && !hasLessonToday;
      }).map(t => ({
        id: `attendance_${t.id}`,
        type: 'attendance',
        title: 'Thiếu điểm danh',
        message: `GV ${t.name || 'Giáo viên'} chưa cập nhật điểm danh hôm nay`,
        icon: UserCheck,
        color: 'text-warning'
      })) : [])
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {user.role === 'admin' ? (
            <>
              <StatCard title="Tổng học viên" value={totalStudents.toString()} icon={Users} color="bg-primary" />
              <StatCard title="Doanh thu tháng" value={formatCurrency(monthlyRevenue)} icon={TrendingUp} color="bg-success" />
              <StatCard title="Số lớp đang chạy" value={activeClasses.toString()} icon={GraduationCap} color="bg-secondary" />
              <StatCard title="Tổng công nợ" value={formatCurrency(totalDebt)} icon={Wallet} color="bg-error" />
            </>
          ) : (
            <>
              {(() => {
                const currentMonth = dayjs().format('YYYY-MM');
                const myClasses = data.classes.filter(c => c.teacherId === user.teacherId || (c.schedule || []).some(s => s.teacherId === user.teacherId));
                const myLessons = data.lessons.filter(l => {
                  const cls = data.classes.find(c => c.id === l.classId);
                  return cls && (cls.teacherId === user.teacherId || (cls.schedule || []).some(s => s.teacherId === user.teacherId));
                }).filter(l => l.date && l.date.startsWith(currentMonth));
                
                let totalHours = 0;
                const hoursByClass: { className: string; hours: number; sessions: number }[] = [];
                
                myClasses.forEach(cls => {
                  const clsLessons = myLessons.filter(l => l.classId === cls.id);
                  let clsHours = 0;
                  clsLessons.forEach(() => {
                    const sched = cls.schedule?.[0];
                    if (sched) {
                      const s = dayjs(`2000-01-01 ${sched.startTime}`);
                      const e = dayjs(`2000-01-01 ${sched.endTime}`);
                      clsHours += e.diff(s, 'hour', true);
                    }
                  });
                  totalHours += clsHours;
                  if (clsLessons.length > 0) {
                    hoursByClass.push({ className: cls.name, hours: clsHours, sessions: clsLessons.length });
                  }
                });
                
                const teacher = data.teachers.find(t => t.id === user.teacherId);
                const estimatedSalary = (teacher?.baseSalary || 0) + (totalHours * (teacher?.hourlyRate || 0) * ((teacher?.kpi || 100) / 100));
                
                return (
                  <>
                    <StatCard title="Lớp của tôi" value={myClasses.length.toString()} icon={GraduationCap} color="bg-primary" />
                    <StatCard title="Số buổi dạy tháng này" value={myLessons.length.toString()} icon={Calendar} color="bg-success" />
                    <div className="glass-card p-6 relative group cursor-help">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Tổng giờ dạy</p>
                          <h3 className="text-2xl font-bold text-slate-800">{totalHours.toFixed(1)}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-white shadow-lg">
                          <Clock size={24} />
                        </div>
                      </div>
                      {hoursByClass.length > 0 && (
                        <div className="absolute z-50 hidden group-hover:block top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Chi tiết giờ dạy tháng này</p>
                          {hoursByClass.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                              <span className="text-xs font-medium text-slate-700">{item.className}</span>
                              <div className="text-right">
                                <span className="text-xs font-bold text-primary">{item.hours.toFixed(1)}h</span>
                                <span className="text-[10px] text-slate-400 ml-1">({item.sessions} buổi)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <StatCard title="Lương dự kiến" value={formatCurrency(estimatedSalary)} icon={Wallet} color="bg-warning" />
                  </>
                );
              })()}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Lịch học trong tuần ({startOfWeek.format('DD/MM')} - {startOfWeek.add(6, 'day').format('DD/MM/YYYY')})</h3>
                <div className="flex gap-4 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
                    <span>Full-time</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-secondary/20 border border-secondary/30" />
                    <span>Part-time</span>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-8 border-b border-slate-100 pb-2 mb-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Thời gian</div>
                    {weekDays.map((date, i) => (
                      <div key={i} className="text-center">
                        <p className={cn("text-[10px] font-bold uppercase", date.isSame(dayjs(), 'day') ? "text-primary" : "text-slate-400")}>
                          {i === 6 ? 'Chủ Nhật' : `Thứ ${i + 2}`}
                        </p>
                        <p className={cn("text-xs font-bold", date.isSame(dayjs(), 'day') ? "text-primary" : "text-slate-700")}>
                          {date.format('DD/MM')}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    {(() => {
                      const allWeekSessions = weekDays.flatMap(date => getSessionsForDate(date, data.classes, data.lessons));
                      const defaultSlots = ['07:30', '09:30', '13:00', '15:00', '17:00', '19:00', '20:30'];
                      const activeSlots = allWeekSessions.map(s => s.startTime).filter(Boolean);
                      const uniqueTimeSlots = Array.from(new Set([...defaultSlots, ...activeSlots])).sort();
                      
                      return uniqueTimeSlots.map(slot => (
                        <div key={slot} className="grid grid-cols-8 border-b border-slate-50 min-h-[60px]">
                          <div className="flex items-center text-[10px] font-bold text-slate-400">{slot}</div>
                          {weekDays.map((date, i) => {
                            const allSessions = getSessionsForDate(date, data.classes, data.lessons).filter(s => s.startTime === slot);
                          // Teacher: only show sessions from my classes
                          const sessions = user.role === 'admin' ? allSessions : allSessions.filter(s => s.teacherId === user.teacherId || s.assistantId === user.teacherId);
                          return (
                            <div key={i} className="p-1 border-l border-slate-50 flex flex-col gap-1">
                              {sessions.length > 0 ? sessions.map((s, idx) => {
                                const teacher = data.teachers.find(t => t.id === s.teacherId);
                                const isFullTime = teacher?.type === 'full-time';
                                return (
                                  <div 
                                    key={idx}
                                    onClick={() => {
                                      if (s.lessonId) {
                                        setViewingClassId(s.id);
                                        setSelectedClassId(s.id);
                                      } else {
                                        setViewingClassId(s.id);
                                        setEditingLesson({
                                          id: `lesson-${Date.now()}`,
                                          classId: s.id,
                                          teacherId: s.teacherId,
                                          date: date.format('YYYY-MM-DD'),
                                          startTime: s.startTime,
                                          endTime: s.endTime,
                                          attendance: [],
                                          content: '',
                                          homework: '',
                                          status: 'normal'
                                        });
                                        setIsAttendanceModalOpen(true);
                                      }
                                    }}
                                    className={cn(
                                      "p-1.5 rounded-lg border text-[10px] cursor-pointer transition-all hover:scale-[1.02]",
                                      isFullTime ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary/10 border-secondary/20 text-secondary",
                                      !s.isActual && "opacity-60 border-dashed"
                                    )}
                                  >
                                    <div className="font-bold truncate">{s.name}</div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="opacity-70">{teacher?.shortName || teacher?.name || 'N/A'}</span>
                                      {!s.isActual && <span className="text-[8px] font-black uppercase text-error">Kế hoạch</span>}
                                    </div>
                                  </div>
                                );
                              }) : (
                                <div className="h-full flex items-center justify-center">
                                  <span className="text-[8px] text-slate-200 uppercase font-bold tracking-tighter">Trống</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))})()}
                  </div>
                </div>
              </div>
            </div>

            {user.role === 'admin' && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Biểu đồ tài chính (Triệu VND)</h3>
                </div>
                <div className="h-64 mt-4 w-full">
                  <D3FinancialChart transactions={data.transactions || []} monthsToView={6} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Bell size={20} className="text-primary" />
                  Thông báo
                </h3>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                  {notifications.length}
                </span>
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {notifications.length > 0 ? notifications.map(n => (
                  <div key={n.id} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all cursor-pointer">
                    <div className={cn("p-2 rounded-lg bg-white shadow-sm", n.color)}>
                      <n.icon size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{n.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{n.message}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">Không có thông báo mới</p>
                  </div>
                )}
              </div>
            </div>

            {user.role === 'admin' && (
              <>
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold mb-6">Phân bổ chi phí</h3>
                  <div className="h-64">
                    <Doughnut 
                      data={{
                        labels: ['Lương', 'Mặt bằng', 'Marketing', 'Khác'],
                        datasets: [{
                          data: [50, 25, 15, 10],
                          backgroundColor: ['#4A90E2', '#FF9500', '#10b981', '#f59e0b'],
                        }]
                      }} 
                      options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} 
                    />
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <DollarSign size={20} className="text-success" />
                    Dự toán lương GV (Real-time)
                  </h3>
                  <div className="space-y-4">
                    {data.teachers.map(teacher => {
                      const teacherClasses = data.classes.filter(c => c.teacherId === teacher.id);
                      const teacherLessons = data.lessons.filter(l => teacherClasses.some(c => c.id === l.classId));
                      
                      let totalHours = 0;
                      teacherLessons.forEach(lesson => {
                        const cls = data.classes.find(c => c.id === lesson.classId);
                        if (cls && cls.schedule) {
                          const firstSchedule = cls.schedule[0];
                          if (firstSchedule) {
                            const start = dayjs(`2000-01-01 ${firstSchedule.startTime}`);
                            const end = dayjs(`2000-01-01 ${firstSchedule.endTime}`);
                            totalHours += end.diff(start, 'hour', true);
                          }
                        }
                      });

                      const kpiBonus = (teacher.kpi / 100);
                      const estimatedSalary = (teacher.baseSalary || 0) + (totalHours * teacher.hourlyRate * kpiBonus);

                      return (
                        <div key={teacher.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{teacher.name}</p>
                            <p className="text-[10px] text-slate-500">{totalHours.toFixed(1)} giờ dạy × {formatCurrency(teacher.hourlyRate)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-primary">{formatCurrency(estimatedSalary)}</p>
                            <p className="text-[10px] text-success font-bold">KPI: {teacher.kpi}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BrainCircuit className="text-primary" />
              <h3 className="text-lg font-bold">Phân tích thông minh (Gemini AI)</h3>
            </div>
            <button 
              onClick={handleAiAnalysis}
              disabled={isAnalyzing}
              className="btn-primary flex items-center gap-2"
            >
              {isAnalyzing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={18} />}
              {isAnalyzing ? "Đang phân tích..." : "Phân tích ngay"}
            </button>
          </div>
          
          {aiAnalysis ? (
            <div className="prose prose-slate max-w-none bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <Markdown>{aiAnalysis}</Markdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <BrainCircuit size={48} className="mb-4 opacity-20" />
              <p>Nhấn "Phân tích ngay" để Gemini AI giúp bạn tối ưu hóa vận hành trung tâm.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStudents = () => {
    const filteredStudents = (data.students || []).filter(student => {
      const searchLower = (studentSearch || '').toLowerCase();
      const matchesSearch = 
        (student.name || '').toLowerCase().includes(searchLower) ||
        (student.phone || '').includes(studentSearch) ||
        (student.parentName || '').toLowerCase().includes(searchLower) ||
        (student.parentPhone || '').includes(studentSearch);
      
      const matchesStatus = studentStatusFilter === 'all' || student.status === studentStatusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Quản lý học viên</h2>
          <div className="flex items-center gap-3">
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
              <Download size={18} />
              <span>Xuất Excel</span>
            </button>
            <button 
              onClick={() => { setEditingStudent(null); setIsStudentModalOpen(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Thêm học viên</span>
            </button>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm tên, SĐT học viên hoặc phụ huynh..." 
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none" 
              />
            </div>
            <select 
              value={studentStatusFilter}
              onChange={(e) => setStudentStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang học</option>
              <option value="inactive">Nghỉ học</option>
              <option value="on-hold">Bảo lưu</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Học viên</th>
                  <th className="px-6 py-4">Phụ huynh</th>
                  <th className="px-6 py-4">Mục tiêu</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Lớp đang học</th>
                  <th className="px-6 py-4">Lớp đã học</th>
                  <th className="px-6 py-4">Ngày tham gia</th>
                  <th className="px-6 py-4">Thành tích học tập</th>
                  <th className="px-6 py-4">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => {
                  const activeClasses = (data.classes || []).filter(c => (student.classes || []).includes(c.id) && c.status === 'active');
                  const completedClasses = (data.classes || []).filter(c => (student.classes || []).includes(c.id) && c.status === 'completed');
                  
                  // Automatic Debt Calculation
                  const totalTuition = (data.classes || [])
                    .filter(c => (student.classes || []).includes(c.id))
                    .reduce((sum, c) => sum + (c.tuitionFee || 0), 0);
                  
                  const totalPaid = (data.transactions || [])
                    .filter(t => t.relatedId === student.id && t.type === 'income')
                    .reduce((sum, t) => sum + (t.amount || 0), 0);
                  
                  const currentDebt = totalTuition - totalPaid;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {(student.name || '?').charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{student.name || 'Học viên'}</p>
                            <p className="text-[10px] text-slate-500">{student.dob ? dayjs(student.dob).format('DD/MM/YYYY') : 'Chưa cập nhật NS'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs">
                          <p className="font-bold text-slate-700">{student.parentName}</p>
                          <p className="text-slate-500">{student.parentPhone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-md text-[10px] font-bold">
                          {student.goal}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative group inline-block">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase cursor-help",
                            student.status === 'active' ? "bg-success/10 text-success" : 
                            student.status === 'inactive' ? "bg-error/10 text-error" : "bg-amber-100 text-amber-600"
                          )}>
                            {student.status === 'active' ? 'Đang học' : 
                             student.status === 'inactive' ? 'Nghỉ học' : 'Bảo lưu'}
                          </span>
                          {student.statusReason && (
                            <div className="absolute z-50 hidden group-hover:block bg-slate-800 text-white p-2 rounded text-[10px] w-48 -top-12 left-0 shadow-xl">
                              <p className="font-bold mb-1">Lý do: {student.statusReason}</p>
                              {student.statusStartDate && <p>Từ: {dayjs(student.statusStartDate).format('DD/MM/YYYY')}</p>}
                              {student.statusEndDate && <p>Đến: {dayjs(student.statusEndDate).format('DD/MM/YYYY')}</p>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {activeClasses.map(cls => (
                            <span key={cls.id} className="px-2 py-0.5 bg-success/10 text-success rounded text-[10px] font-bold">
                              {cls.name}
                            </span>
                          ))}
                          {activeClasses.length === 0 && <span className="text-[10px] text-slate-400 italic">Chưa có lớp</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {completedClasses.map(cls => (
                            <span key={cls.id} className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px] font-bold">
                              {cls.name}
                            </span>
                          ))}
                          {completedClasses.length === 0 && <span className="text-[10px] text-slate-400 italic">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {dayjs(student.joinedDate).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {student.performance && student.performance.length > 0 ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                                  student.performance[student.performance.length - 1].progress === 'improving' ? "bg-success/10 text-success" :
                                  student.performance[student.performance.length - 1].progress === 'declining' ? "bg-error/10 text-error" : "bg-slate-100 text-slate-500"
                                )}>
                                  {student.performance[student.performance.length - 1].progress === 'improving' ? 'Tiến bộ' :
                                   student.performance[student.performance.length - 1].progress === 'declining' ? 'Giảm sút' : 'Ổn định'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-1 italic">"{student.performance[student.performance.length - 1].comment}"</p>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Chưa có nhận xét</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setEditingStudent(student); setIsStudentModalOpen(true); }}
                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Settings size={18} />
                          </button>
                          <button 
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: 'Xác nhận xóa?',
                                text: `Học viên ${student.name} sẽ bị xóa khỏi hệ thống. Dữ liệu tài chính và lịch học liên quan sẽ bị ảnh hưởng.`,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#ef4444',
                                cancelButtonColor: '#64748b',
                                confirmButtonText: 'Xóa ngay',
                                cancelButtonText: 'Hủy'
                              });
                              
                              if (result.isConfirmed) {
                                setData(prev => ({
                                  ...prev,
                                  students: prev.students.filter(s => s.id !== student.id),
                                  // Also remove from classes
                                  classes: prev.classes.map(c => ({
                                    ...c,
                                    students: c.students.filter(sid => sid !== student.id)
                                  }))
                                }));
                                Swal.fire('Đã xóa', 'Thông tin học viên đã được loại bỏ', 'success');
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-error transition-colors"
                            title="Xóa học viên"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const getClassStatus = (cls: Class) => {
    const now = dayjs();
    const start = dayjs(cls.startDate);
    const end = cls.endDate ? dayjs(cls.endDate) : null;
    if (start.isAfter(now, 'day')) return 'upcoming';
    if (end && end.isBefore(now, 'day')) return 'completed';
    return 'active';
  };

  const renderClasses = () => {
    if (viewingClassId) {
      const cls = data.classes.find(c => c.id === viewingClassId);
      if (!cls) return null;
      const status = getClassStatus(cls);
      const teacher = (data.teachers || []).find(t => t.id === cls.teacherId);
      const classStudents = (data.students || []).filter(s => (cls.students || []).includes(s.id));
      
      // Generate all sessions (recurring + overrides + make-ups)
      const generateAllSessions = () => {
        const sessions: any[] = [];
        const start = dayjs(cls.startDate);
        const end = cls.endDate ? dayjs(cls.endDate) : start.add(6, 'month');
        
        if (!start.isValid()) return [];

        // 1. Recurring sessions
        let current = start;
        while (current.isBefore(end) || current.isSame(end, 'day')) {
          const dayOfWeek = current.day();
          const dayScheds = (cls.schedule || []).filter(s => s.day === dayOfWeek);
          
          dayScheds.forEach(daySched => {
            const dateStr = current.format('YYYY-MM-DD');
            const override = data.lessons.find(l => l.classId === cls.id && l.date === dateStr && l.startTime === daySched.startTime && l.status !== 'make-up');
            
            sessions.push({
              id: override?.id || `auto_${cls.id}_${dateStr}_${daySched.startTime}`,
              date: dateStr,
              startTime: daySched.startTime,
              endTime: daySched.endTime,
              teacherId: override?.teacherId || daySched.teacherId || cls.teacherId,
              assistantId: override?.assistantId,
              status: override?.status || 'normal',
              content: override?.content,
              homework: override?.homework,
              attendance: override?.attendance || [],
              isRecurring: true
            });
          });
          current = current.add(1, 'day');
          // Safety break to prevent infinite loop
          if (sessions.length > 1000) break;
        }
        
        // 2. All actual lessons (including make-ups and unscheduled ones)
        const actualLessons = data.lessons.filter(l => l.classId === cls.id);
        actualLessons.forEach(l => {
          // Check if this lesson was already included as an override
          const isOverride = sessions.some(s => s.id === l.id);
          if (!isOverride) {
            sessions.push({
              ...l,
              isRecurring: false
            });
          }
        });
        
        return sessions.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)) || (a.startTime || '').localeCompare(b.startTime || ''));
      };

      const allClassSessions = generateAllSessions()
        .filter(s => {
          const sessionDate = dayjs(s.date);
          const systemStart = dayjs('2026-03-01');
          const now = dayjs();
          return (sessionDate.isAfter(systemStart.subtract(1, 'day')) && sessionDate.isBefore(now.add(1, 'day')));
        })
        .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)) || (b.startTime || '').localeCompare(a.startTime || ''));
      const classLessons = (data.lessons || []).filter(l => l.classId === cls.id).sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));

      // Calculate stats for overview
      const totalSessions = allClassSessions.filter(s => s.status !== 'cancel' && dayjs(s.date).isBefore(dayjs())).length;
      let totalHours = 0;
      if (cls.schedule && cls.schedule[0]) {
        const firstSchedule = cls.schedule[0];
        const start = dayjs(`2000-01-01 ${firstSchedule.startTime}`);
        const end = dayjs(`2000-01-01 ${firstSchedule.endTime}`);
        const duration = end.diff(start, 'hour', true);
        totalHours = classLessons.length * duration;
      }
      const avgAttendance = classLessons.length > 0 
        ? (classLessons.reduce((acc, l) => acc + (l.attendance.filter(a => a.status === 'present').length / (l.attendance.length || 1)), 0) / classLessons.length * 100).toFixed(1)
        : 0;

      const tabs = [
        { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'students', label: 'Học viên', icon: Users },
        { id: 'sessions', label: 'Quản lý buổi học', icon: ListTodo },
        ...(user.role === 'admin' ? [{ id: 'finance', label: 'Tài chính', icon: DollarSign }] : []),
      ];

      return (
        <div className="space-y-6">
          {/* Class Info Bar (Fixed Context) */}
          <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4" style={{ borderLeftColor: cls.color }}>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { setViewingClassId(null); setClassActiveTab('overview'); }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  {cls.name}
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded uppercase tracking-wider">{cls.type}</span>
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <GraduationCap size={14} />
                    <span>GV: {teacher?.shortName || teacher?.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin size={14} />
                    <span>Phòng: {cls.room}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar size={14} />
                    <span>{(cls.schedule || []).map(s => `Thứ ${s.day === 0 ? 'CN' : s.day + 1}`).join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                status === 'active' ? "bg-success/10 text-success" : 
                status === 'upcoming' ? "bg-warning/10 text-warning" : "bg-slate-100 text-slate-500"
              )}>
                {status === 'active' ? 'Đang mở' : status === 'upcoming' ? 'Sắp mở' : 'Đã kết thúc'}
              </div>
              {user.role === 'admin' && (
                <button 
                  onClick={() => { setEditingClass(cls); setIsClassModalOpen(true); }}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all"
                  title="Chỉnh sửa thông tin lớp"
                >
                  <Settings size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Task-First View */}
          <div className="md:hidden glass-card p-4 bg-primary text-white space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm">Buổi học tiếp theo</h4>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Hôm nay</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs opacity-80">19:00 - 21:00</p>
                <p className="font-bold">{cls.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAttendanceModalOpen(true)}
                className="flex-1 py-2 bg-white text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <UserCheck size={14} />
                Điểm danh
              </button>
              <button 
                onClick={() => setIsAttendanceModalOpen(true)}
                className="flex-1 py-2 bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <ClipboardList size={14} />
                Ghi chú
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setClassActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                  classActiveTab === tab.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={classActiveTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {classActiveTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng số buổi</p>
                      <p className="text-2xl font-bold text-slate-800">{totalSessions}</p>
                    </div>
                  </div>
                  <div className="glass-card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success">
                      <UserCheck size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ chuyên cần</p>
                      <p className="text-2xl font-bold text-slate-800">{avgAttendance}%</p>
                    </div>
                  </div>
                  <div className="glass-card p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Học viên</p>
                      <p className="text-2xl font-bold text-slate-800">{cls.students.length}</p>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 glass-card p-6">
                    <h3 className="font-bold mb-4">Tiến độ khóa học</h3>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${(totalSessions / 24) * 100}%` }} 
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                      <span>Đã học: {totalSessions} buổi</span>
                      <span>Tổng: 24 buổi</span>
                    </div>
                  </div>
                </div>
              )}

              {classActiveTab === 'students' && (
                <div className="glass-card overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Học viên</th>
                        {currentUser?.role !== 'teacher' && <th className="px-6 py-4">Học phí</th>}
                        <th className="px-6 py-4">Liên hệ</th>
                        <th className="px-6 py-4">Chuyên cần</th>
                        <th className="px-6 py-4">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(classStudents || []).map(student => {
                        const studentAttendance = (classLessons || []).filter(l => 
                          (l.attendance || []).find(a => a.studentId === student.id && a.status === 'present')
                        ).length;
                        const attendanceRate = totalSessions > 0 ? (studentAttendance / totalSessions * 100).toFixed(0) : 0;
                        
                        const discount = cls.studentDiscounts?.[student.id];
                        let actualTuition = cls.tuitionFee;
                        if (discount) {
                          if (discount.type === 'percent') {
                            actualTuition = cls.tuitionFee * (1 - discount.value / 100);
                          } else {
                            actualTuition = Math.max(0, cls.tuitionFee - discount.value);
                          }
                        }

                        return (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                  {(student.name || '?').charAt(0)}
                                </div>
                                <span className="font-bold text-slate-800">{student.name || 'Học viên'}</span>
                              </div>
                            </td>
                            {currentUser?.role !== 'teacher' && (
                              <td className="px-6 py-4">
                                <div className="text-xs">
                                  {discount ? (
                                    <>
                                      <p className="text-slate-400 line-through">{formatCurrency(cls.tuitionFee)}</p>
                                      <p className="font-bold text-success">
                                        {formatCurrency(actualTuition)}
                                        <span className="ml-1 text-[10px] text-error">
                                          (-{discount.type === 'percent' ? `${discount.value}%` : formatCurrency(discount.value)})
                                        </span>
                                      </p>
                                    </>
                                  ) : (
                                    <p className="font-bold text-slate-700">{formatCurrency(cls.tuitionFee)}</p>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-slate-700">{student.parentName || 'Phụ huynh'}</span>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <Phone size={10} />
                                  <span>{student.parentPhone || student.phone || 'Chưa cập nhật SĐT'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full max-w-[60px]">
                                  <div className="h-full bg-success rounded-full" style={{ width: `${attendanceRate}%` }} />
                                </div>
                                <span className="text-xs font-bold text-slate-600">{attendanceRate}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit",
                                  student.status === 'active' ? "bg-success/10 text-success" : 
                                  student.status === 'on-hold' ? "bg-warning/10 text-warning" : "bg-slate-100 text-slate-500"
                                )}>
                                  {student.status === 'active' ? 'Đang học' : 
                                   student.status === 'on-hold' ? 'Bảo lưu' : 'Nghỉ'}
                                </span>
                                {student.statusReason && (
                                  <p className="text-[10px] text-slate-400 italic line-clamp-1">{student.statusReason}</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {classActiveTab === 'sessions' && (
                <div className="space-y-6">
                  {/* General Notes Section */}
                  <div className="glass-card p-6 border-l-4 border-primary">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardList size={18} className="text-primary" />
                        Ghi chú & Tài liệu chung
                      </h3>
                      <button 
                        onClick={() => {
                          Swal.fire({
                            title: 'Ghi chú chung',
                            input: 'textarea',
                            inputLabel: 'Nhập ghi chú hoặc link tài liệu quan trọng cho lớp học',
                            inputValue: cls.generalNotes || '',
                            showCancelButton: true,
                            confirmButtonText: 'Lưu',
                            cancelButtonText: 'Hủy',
                            confirmButtonColor: '#4f46e5',
                          }).then((result) => {
                            if (result.isConfirmed) {
                              updateData(prev => ({
                                ...prev,
                                classes: prev.classes.map(c => c.id === cls.id ? { ...c, generalNotes: result.value } : c)
                              }));
                            }
                          });
                        }}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {cls.generalNotes ? 'Chỉnh sửa' : 'Thêm ghi chú'}
                      </button>
                    </div>
                    {cls.generalNotes ? (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">
                          {cls.generalNotes.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                            if (part.match(/https?:\/\/[^\s]+/)) {
                              return (
                                <span key={i} className="inline-flex items-center gap-1 mx-1 align-middle">
                                  <a 
                                    href={part} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-bold group relative"
                                  >
                                    {part}
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                                      Mở tài liệu
                                    </span>
                                  </a>
                                  <a 
                                    href={part} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-all inline-flex items-center gap-1"
                                    title="Mở tài liệu"
                                  >
                                    <ExternalLink size={10} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Mở</span>
                                  </a>
                                </span>
                              );
                            }
                            return part;
                          })}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Quản lý buổi học</h3>
                    </div>
                    <button 
                      onClick={() => { setEditingLesson(null); setIsAttendanceModalOpen(true); }}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Plus size={18} />
                      <span>Thêm buổi học</span>
                    </button>
                  </div>
                  <div className="glass-card overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Ngày học</th>
                          <th className="px-6 py-4">Giáo viên / Trợ giảng</th>
                          <th className="px-6 py-4">Nội dung & Bài tập</th>
                          <th className="px-6 py-4">Sĩ số</th>
                          <th className="px-6 py-4">Trạng thái</th>
                          <th className="px-6 py-4">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allClassSessions.map(session => {
                          const sessionTeacher = data.teachers.find(t => t.id === session.teacherId);
                          const sessionAssistant = data.teachers.find(t => t.id === session.assistantId);
                          const presentCount = session.attendance.filter((a: any) => a.status === 'present').length;
                          const totalInLesson = session.attendance.length || cls.students.length;
                          const isFuture = dayjs(session.date).isAfter(dayjs(), 'day');
                          
                          // Check if session is locked (after 15th of next month)
                          const sessionDate = dayjs(session.date);
                          const now = dayjs();
                          const nextMonth15th = sessionDate.add(1, 'month').date(15).endOf('day');
                          const isLocked = now.isAfter(nextMonth15th);
                          
                          return (
                            <tr key={session.id} className={cn(
                              "hover:bg-slate-50 transition-colors",
                              session.status === 'cancel' && "bg-slate-50/50 opacity-60"
                            )}>
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-slate-700">{dayjs(session.date).format('DD/MM/YYYY')}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">{dayjs(session.date).format('dddd')}</p>
                                <p className="text-[10px] text-primary font-bold">{session.startTime} - {session.endTime}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
                                      GV
                                    </div>
                                    <span className="text-xs text-slate-700 font-medium">{sessionTeacher?.shortName || sessionTeacher?.name || 'Chưa gán'}</span>
                                  </div>
                                  {sessionAssistant && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center text-[8px] font-bold text-secondary">
                                        TA
                                      </div>
                                      <span className="text-xs text-slate-500">{sessionAssistant.shortName || sessionAssistant.name}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="max-w-xs">
                                  {session.status === 'cancel' ? (
                                    <p className="text-xs text-slate-400 italic line-through">Buổi học nghỉ</p>
                                  ) : (
                                    <>
                                      <p className="text-sm text-slate-800 font-medium line-clamp-1">{session.content || (isFuture ? 'Sắp diễn ra' : 'Chưa nhập nội dung')}</p>
                                      <p className="text-[10px] text-slate-400 italic line-clamp-1">BT: {session.homework || 'Không có'}</p>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {session.status !== 'cancel' && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700">{presentCount}/{totalInLesson}</span>
                                    <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-success" 
                                        style={{ width: `${(presentCount / (totalInLesson || 1)) * 100}%` }} 
                                      />
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                  session.status === 'normal' ? "bg-success/10 text-success" : 
                                  session.status === 'cancel' ? "bg-error/10 text-error" : "bg-secondary/10 text-secondary"
                                )}>
                                  {session.status === 'normal' ? 'Bình thường' : 
                                   session.status === 'cancel' ? 'Hủy buổi' : 'Dạy bù'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {!isLocked && (
                                    <>
                                      <button 
                                        onClick={() => { 
                                          const lessonToEdit = data.lessons.find(l => l.id === session.id) || {
                                            id: `lsn_${Date.now()}`,
                                            classId: cls.id,
                                            teacherId: session.teacherId,
                                            date: session.date,
                                            startTime: session.startTime,
                                            endTime: session.endTime,
                                            attendance: cls.students.map(sid => ({ studentId: sid, status: 'present' })),
                                            status: session.status,
                                            content: session.content || '',
                                            homework: session.homework || ''
                                          };
                                          setEditingLesson(lessonToEdit as Lesson); 
                                          setIsAttendanceModalOpen(true); 
                                        }}
                                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        title="Điểm danh & Nhật ký"
                                      >
                                        <UserCheck size={16} />
                                      </button>
                                      
                                      {session.status === 'normal' && (
                                        <button 
                                          onClick={async () => {
                                            const result = await Swal.fire({
                                              title: 'Đánh dấu nghỉ?',
                                              text: "Buổi học này sẽ được đánh dấu là nghỉ.",
                                              icon: 'question',
                                              showCancelButton: true,
                                              confirmButtonText: 'Xác nhận nghỉ',
                                              cancelButtonText: 'Hủy'
                                            });
                                            
                                            if (result.isConfirmed) {
                                              const newLesson: Lesson = {
                                                id: `lsn_${Date.now()}`,
                                                classId: cls.id,
                                                teacherId: session.teacherId,
                                                date: session.date,
                                                attendance: [],
                                                content: 'Buổi học nghỉ',
                                                homework: '',
                                                status: 'cancel'
                                              };
                                              updateData(prev => ({ ...prev, lessons: [...prev.lessons, newLesson] }));
                                            }
                                          }}
                                          className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                                          title="Báo nghỉ"
                                        >
                                          <X size={16} />
                                        </button>
                                      )}

                                      {session.id.toString().startsWith('lsn_') && (
                                        <button 
                                          onClick={() => {
                                            Swal.fire({
                                              title: 'Xác nhận xóa?',
                                              text: "Dữ liệu buổi học và điểm danh sẽ bị mất!",
                                              icon: 'warning',
                                              showCancelButton: true,
                                              confirmButtonColor: '#ef4444',
                                              cancelButtonColor: '#64748b',
                                              confirmButtonText: 'Xóa ngay',
                                              cancelButtonText: 'Hủy'
                                            }).then((result) => {
                                              if (result.isConfirmed) {
                                                updateData(prev => ({
                                                  ...prev,
                                                  lessons: prev.lessons.filter(l => l.id !== session.id)
                                                }));
                                                Swal.fire('Đã xóa', 'Buổi học đã được loại bỏ', 'success');
                                              }
                                            })
                                          }}
                                          className="p-2 text-slate-400 hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                                          title="Xóa bản ghi"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {allClassSessions.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Chưa có dữ liệu buổi học</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {classActiveTab === 'finance' && (() => {
                // Group sessions by month
                const monthlyData: Record<string, { 
                  sessions: any[], 
                  hours: number, 
                  teacherCost: number,
                  revenue: number 
                }> = {};

                allClassSessions.forEach(session => {
                  const month = dayjs(session.date).format('MM/YYYY');
                  if (!monthlyData[month]) {
                    monthlyData[month] = { sessions: [], hours: 0, teacherCost: 0, revenue: 0 };
                  }
                  monthlyData[month].sessions.push(session);
                  
                  // Only calculate cost for non-cancelled sessions
                  if (session.status !== 'cancel') {
                    const duration = dayjs(`2000-01-01 ${session.endTime}`).diff(dayjs(`2000-01-01 ${session.startTime}`), 'hour', true);
                    monthlyData[month].hours += duration;
                    
                    // Teacher cost for this session
                    const sessionTeacher = data.teachers.find(t => t.id === session.teacherId);
                    if (sessionTeacher) {
                      const basePay = duration * sessionTeacher.hourlyRate;
                      const kpiBonus = basePay * (sessionTeacher.kpi / 100);
                      monthlyData[month].teacherCost += basePay + kpiBonus;
                    }
                  }
                });

                // Calculate revenue per month from transactions
                data.transactions.filter(t => t.type === 'income' && t.category === 'Tuition').forEach(t => {
                  if (cls.students.includes(t.relatedId || '')) {
                    const month = dayjs(t.date).format('MM/YYYY');
                    if (monthlyData[month]) {
                      monthlyData[month].revenue += t.amount;
                    }
                  }
                });

                const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
                  const [mA, yA] = a.split('/').map(Number);
                  const [mB, yB] = b.split('/').map(Number);
                  return yB !== yA ? yB - yA : mB - mA;
                });

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="glass-card p-6 bg-primary text-white">
                        <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Tổng doanh thu</p>
                        <p className="text-2xl font-bold mt-1">
                          {formatCurrency(Object.values(monthlyData).reduce((acc, m) => acc + m.revenue, 0))}
                        </p>
                        <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2 text-[10px] font-bold">
                          <TrendingUp size={14} />
                          <span>Từ {cls.students.length} học viên</span>
                        </div>
                      </div>
                      <div className="glass-card p-6 bg-secondary text-white">
                        <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Tổng chi phí GV</p>
                        <p className="text-2xl font-bold mt-1">
                          {formatCurrency(Object.values(monthlyData).reduce((acc, m) => acc + m.teacherCost, 0))}
                        </p>
                        <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2 text-[10px] font-bold">
                          <Clock size={14} />
                          <span>Tổng {Object.values(monthlyData).reduce((acc, m) => acc + m.hours, 0).toFixed(1)} giờ dạy</span>
                        </div>
                      </div>
                      <div className="glass-card p-6 bg-success text-white">
                        <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Lợi nhuận dự kiến</p>
                        <p className="text-2xl font-bold mt-1">
                          {formatCurrency(
                            Object.values(monthlyData).reduce((acc, m) => acc + m.revenue, 0) - 
                            Object.values(monthlyData).reduce((acc, m) => acc + m.teacherCost, 0)
                          )}
                        </p>
                        <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2 text-[10px] font-bold">
                          <TrendingUp size={14} />
                          <span>Tỷ suất: {((Object.values(monthlyData).reduce((acc, m) => acc + m.revenue, 0) - Object.values(monthlyData).reduce((acc, m) => acc + m.teacherCost, 0)) / (Object.values(monthlyData).reduce((acc, m) => acc + m.revenue, 0) || 1) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card overflow-hidden">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">Chi tiết theo tháng</h3>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-primary" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Doanh thu</span>
                          <span className="w-3 h-3 rounded-full bg-secondary ml-2" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Chi phí</span>
                        </div>
                      </div>
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Tháng</th>
                            <th className="px-6 py-4">Số buổi / Giờ</th>
                            <th className="px-6 py-4">Doanh thu (Học phí)</th>
                            <th className="px-6 py-4">Chi phí GV</th>
                            <th className="px-6 py-4">Lợi nhuận</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedMonths.map(month => {
                            const m = monthlyData[month];
                            const profit = m.revenue - m.teacherCost;
                            return (
                              <tr key={month} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <span className="text-sm font-bold text-slate-700">{month}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-xs">
                                    <p className="font-bold text-slate-700">{m.sessions.length} buổi</p>
                                    <p className="text-slate-500">{m.hours.toFixed(1)} giờ dạy</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm font-bold text-primary">{formatCurrency(m.revenue)}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm font-bold text-secondary">{formatCurrency(m.teacherCost)}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <span className={cn(
                                      "text-sm font-bold",
                                      profit >= 0 ? "text-success" : "text-error"
                                    )}>
                                      {formatCurrency(profit)}
                                    </span>
                                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className={cn("h-full", profit >= 0 ? "bg-success" : "bg-error")}
                                        style={{ width: `${Math.min(100, (Math.abs(profit) / (m.revenue || 1)) * 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {sortedMonths.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">Chưa có dữ liệu tài chính theo tháng</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      );
    }

    const filteredClasses = data.classes.filter(cls => {
      const status = getClassStatus(cls);
      const matchesStatus = classStatusFilter === 'all' || status === classStatusFilter;
      const matchesTeacher = classTeacherFilter === 'all' || cls.teacherId === classTeacherFilter || (cls.schedule || []).some(s => s.teacherId === classTeacherFilter);
      // Teacher role: only see their own classes
      const isMyClass = user.role === 'admin' || cls.teacherId === user.teacherId || (cls.schedule || []).some(s => s.teacherId === user.teacherId);
      return matchesStatus && matchesTeacher && isMyClass;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Quản lý lớp học</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select 
                value={classStatusFilter}
                onChange={(e) => setClassStatusFilter(e.target.value)}
                className="pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang mở</option>
                <option value="upcoming">Sắp mở</option>
                <option value="completed">Đã kết thúc</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Menu size={14} />
              </div>
            </div>

            <div className="relative">
              <select 
                value={classTeacherFilter}
                onChange={(e) => setClassTeacherFilter(e.target.value)}
                className="pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="all">Tất cả giáo viên</option>
                {data.teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <GraduationCap size={14} />
              </div>
            </div>

            {user.role === 'admin' && (
              <button 
                onClick={() => { setEditingClass(null); setIsClassModalOpen(true); }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                <span>Thêm lớp học</span>
              </button>
            )}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Lớp học</th>
                  <th className="px-6 py-4">Giáo viên</th>
                  <th className="px-6 py-4">Học viên</th>
                  <th className="px-6 py-4">Lịch học</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.map(cls => {
                  const teacher = (data.teachers || []).find(t => t.id === cls.teacherId);
                  const status = getClassStatus(cls);
                  return (
                    <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cls.color }}>
                            <BookOpen size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{cls.name}</p>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{cls.type}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                              {teacher?.name.charAt(0)}
                            </div>
                            <span className="text-sm text-slate-700 font-bold">{teacher?.shortName || teacher?.name || 'Chưa phân công'}</span>
                          </div>
                          {(() => {
                            const otherTeachers = Array.from(new Set((cls.schedule || []).map(s => s.teacherId).filter(id => id && id !== cls.teacherId)));
                            if (otherTeachers.length > 0) {
                              return (
                                <p className="text-[10px] text-slate-400 italic">
                                  + {otherTeachers.length} GV khác
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase">
                          {cls.students.length} Học viên
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {(cls.schedule || []).map((s, idx) => {
                            const sessionTeacher = data.teachers.find(t => t.id === s.teacherId);
                            return (
                              <span key={idx} className="text-[10px] text-slate-600">
                                Thứ {s.day === 0 ? 'CN' : s.day + 1}: {s.startTime} - {s.endTime}
                                {s.teacherId && s.teacherId !== cls.teacherId && sessionTeacher && (
                                  <span className="text-primary ml-1">({sessionTeacher.name})</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          status === 'active' ? "bg-success/10 text-success" : 
                          status === 'upcoming' ? "bg-warning/10 text-warning" : "bg-slate-100 text-slate-500"
                        )}>
                          {status === 'active' ? 'Đang mở' : status === 'upcoming' ? 'Sắp mở' : 'Đã kết thúc'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] text-slate-500">
                          <p>BĐ: {dayjs(cls.startDate).format('DD/MM/YYYY')}</p>
                          <p>KT: {dayjs(cls.endDate).format('DD/MM/YYYY')}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setViewingClassId(cls.id); setClassActiveTab('overview'); }}
                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                            title="Chi tiết"
                          >
                            <Eye size={18} />
                          </button>
                          {user.role === 'admin' && (
                            <>
                              <button 
                                onClick={() => { setEditingClass(cls); setIsClassModalOpen(true); }}
                                className="p-2 text-slate-400 hover:text-secondary transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Settings size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteClass(cls.id)}
                                className="p-2 text-slate-400 hover:text-error transition-colors"
                                title="Xóa lớp học"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredClasses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400 italic">Không tìm thấy lớp học phù hợp</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderTeacherDashboard = (teacher: Teacher) => {
    const currentMonthStr = dayjs().format('YYYY-MM');
    const teacherClasses = data.classes.filter(c => c.teacherId === teacher.id);
    const teacherLessonsThisMonth = data.lessons.filter(l => 
      l.classId && 
      (l.teacherId === teacher.id || l.assistantId === teacher.id) &&
      dayjs(l.date).format('YYYY-MM') === currentMonthStr &&
      l.status !== 'cancel'
    );
    
    // Calculate total teaching hours for this month
    let totalHoursThisMonth = 0;
    const classBreakdown: Record<string, { sessions: number, hours: number }> = {};

    teacherLessonsThisMonth.forEach(lesson => {
      const cls = data.classes.find(c => c.id === lesson.classId);
      let hours = 0;
      if (lesson.startTime && lesson.endTime) {
        const start = dayjs(`2000-01-01 ${lesson.startTime}`);
        const end = dayjs(`2000-01-01 ${lesson.endTime}`);
        hours = end.diff(start, 'hour', true);
      } else if (cls && cls.schedule) {
        const dayOfWeek = dayjs(lesson.date).day();
        const sc = cls.schedule.find(s => s.day === dayOfWeek) || cls.schedule[0];
        if (sc) {
          const start = dayjs(`2000-01-01 ${sc.startTime}`);
          const end = dayjs(`2000-01-01 ${sc.endTime}`);
          hours = end.diff(start, 'hour', true);
        }
      }
      totalHoursThisMonth += hours;
      
      if (cls) {
        if (!classBreakdown[cls.id]) {
          classBreakdown[cls.id] = { sessions: 0, hours: 0 };
        }
        classBreakdown[cls.id].sessions += 1;
        classBreakdown[cls.id].hours += hours;
      }
    });

    const currentAdj = teacher.salaryAdjustments?.[currentMonthStr] || { allowance: 0, penalty: 0, notes: '', paid: false };
    const baseSalary = teacher.baseSalary || 0;
    const expectedSalary = baseSalary + (totalHoursThisMonth * (teacher.hourlyRate || 0) * ((teacher.kpi || 100) / 100)) + Number(currentAdj.allowance) - Number(currentAdj.penalty);

    const seniorityMonths = teacher.startDate ? dayjs().diff(dayjs(teacher.startDate), 'month') : 0;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Hồ sơ cá nhân</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary/20 to-secondary/20" />
              <div className="relative pt-6 flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 rounded-3xl bg-white shadow-xl flex items-center justify-center text-primary font-bold text-3xl border-4 border-white z-10 overflow-hidden">
                  {teacher.avatar ? <img src={teacher.avatar} alt="avatar" className="w-full h-full object-cover" /> : (teacher.name?.charAt(0) || '?')}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{teacher.name}</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">{teacher.specialization} • Thâm niên: {seniorityMonths} tháng</p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider",
                  teacher.status === 'active' ? "bg-success/10 text-success" : "bg-error/10 text-error"
                )}>
                  {teacher.status === 'active' ? 'Đang hoạt động' : 'Đã nghỉ'}
                </span>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin liên hệ</h4>
                  {!isEditingProfile ? (
                    <button 
                      onClick={() => {
                        setProfileForm({ email: teacher.email || '', phone: teacher.phone || '' });
                        setIsEditingProfile(true);
                      }} 
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Settings size={12}/> Chỉnh sửa
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsEditingProfile(false)} 
                        className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={() => {
                          updateData(prev => ({
                            ...prev,
                            teachers: prev.teachers.map(t => t.id === teacher.id ? { ...t, email: profileForm.email, phone: profileForm.phone } : t)
                          }));
                          setIsEditingProfile(false);
                          Swal.fire({
                            title: 'Thành công',
                            text: 'Cập nhật thông tin liên hệ thành công',
                            icon: 'success',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000
                          });
                        }} 
                        className="text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-3 py-1 rounded-lg transition-all"
                      >
                        Lưu
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingProfile ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl transition-all">
                      <Mail size={16} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{teacher.email || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl transition-all">
                      <Phone size={16} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{teacher.phone || 'Chưa cập nhật'}</span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 bg-white rounded-xl border-2 border-primary/20 focus-within:border-primary shadow-sm transition-all text-sm">
                      <Mail size={16} className="text-primary ml-1" />
                      <input 
                        type="email" 
                        value={profileForm.email} 
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Email liên hệ..."
                        className="w-full bg-transparent font-medium text-slate-700 outline-none placeholder:font-normal"
                      />
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-white rounded-xl border-2 border-primary/20 focus-within:border-primary shadow-sm transition-all text-sm">
                      <Phone size={16} className="text-primary ml-1" />
                      <input 
                        type="tel" 
                        value={profileForm.phone} 
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Số điện thoại..."
                        className="w-full bg-transparent font-medium text-slate-700 outline-none placeholder:font-normal"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard title="Giờ dạy tháng này" value={`${totalHoursThisMonth.toFixed(1)}h`} icon={Clock} color="bg-secondary" />
              
              <div className="glass-card p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">KPI Hiện tại</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-800">{teacher.kpi}%</h3>
                  </div>
                  <div className="p-4 rounded-2xl bg-success">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                </div>
                <div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-1.5 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000", teacher.kpi >= 100 ? "bg-success" : teacher.kpi >= 80 ? "bg-warning" : "bg-error")} 
                      style={{ width: `${Math.min(teacher.kpi || 0, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-500 text-right font-medium">Mục tiêu: 100%</p>
                </div>
              </div>

              <StatCard title="Phụ cấp tháng" value={`+${formatCurrency(currentAdj.allowance)}`} icon={Plus} color="bg-primary" />
              <StatCard title="Khấu trừ tháng" value={`-${formatCurrency(currentAdj.penalty)}`} icon={TrendingDown} color="bg-error" />
            </div>

            <div className="glass-card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Lương dự kiến ({currentMonthStr})</h3>
                  <p className="text-sm text-slate-500">Tính theo giờ dạy thực tế của tháng hiện tại</p>
                </div>
                <div className="md:text-right flex flex-col md:items-end bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-3xl font-bold text-primary">{formatCurrency(expectedSalary)}</p>
                  {currentAdj.paid ? 
                    <span className="inline-flex items-center gap-1 text-[10px] bg-success/10 text-success px-2 py-1 rounded-full font-bold uppercase mt-2 border border-success/20"><CheckCircle2 size={12}/> Đã thanh toán</span> : 
                    <span className="inline-flex items-center gap-1 text-[10px] bg-warning/10 text-warning px-2 py-1 rounded-full font-bold uppercase mt-2 border border-warning/20"><Clock size={12}/> Chờ thanh toán</span>
                  }
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen size={14}/> Chi tiết giờ dạy các lớp
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Lớp học</th>
                        <th className="p-4">Số buổi dạy</th>
                        <th className="p-4">Tổng giờ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {Object.keys(classBreakdown).length > 0 ? Object.keys(classBreakdown).map(classId => {
                        const clsName = data.classes.find(c => c.id === classId)?.name || 'Unknown';
                        return (
                          <tr key={classId} className="text-sm hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-700">{clsName}</td>
                            <td className="p-4 text-slate-600 font-medium">
                              <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs">{classBreakdown[classId].sessions} buổi</span>
                            </td>
                            <td className="p-4 text-primary font-bold">{classBreakdown[classId].hours.toFixed(1)}h</td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">Chưa có dữ liệu dạy tháng này</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Wallet size={20} className="text-primary"/> Lịch sử nhận lương
              </h3>
              <div className="space-y-4">
                {Object.keys(teacher.salaryAdjustments || {}).filter(k => teacher.salaryAdjustments![k].paid).sort().reverse().map(month => {
                  const adj = teacher.salaryAdjustments![month];
                  return (
                    <div key={month} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow gap-4 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-success"></div>
                      <div className="pl-3">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-slate-800 text-lg">Tháng {month}</h4>
                          <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold uppercase rounded-full flex items-center gap-1 border border-success/20">
                            <CheckCircle2 size={12}/> Đã thanh toán
                          </span>
                        </div>
                        {adj.notes ? (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 inline-block">
                            {adj.notes.split('|').map((note, i) => note ? <span key={i} className="mr-3 last:mr-0 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> {note}</span> : null)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-6 items-center bg-slate-50 px-5 py-3 rounded-xl border border-slate-100">
                         <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase text-right mb-1">Phụ cấp</p>
                            <p className="text-sm font-bold text-success text-right">+{formatCurrency(adj.allowance)}</p>
                         </div>
                         <div className="w-px h-8 bg-slate-200"></div>
                         <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase text-right mb-1">Khấu trừ</p>
                            <p className="text-sm font-bold text-error text-right">-{formatCurrency(adj.penalty)}</p>
                         </div>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(teacher.salaryAdjustments || {}).filter(k => teacher.salaryAdjustments![k].paid).length === 0 && (
                  <div className="py-10 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                    <Wallet size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="font-medium text-sm">Chưa có lịch sử nhận lương nào</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTeachers = () => {
    if (user.role === 'teacher') {
      const teacher = data.teachers.find(t => t.id === user.teacherId);
      if (!teacher) return <div className="p-8 text-center text-slate-500">Giáo viên không tồn tại</div>;
      return renderTeacherDashboard(teacher);
    }

    const baseTeachers = data.teachers;
    const filteredTeachers = baseTeachers.filter(teacher => {
      const searchLower = (teacherSearch || '').toLowerCase();
      const matchesSearch = 
        (teacher.name || '').toLowerCase().includes(searchLower) ||
        (teacher.phone || '').includes(teacherSearch) ||
        (teacher.specialization || '').toLowerCase().includes(searchLower);
      
      const matchesStatus = teacherStatusFilter === 'all' || teacher.status === teacherStatusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">{user.role === 'admin' ? 'Quản lý giáo viên' : 'Hồ sơ cá nhân'}</h2>
          {user.role === 'admin' && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Tìm tên, SĐT, chuyên môn..." 
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none w-64" 
                />
              </div>
              <select 
                value={teacherStatusFilter}
                onChange={(e) => setTeacherStatusFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang dạy</option>
                <option value="inactive">Đã nghỉ</option>
              </select>
              <button 
                onClick={() => { setEditingTeacher(null); setIsTeacherModalOpen(true); }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                <span>Thêm giáo viên</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map(teacher => {
            const teacherClasses = data.classes.filter(c => c.teacherId === teacher.id);
            const teacherLessons = data.lessons.filter(l => l.classId && teacherClasses.some(c => c.id === l.classId));
            
            // Calculate total teaching hours
            let totalHours = 0;
            teacherLessons.forEach(lesson => {
              const cls = data.classes.find(c => c.id === lesson.classId);
              if (cls && cls.schedule) {
                // For simplicity, assume all lessons of a class have the same duration as defined in schedule
                const firstSchedule = cls.schedule[0];
                if (firstSchedule) {
                  const start = dayjs(`2000-01-01 ${firstSchedule.startTime}`);
                  const end = dayjs(`2000-01-01 ${firstSchedule.endTime}`);
                  totalHours += end.diff(start, 'hour', true);
                }
              }
            });

            // Lương dự kiến = Lương cơ bản + (Tổng giờ dạy * Lương theo giờ * KPI)
            const estimatedSalary = (teacher.baseSalary || 0) + (totalHours * (teacher.hourlyRate || 0) * ((teacher.kpi || 0) / 100));

            // Seniority (Thâm niên)
            const seniorityMonths = teacher.startDate ? dayjs().diff(dayjs(teacher.startDate), 'month') : 0;
            const seniorityYears = Math.floor(seniorityMonths / 12);
            const remainingMonths = seniorityMonths % 12;
            const seniorityStr = seniorityYears > 0 
              ? `${seniorityYears} năm ${remainingMonths} tháng` 
              : `${remainingMonths} tháng`;

            return (
              <div key={teacher.id} className="glass-card p-6 space-y-4 group hover:border-primary/30 transition-all relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary font-bold text-xl overflow-hidden border-2 border-white shadow-sm">
                      {teacher.avatar ? (
                        <img src={teacher.avatar} alt={teacher.name || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        (teacher.name || '?').charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{teacher.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-wider">
                          {teacher.type === 'full-time' ? 'Full-time' : 'Part-time'}
                        </span>
                        <div className="relative group/status">
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider cursor-help",
                            teacher.status === 'active' ? "bg-success/10 text-success" : "bg-error/10 text-error"
                          )}>
                            {teacher.status === 'active' ? 'Đang dạy' : 'Nghỉ dạy'}
                          </span>
                          {teacher.status === 'inactive' && teacher.statusReason && (
                            <div className="absolute z-50 hidden group-hover/status:block bg-slate-800 text-white p-2 rounded text-[10px] w-48 bottom-full left-0 mb-2 shadow-xl">
                              <p className="font-bold mb-1">Lý do: {teacher.statusReason}</p>
                              {teacher.statusDate && <p>Ngày nghỉ: {dayjs(teacher.statusDate).format('DD/MM/YYYY')}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.role === 'admin' && (
                      <>
                        <button 
                          onClick={() => { setEditingTeacher(teacher); setIsTeacherModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors"
                        >
                          <Settings size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTeacher(teacher.id)}
                          className="p-2 text-slate-400 hover:text-error transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <GraduationCap size={14} className="text-primary" />
                    <span className="font-medium">Chuyên môn: {teacher.specialization}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={14} className="text-primary" />
                    <span>Thâm niên: {seniorityStr}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone size={14} className="text-primary" />
                    <span>{teacher.phone}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Lớp đang dạy</p>
                    <p className="font-bold text-slate-700">{teacherClasses.length} lớp</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">KPI Hiệu suất</p>
                    <p className="font-bold text-success">{teacher.kpi}%</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Lương dự kiến tháng này</p>
                    <span className="text-[10px] font-bold text-slate-400">({totalHours.toFixed(1)} giờ)</span>
                  </div>
                  <p className="text-lg font-bold text-primary">{formatCurrency(estimatedSalary)}</p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      // Get all sessions for the current week where this teacher is assigned
                      const startOfWeek = dayjs().startOf('week').add(1, 'day');
                      const weekSessions: any[] = [];
                      
                      for (let i = 0; i < 7; i++) {
                        const date = startOfWeek.add(i, 'day');
                        const sessions = getSessionsForDate(date, data.classes, data.lessons);
                        const teacherSessions = sessions.filter(s => s.teacherId === teacher.id || s.assistantId === teacher.id);
                        
                        teacherSessions.forEach(s => {
                          weekSessions.push({
                            date: date.format('DD/MM'),
                            day: date.day(),
                            className: s.name,
                            time: `${s.startTime} - ${s.endTime}`,
                            role: s.teacherId === teacher.id ? 'GV' : 'TA',
                            status: s.status
                          });
                        });
                      }

                      Swal.fire({
                        title: `Lịch dạy tuần này: ${teacher.name || 'Giáo viên'}`,
                        html: `
                          <div class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            ${weekSessions.map(s => `
                              <div class="flex justify-between items-center p-3 ${s.status === 'cancel' ? 'bg-slate-100 opacity-50 line-through' : 'bg-slate-50'} rounded-xl border border-slate-100 text-sm">
                                <div class="text-left">
                                  <p class="font-bold text-slate-700">Thứ ${s.day === 0 ? 'CN' : s.day + 1} (${s.date})</p>
                                  <p class="text-[10px] text-slate-500 uppercase font-bold">${s.className}</p>
                                </div>
                                <div class="text-right">
                                  <p class="font-bold text-primary">${s.time}</p>
                                  <p class="text-[10px] font-bold ${s.role === 'GV' ? 'text-secondary' : 'text-amber-500'}">${s.role === 'GV' ? 'GIÁO VIÊN' : 'TRỢ GIẢNG'}</p>
                                </div>
                              </div>
                            `).join('') || '<div class="py-8 text-center text-slate-400 italic">Chưa có lịch dạy trong tuần này</div>'}
                          </div>
                        `,
                        confirmButtonText: 'Đóng',
                        customClass: {
                          container: 'z-[200]',
                          popup: 'rounded-3xl border-none shadow-2xl'
                        }
                      });
                    }}
                    className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Calendar size={14} />
                    <span>Lịch tuần này</span>
                  </button>

                  <button 
                    onClick={() => {
                      const history = Object.keys(teacher.salaryAdjustments || {})
                        .filter(key => teacher.salaryAdjustments?.[key]?.paid)
                        .sort((a, b) => b.localeCompare(a)); // sort descending
                      
                      Swal.fire({
                        title: `Lịch sử nhận lương`,
                        html: `
                          <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2 text-left">
                            ${history.length > 0 ? history.map(h => {
                              const adj = teacher.salaryAdjustments![h];
                              return `
                              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div class="flex justify-between border-b border-slate-200 pb-2 mb-2">
                                  <span class="font-bold text-slate-700">Tháng ${h}</span>
                                  <span class="text-[10px] font-bold text-success flex items-center gap-1"><i class="fas fa-check-circle"></i> Đã thanh toán</span>
                                </div>
                                <div class="space-y-1 text-sm">
                                  <div class="flex justify-between"><span class="text-slate-500">Phụ cấp:</span> <span class="font-medium text-success">+${Number(adj.allowance).toLocaleString()}đ</span></div>
                                  <div class="flex justify-between"><span class="text-slate-500">Khấu trừ:</span> <span class="font-medium text-error">-${Number(adj.penalty).toLocaleString()}đ</span></div>
                                  ${adj.notes ? `<p class="text-xs text-slate-400 italic mt-2 border-l-2 pl-2 border-slate-200">Ghi chú: ${adj.notes}</p>` : ''}
                                </div>
                              </div>
                              `;
                            }).join('') : '<div class="py-8 text-center text-slate-400 italic">Chưa có dữ liệu nhận lương</div>'}
                          </div>
                        `,
                        confirmButtonText: 'Đóng',
                        customClass: {
                          container: 'z-[200]',
                          popup: 'rounded-3xl border-none shadow-2xl'
                        }
                      });
                    }}
                    className="flex-1 py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Wallet size={14} />
                    <span>Lịch sử lương</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFinance = () => {
    const selectedMonth = scheduleViewDate.startOf('month');
    const monthStr = selectedMonth.format('MM/YYYY');
    const monthKey = selectedMonth.format('YYYY-MM');
    const prevMonth = selectedMonth.subtract(1, 'month');
    
    // 1. Calculate Teacher Costs for the selected month
    let totalTeacherCosts = 0;
    const daysInMonth = selectedMonth.daysInMonth();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = selectedMonth.date(i);
      const sessions = getSessionsForDate(date, data.classes, data.lessons);
      
      sessions.forEach(session => {
        if (session.status !== 'cancel' && session.isActual) {
          const teacher = data.teachers.find(t => t.id === session.teacherId);
          if (teacher) {
            const start = dayjs(`2000-01-01 ${session.startTime}`);
            const end = dayjs(`2000-01-01 ${session.endTime}`);
            const hours = end.diff(start, 'hour', true);
            totalTeacherCosts += hours * (teacher.hourlyRate || 0);
          }
          
          const assistant = data.teachers.find(t => t.id === session.assistantId);
          if (assistant) {
            const start = dayjs(`2000-01-01 ${session.startTime}`);
            const end = dayjs(`2000-01-01 ${session.endTime}`);
            const hours = end.diff(start, 'hour', true);
            totalTeacherCosts += hours * (assistant.hourlyRate || 0);
          }
        }
      });
    }

    // 2. Calculate Tuition Income for the selected month
    const monthlyIncome = (data.transactions || [])
      .filter(t => t.type === 'income' && dayjs(t.date).isSame(selectedMonth, 'month'))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const monthlyExpense = (data.transactions || [])
      .filter(t => t.type === 'expense' && dayjs(t.date).isSame(selectedMonth, 'month'))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // 3. Calculate Total Student Debt
    const totalDebt = (data.students || []).reduce((sum, s) => sum + (s.balance || 0), 0);

    // Auto-debt logic: If today is after the 5th of the current month, mark billed as debt
    const isAfterFifth = dayjs().date() > 5 && dayjs().isSame(selectedMonth, 'month');

    const handleUpdateBill = (billId: string, updates: Partial<MonthlyBill>) => {
      setData(prev => ({
        ...prev,
        monthlyBills: (prev.monthlyBills || []).map(b => {
          if (b.id === billId) {
            const updatedBill = { ...b, ...updates };
            const remaining = updatedBill.totalAmount - updatedBill.amountPaid;
            let status: MonthlyBill['status'] = 'debt';
            if (updatedBill.amountPaid === 0) status = 'debt';
            else if (remaining > 0) status = 'partial';
            else status = 'paid';
            return { ...updatedBill, status };
          }
          return b;
        })
      }));
    };

    const handleCreateBill = (studentId: string) => {
      const student = data.students.find(s => s.id === studentId);
      if (!student) return;

      const activeClasses = data.classes.filter(c => student.classes.includes(c.id) && c.status === 'active');
      const totalTuition = activeClasses.reduce((sum, c) => {
        const discount = c.studentDiscounts?.[studentId];
        let fee = c.tuitionFee || 0;
        if (discount) {
          if (discount.type === 'percent') fee = fee * (1 - discount.value / 100);
          else fee = Math.max(0, fee - discount.value);
        }
        return sum + fee;
      }, 0);

      // Calculate sessions in CURRENT month
      let totalSessions = 0;
      const daysInMonth = selectedMonth.daysInMonth();
      for (let i = 1; i <= daysInMonth; i++) {
        const date = selectedMonth.date(i);
        const sessions = getSessionsForDate(date, data.classes, data.lessons);
        totalSessions += sessions.filter(s => student.classes.includes(s.id) && s.status !== 'cancel').length;
      }

      // Calculate deductions from previous month
      let deductions = 0;
      const prevMonthSessions = [];
      const daysInPrevMonth = prevMonth.daysInMonth();
      for (let i = 1; i <= daysInPrevMonth; i++) {
        const date = prevMonth.date(i);
        const sessions = getSessionsForDate(date, data.classes, data.lessons);
        prevMonthSessions.push(...sessions.filter(s => student.classes.includes(s.id)).map(s => ({ ...s, date })));
      }

      const absentSessions = prevMonthSessions.filter(s => {
        const lesson = data.lessons.find(l => l.classId === s.id && dayjs(l.date).isSame(s.date, 'day'));
        const att = lesson?.attendance.find(a => a.studentId === studentId);
        return att?.status === 'absent';
      });

      const makeupSessions = prevMonthSessions.filter(s => {
        const lesson = data.lessons.find(l => l.classId === s.id && dayjs(l.date).isSame(s.date, 'day'));
        const att = lesson?.attendance.find(a => a.studentId === studentId);
        return att?.status === 'make-up';
      });

      // Simple deduction logic: tuition / 8 sessions per month * (absent - makeup)
      const sessionsPerMonth = 8; 
      deductions = Math.max(0, (absentSessions.length - makeupSessions.length) * (totalTuition / sessionsPerMonth));

      const newBill: MonthlyBill = {
        id: `bill-${Date.now()}-${studentId}`,
        studentId,
        month: monthKey,
        status: 'billed',
        amountPaid: 0,
        totalAmount: totalTuition - deductions,
        deductions,
        totalSessions,
        absentSessions: absentSessions.length,
        makeupSessions: makeupSessions.length,
      };

      setData(prev => ({
        ...prev,
        monthlyBills: [...(prev.monthlyBills || []), newBill]
      }));
    };

    const renderTuitionTab = () => {
      return (
        <div className="space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
              <h3 className="font-bold">Danh sách thu học phí tháng {monthStr}</h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    data.students.filter(s => s.status === 'active').forEach(s => {
                      const existing = (data.monthlyBills || []).find(b => b.studentId === s.id && b.month === monthKey);
                      if (!existing) handleCreateBill(s.id);
                    });
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Tự động tạo báo phí cho tất cả
                </button>
                <button 
                  onClick={async () => {
                    const activeStudents = data.students.filter(s => s.status === 'active');
                    const bills = (data.monthlyBills || []).filter(b => b.month === monthKey);
                    
                    Swal.fire({
                      title: 'Đang chuẩn bị...',
                      text: 'Vui lòng chờ trong khi hệ thống tạo báo phí cho tất cả học viên.',
                      allowOutsideClick: false,
                      didOpen: () => {
                        Swal.showLoading();
                      }
                    });

                    for (const student of activeStudents) {
                      const bill = bills.find(b => b.studentId === student.id);
                      if (bill) {
                        await handleExportTuitionNotification(student, bill);
                      }
                    }
                    Swal.close();
                  }}
                  className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
                >
                  <Download size={14} /> Xuất báo phí cho tất cả
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Học viên</th>
                    <th className="px-6 py-4">Lớp tham gia</th>
                    <th className="px-6 py-4">Số buổi (Tháng này)</th>
                    <th className="px-6 py-4">Nghỉ/Bù (Tháng trước)</th>
                    <th className="px-6 py-4">Mức học phí</th>
                    <th className="px-6 py-4">Khấu trừ</th>
                    <th className="px-6 py-4">Cần đóng</th>
                    <th className="px-6 py-4">Đã nộp</th>
                    <th className="px-6 py-4">Còn thiếu</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.students.filter(s => s.status === 'active').map(student => {
                    const bill = (data.monthlyBills || []).find(b => b.studentId === student.id && b.month === monthKey);
                    const activeClasses = data.classes.filter(c => student.classes.includes(c.id) && c.status === 'active');
                    
                    if (!bill) {
                      return (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-800 text-sm">{student.name}</td>
                          <td colSpan={8} className="px-6 py-4 text-xs text-slate-400 italic">Chưa tạo báo phí</td>
                          <td className="px-6 py-4">
                            <button onClick={() => handleCreateBill(student.id)} className="text-primary hover:underline text-xs font-bold">Tạo báo phí</button>
                          </td>
                        </tr>
                      );
                    }

                    const currentStatus = (bill.status === 'billed' && isAfterFifth) ? 'debt' : bill.status;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-800 text-sm">{student.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {activeClasses.map(c => (
                              <span key={c.id} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-600">
                          {bill.totalSessions} buổi
                        </td>
                        <td className="px-6 py-4 text-[10px] text-slate-500">
                          <div className="flex flex-col">
                            <span>Vắng: {bill.absentSessions}</span>
                            <span>Bù: {bill.makeupSessions}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">
                          {formatCurrency(activeClasses.reduce((sum, c) => {
                            const discount = c.studentDiscounts?.[student.id];
                            let fee = c.tuitionFee || 0;
                            if (discount) {
                              if (discount.type === 'percent') fee = fee * (1 - discount.value / 100);
                              else fee = Math.max(0, fee - discount.value);
                            }
                            return sum + fee;
                          }, 0))}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-error">
                          -{formatCurrency(bill.deductions)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-primary">
                          {formatCurrency(bill.totalAmount)}
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number" 
                            value={bill.amountPaid}
                            onChange={(e) => handleUpdateBill(bill.id, { amountPaid: Number(e.target.value) })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                Swal.fire({
                                  title: 'Xác nhận đóng học phí',
                                  text: `Bạn xác nhận học viên ${student.name} đã đóng ${formatCurrency(bill.amountPaid)}?`,
                                  icon: 'question',
                                  showCancelButton: true,
                                  confirmButtonText: 'Xác nhận',
                                  cancelButtonText: 'Hủy'
                                }).then((result) => {
                                  if (result.isConfirmed) {
                                    handleUpdateBill(bill.id, { status: bill.amountPaid >= bill.totalAmount ? 'paid' : 'partial' });
                                    
                                    const newTxn: Transaction = {
                                      id: `txn-${Date.now()}`,
                                      type: 'income',
                                      amount: bill.amountPaid,
                                      category: 'Học phí',
                                      description: `Học phí tháng ${monthStr} - ${student.name}`,
                                      date: dayjs().format('YYYY-MM-DD'),
                                      relatedId: student.id
                                    };
                                    setData(prev => ({
                                      ...prev,
                                      transactions: [...prev.transactions, newTxn]
                                    }));
                                    Swal.fire('Thành công', 'Đã ghi nhận đóng học phí', 'success');
                                  }
                                });
                              }
                            }}
                            className="w-24 px-2 py-1 border border-slate-200 rounded text-sm outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-error">
                          {formatCurrency(Math.max(0, bill.totalAmount - bill.amountPaid))}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
                            bill.status === 'paid' ? "bg-success/10 text-success" :
                            bill.status === 'partial' ? "bg-warning/10 text-warning" : "bg-error/10 text-error"
                          )}>
                            {bill.status === 'paid' ? 'Đã đóng' : bill.status === 'partial' ? 'Đóng một phần' : 'Còn nợ'}
                          </span>
                        </td>
                        <td className="px-6 py-4 flex items-center gap-2">
                          <button 
                            onClick={() => handleExportTuitionNotification(student, bill)}
                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                            title="Xuất thông báo"
                          >
                            <Download size={16} />
                          </button>
                          {bill.amountPaid > 0 && bill.status !== 'paid' && (
                            <button 
                              onClick={() => {
                                handleUpdateBill(bill.id, { status: 'paid' });
                                // Add transaction
                                const newTxn: Transaction = {
                                  id: `txn-${Date.now()}`,
                                  type: 'income',
                                  amount: bill.amountPaid,
                                  category: 'Học phí',
                                  description: `Học phí tháng ${monthStr} - ${student.name}`,
                                  date: dayjs().format('YYYY-MM-DD'),
                                  relatedId: student.id
                                };
                                setData(prev => ({
                                  ...prev,
                                  transactions: [...prev.transactions, newTxn]
                                }));
                              }}
                              className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors"
                              title="Xác nhận đóng phí"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    };

    const renderSalariesTab = () => {
      return (
        <div className="space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold">Lương giáo viên tháng {monthStr}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Giáo viên</th>
                    <th className="px-6 py-4">Số ngày dạy</th>
                    <th className="px-6 py-4">Tổng giờ dạy</th>
                    <th className="px-6 py-4">Lương theo giờ</th>
                    <th className="px-6 py-4">Phụ cấp</th>
                    <th className="px-6 py-4">Phạt</th>
                    <th className="px-6 py-4">Tổng thực tế</th>
                    <th className="px-6 py-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.teachers.map(teacher => {
                    let totalHours = 0;
                    let teachingDays = new Set();
                    
                    for (let i = 1; i <= daysInMonth; i++) {
                      const date = selectedMonth.date(i);
                      const sessions = getSessionsForDate(date, data.classes, data.lessons);
                      
                      sessions.forEach(session => {
                        if (session.status !== 'cancel' && (session.teacherId === teacher.id || session.assistantId === teacher.id)) {
                          const start = dayjs(`2000-01-01 ${session.startTime}`);
                          const end = dayjs(`2000-01-01 ${session.endTime}`);
                          totalHours += end.diff(start, 'hour', true);
                          teachingDays.add(date.format('YYYY-MM-DD'));
                        }
                      });
                    }

                    const adj = teacher.salaryAdjustments?.[monthKey] || { allowance: 0, penalty: 0, notes: '' };
                    const basePay = totalHours * (teacher.hourlyRate || 0);
                    const totalPay = basePay + adj.allowance - adj.penalty;

                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {teacher.name.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-800 text-sm">{teacher.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{teachingDays.size} ngày</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{totalHours.toFixed(1)} giờ</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{formatCurrency(teacher.hourlyRate || 0)}/h</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <input 
                              type="number" 
                              key={`allowance-${teacher.id}-${monthKey}-${adj.allowance}`}
                              defaultValue={adj.allowance}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (val !== adj.allowance) {
                                  updateData(prev => ({
                                    ...prev,
                                    teachers: prev.teachers.map(t => t.id === teacher.id ? {
                                      ...t,
                                      salaryAdjustments: {
                                        ...(t.salaryAdjustments || {}),
                                        [monthKey]: { ...adj, allowance: val }
                                      }
                                    } : t)
                                  }));
                                }
                              }}
                              className="w-20 px-2 py-1 border border-slate-200 rounded text-sm outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input 
                              placeholder="Ghi chú"
                              type="text" 
                              key={`note-allowance-${teacher.id}-${monthKey}-${adj.notes?.split('|')[0] || ''}`}
                              defaultValue={adj.notes?.split('|')[0] || ''}
                              onBlur={(e) => {
                                const val = e.target.value;
                                const currentNote = adj.notes?.split('|')[0] || '';
                                if (val !== currentNote) {
                                  const penaltyNote = adj.notes?.split('|')[1] || '';
                                  updateData(prev => ({
                                    ...prev,
                                    teachers: prev.teachers.map(t => t.id === teacher.id ? {
                                      ...t,
                                      salaryAdjustments: {
                                        ...(t.salaryAdjustments || {}),
                                        [monthKey]: { ...adj, notes: `${val}|${penaltyNote}` }
                                      }
                                    } : t)
                                  }));
                                }
                              }}
                              className="w-20 px-2 py-0.5 border border-slate-100 rounded text-[10px] outline-none"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <input 
                              type="number" 
                              key={`penalty-${teacher.id}-${monthKey}-${adj.penalty}`}
                              defaultValue={adj.penalty}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (val !== adj.penalty) {
                                  updateData(prev => ({
                                    ...prev,
                                    teachers: prev.teachers.map(t => t.id === teacher.id ? {
                                      ...t,
                                      salaryAdjustments: {
                                        ...(t.salaryAdjustments || {}),
                                        [monthKey]: { ...adj, penalty: val }
                                      }
                                    } : t)
                                  }));
                                }
                              }}
                              className="w-20 px-2 py-1 border border-slate-200 rounded text-sm outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input 
                              placeholder="Ghi chú"
                              type="text" 
                              key={`note-penalty-${teacher.id}-${monthKey}-${adj.notes?.split('|')[1] || ''}`}
                              defaultValue={adj.notes?.split('|')[1] || ''}
                              onBlur={(e) => {
                                const val = e.target.value;
                                const currentNote = adj.notes?.split('|')[1] || '';
                                if (val !== currentNote) {
                                  const allowanceNote = adj.notes?.split('|')[0] || '';
                                  updateData(prev => ({
                                    ...prev,
                                    teachers: prev.teachers.map(t => t.id === teacher.id ? {
                                      ...t,
                                      salaryAdjustments: {
                                        ...(t.salaryAdjustments || {}),
                                        [monthKey]: { ...adj, notes: `${allowanceNote}|${val}` }
                                      }
                                    } : t)
                                  }));
                                }
                              }}
                              className="w-20 px-2 py-0.5 border border-slate-100 rounded text-[10px] outline-none"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-primary">{formatCurrency(totalPay)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleExportSalaryNotification(teacher, totalHours, basePay, totalPay, adj)}
                              className="p-2 text-slate-400 hover:text-primary transition-colors"
                              title="Xuất phiếu lương"
                            >
                              <Download size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                const newTxn: Transaction = {
                                  id: `txn-${Date.now()}`,
                                  type: 'expense',
                                  amount: totalPay,
                                  category: 'Lương GV',
                                  description: `Lương tháng ${monthStr} - ${teacher.name}`,
                                  date: dayjs().format('YYYY-MM-DD'),
                                  relatedId: teacher.id
                                };
                                updateData(prev => ({
                                  ...prev,
                                  teachers: prev.teachers.map(t => t.id === teacher.id ? {
                                    ...t,
                                    salaryAdjustments: {
                                      ...(t.salaryAdjustments || {}),
                                      [monthKey]: { ...adj, paid: true }
                                    }
                                  } : t),
                                  transactions: [...prev.transactions, newTxn]
                                }));
                                Swal.fire('Thành công', 'Đã ghi nhận chi lương', 'success');
                              }}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                adj.paid ? "text-error bg-error/10" : "text-success hover:bg-success/10"
                              )}
                              title={adj.paid ? "Đã chi lương" : "Chi lương"}
                              disabled={adj.paid}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    };

    const renderExpensesTab = () => {
      return (
        <div className="space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold">Chi phí khác tháng {monthStr}</h3>
              <button 
                onClick={handleAddTransaction}
                className="btn-primary py-1 px-3 text-[10px] flex items-center gap-1"
              >
                <Plus size={14} /> Thêm chi phí
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Ngày</th>
                    <th className="px-6 py-4">Mô tả</th>
                    <th className="px-6 py-4">Danh mục</th>
                    <th className="px-6 py-4">Số tiền</th>
                    <th className="px-6 py-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.transactions || [])
                    .filter(t => t.type === 'expense' && dayjs(t.date).isSame(selectedMonth, 'month') && t.category !== 'Lương GV')
                    .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
                    .map(txn => (
                      <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-xs text-slate-500">{dayjs(txn.date).format('DD/MM/YYYY')}</td>
                        <td className="px-6 py-4 font-medium text-slate-800 text-sm">{txn.description}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                            {txn.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-sm text-error">
                          -{formatCurrency(txn.amount || 0)}
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => {
                              updateData(prev => ({
                                ...prev,
                                transactions: prev.transactions.filter(t => t.id !== txn.id)
                              }));
                            }}
                            className="text-slate-300 hover:text-error transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Quản lý tài chính</h2>
            <p className="text-sm text-slate-500 mt-1">Báo cáo & Đối soát tháng {monthStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setScheduleViewDate(prev => prev.subtract(1, 'month'))}
                className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold px-2">{monthStr}</span>
              <button 
                onClick={() => setScheduleViewDate(prev => prev.add(1, 'month'))}
                className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6 border-l-4 border-success">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Doanh thu tháng (Đã thu)</p>
            <h3 className="text-xl font-bold text-slate-800">{formatCurrency(monthlyIncome)}</h3>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-success font-bold">
              <TrendingUp size={12} />
              <span>Từ học phí & khác</span>
            </div>
          </div>
          <div className="glass-card p-6 border-l-4 border-error">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Chi phí GV dự kiến</p>
            <h3 className="text-xl font-bold text-slate-800">{formatCurrency(totalTeacherCosts)}</h3>
            <p className="mt-2 text-[10px] text-slate-400 font-medium italic">Dựa trên giờ dạy thực tế</p>
          </div>
          <div className="glass-card p-6 border-l-4 border-warning">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Chi phí khác</p>
            <h3 className="text-xl font-bold text-slate-800">{formatCurrency(monthlyExpense)}</h3>
            <p className="mt-2 text-[10px] text-slate-400 font-medium italic">Các khoản chi ngoài lương</p>
          </div>
          <div className="glass-card p-6 border-l-4 border-primary">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Lợi nhuận gộp (Dự kiến)</p>
            <h3 className="text-xl font-bold text-primary">{formatCurrency(monthlyIncome - totalTeacherCosts - monthlyExpense)}</h3>
            <p className="mt-2 text-[10px] text-slate-400 font-medium italic">Sau khi trừ lương GV & chi phí khác</p>
          </div>
        </div>

        <div className="flex border-b border-slate-100 bg-white rounded-t-2xl px-6">
          {[
            { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'tuition', label: 'Thu học phí', icon: Wallet },
            { id: 'salaries', label: 'Lương giáo viên', icon: UserCheck },
            { id: 'expenses', label: 'Chi phí khác', icon: TrendingDown },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setFinanceTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2",
                financeTab === tab.id ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {financeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold">Lịch sử giao dịch tháng {monthStr}</h3>
                  <button 
                    onClick={() => exportTransactionsToExcel(data.transactions || [], monthStr)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-[10px] font-bold transition-colors uppercase"
                  >
                    <Download size={14} /> Xuất Excel
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Ngày</th>
                        <th className="px-6 py-4">Mô tả</th>
                        <th className="px-6 py-4">Danh mục</th>
                        <th className="px-6 py-4">Số tiền</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data.transactions || [])
                        .filter(t => dayjs(t.date).isSame(selectedMonth, 'month'))
                        .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
                        .map(txn => (
                          <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-xs text-slate-500">{dayjs(txn.date).format('DD/MM/YYYY')}</td>
                            <td className="px-6 py-4 font-medium text-slate-800 text-sm">{txn.description}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                                {txn.category}
                              </span>
                            </td>
                            <td className={cn("px-6 py-4 font-bold text-sm", txn.type === 'income' ? "text-success" : "text-error")}>
                              {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount || 0)}
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => {
                                  updateData(prev => ({
                                    ...prev,
                                    transactions: prev.transactions.filter(t => t.id !== txn.id)
                                  }));
                                }}
                                className="text-slate-300 hover:text-error transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="glass-card p-6">
                <h3 className="font-bold mb-4">Đối soát công nợ</h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {(data.students || [])
                    .filter(s => (s.balance || 0) > 0)
                    .sort((a, b) => (b.balance || 0) - (a.balance || 0))
                    .map(student => (
                      <div key={student.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold text-slate-800">{student.name}</p>
                          <p className="text-xs font-bold text-error">{formatCurrency(student.balance || 0)}</p>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">SĐT: {student.phone}</p>
                        <button 
                          onClick={() => {
                            setFinanceTab('tuition');
                          }}
                          className="mt-2 w-full py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/5 transition-all"
                        >
                          Chi tiết & Thu phí
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
          {financeTab === 'tuition' && renderTuitionTab()}
          {financeTab === 'salaries' && renderSalariesTab()}
          {financeTab === 'expenses' && renderExpensesTab()}
        </div>
      </div>
    );
  };

  const renderSchedule = () => {
    const daysOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
    const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    
    // Get start of week for the selected scheduleViewDate (Monday)
    const startOfWeek = scheduleViewDate.startOf('week').add(1, 'day');
    
    // Check if the selected month is locked
    // Rule: Data for month X is locked after the 15th of month X+1
    const isLocked = () => {
      const now = dayjs();
      const selectedMonth = scheduleViewDate.startOf('month');
      const nextMonth15th = selectedMonth.add(1, 'month').date(15).endOf('day');
      return now.isAfter(nextMonth15th);
    };

    const locked = isLocked();

    // Helper to get teacher color
    const getTeacherColor = (teacherId: string) => {
      const colors = ['#4A90E2', '#FF9500', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
      const index = data.teachers.findIndex(t => t.id === teacherId);
      return index !== -1 ? colors[index % colors.length] : '#64748b';
    };

    const timeSlots = [
      { id: 'morning', label: 'Sáng', filter: (hour: number) => hour < 12 },
      { id: 'afternoon', label: 'Chiều', filter: (hour: number) => hour >= 12 && hour < 18 },
      { id: 'evening', label: 'Tối', filter: (hour: number) => hour >= 18 }
    ];

    // Pre-fetch all sessions for the week to avoid recalculating
    const weekSessions = daysOrder.map(dayIndex => {
      const date = startOfWeek.add(dayIndex === 0 ? 6 : dayIndex - 1, 'day');
      const allSessions = getSessionsForDate(date, data.classes, data.lessons);
      // Teacher: only show sessions from my classes
      const filteredSessions = user.role === 'admin' ? allSessions : allSessions.filter(s => s.teacherId === user.teacherId || s.assistantId === user.teacherId);
      return {
        date,
        dateStr: date.format('YYYY-MM-DD'),
        sessions: filteredSessions
      };
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Thời khóa biểu thông minh</h2>
              {locked && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200">
                  <X size={10} /> ĐÃ KHÓA ĐỐI SOÁT
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {locked 
                ? `Dữ liệu tháng ${scheduleViewDate.format('MM/YYYY')} đã được lưu trữ & khóa chỉnh sửa` 
                : `Đang trong chu kỳ đối soát tháng ${scheduleViewDate.format('MM/YYYY')} (Hạn chót: 15/${scheduleViewDate.add(1, 'month').format('MM')})`}
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setScheduleViewDate(prev => prev.subtract(1, 'week'))}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-primary"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex flex-col items-center px-4 min-w-[140px]">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tuần hiện tại</span>
              <span className="text-sm font-bold text-slate-700">{startOfWeek.format('DD/MM')} - {startOfWeek.add(6, 'day').format('DD/MM')}</span>
            </div>

            <button 
              onClick={() => setScheduleViewDate(prev => prev.add(1, 'week'))}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-primary"
            >
              <ChevronRight size={20} />
            </button>
            
            <div className="h-8 w-px bg-slate-100 mx-1" />
            
            <button 
              onClick={() => setScheduleViewDate(dayjs())}
              className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              Hôm nay
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!locked && (
              <button 
                onClick={() => { setEditingClass(null); setIsClassModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-bold text-sm"
              >
                <Plus size={18} />
                Thêm lớp học
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="min-w-[1100px] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-8 border-b border-slate-100">
              <div className="col-span-1 p-4 bg-slate-50/50 border-r border-slate-100 flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Khung giờ</span>
              </div>
              {weekSessions.map(({ date }, idx) => (
                <div key={idx} className={cn(
                  "col-span-1 p-4 text-center border-r border-slate-100 last:border-r-0 flex flex-col items-center justify-center gap-1",
                  date.isSame(dayjs(), 'day') ? "bg-primary/5" : ""
                )}>
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    date.isSame(dayjs(), 'day') ? "text-primary" : "text-slate-500"
                  )}>{dayNames[date.day()]}</span>
                  <span className={cn(
                    "text-lg font-black",
                    date.isSame(dayjs(), 'day') ? "text-primary" : "text-slate-800"
                  )}>{date.format('DD/MM')}</span>
                </div>
              ))}
            </div>

            {/* Time Slots */}
            {timeSlots.map((slot, slotIdx) => (
              <div key={slot.id} className={cn(
                "grid grid-cols-8 border-b border-slate-100 last:border-b-0",
                slotIdx % 2 === 0 ? "bg-white" : "bg-slate-50/20"
              )}>
                {/* Slot Label */}
                <div className="col-span-1 p-6 border-r border-slate-100 flex flex-col items-center justify-center text-center">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center mb-2 shadow-sm",
                    slot.id === 'morning' ? "bg-sky-100 text-sky-600" : 
                    slot.id === 'afternoon' ? "bg-orange-100 text-orange-600" : "bg-indigo-100 text-indigo-600"
                  )}>
                    {slot.id === 'morning' ? <Sun size={20} /> : slot.id === 'afternoon' ? <CloudSun size={20} /> : <Moon size={20} />}
                  </div>
                  <span className="font-black text-slate-700 text-sm">{slot.label}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                    {slot.id === 'morning' ? 'Sáng' : slot.id === 'afternoon' ? 'Chiều' : 'Tối'}
                  </span>
                </div>

                {/* Days for this slot */}
                {weekSessions.map(({ date, dateStr, sessions }, dayIdx) => {
                  const slotSessions = sessions.filter(s => slot.filter(parseInt(s.startTime.split(':')[0])));

                  return (
                    <div key={`${slot.id}-${dayIdx}`} className={cn(
                      "col-span-1 p-3 border-r border-slate-100 last:border-r-0 min-h-[180px] space-y-3",
                      date.isSame(dayjs(), 'day') ? "bg-primary/5" : ""
                    )}>
                      {slotSessions.map((session, sIdx) => {
                        const hour = parseInt(session.startTime.split(':')[0]);
                        const teacher = (data.teachers || []).find(t => t.id === session.teacherId);
                        const teacherColor = getTeacherColor(session.teacherId);
                        
                        let cardStyles = "";
                        let accentColor = session.color;
                        
                        if (session.status === 'cancel') {
                          cardStyles = "bg-slate-100 border-slate-200 text-slate-400 opacity-60 line-through";
                          accentColor = "#94a3b8";
                        } else if (session.status === 'make-up') {
                          cardStyles = "bg-amber-50 border-amber-200 text-amber-900 ring-2 ring-amber-500/20";
                          accentColor = "#f59e0b";
                        } else {
                          // Normal color coding by time
                          if (hour < 12) {
                            cardStyles = "bg-white border-sky-100 text-slate-800 hover:border-sky-300";
                            accentColor = "#0ea5e9";
                          } else if (hour < 18) {
                            cardStyles = "bg-white border-orange-100 text-slate-800 hover:border-orange-300";
                            accentColor = "#f97316";
                          } else {
                            cardStyles = "bg-indigo-900 border-indigo-800 text-indigo-50 hover:bg-indigo-800";
                            accentColor = "#818cf8";
                          }
                        }
                        
                        return (
                          <motion.div 
                            key={`${session.id}-${session.lessonId || sIdx}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => setSelectedClassId(session.id)}
                            className={cn(
                              "group p-3 rounded-2xl shadow-sm border border-l-4 cursor-pointer transition-all relative",
                              cardStyles,
                              locked && "cursor-default"
                            )}
                            style={{ borderLeftColor: accentColor }}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Clock size={10} className="opacity-60" />
                                  <p className="text-[10px] font-black uppercase tracking-tighter">
                                    {session.startTime} - {session.endTime}
                                  </p>
                                </div>
                                <p className="font-black text-xs leading-tight mb-1 line-clamp-2">{session.name}</p>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-white">
                                    {teacher?.avatar ? (
                                      <img src={teacher.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-[8px] font-bold text-slate-400">{(teacher?.name || '?').charAt(0)}</span>
                                    )}
                                  </div>
                                  <p className="text-[9px] font-bold truncate opacity-80">
                                    {teacher?.shortName || teacher?.name || 'Chưa gán'}
                                  </p>
                                </div>
                              </div>
                              
                              {session.status === 'make-up' && (
                                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">BÙ</span>
                              )}
                            </div>
                            
                            {!locked && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -right-2 -top-2 z-10">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const lessonToEdit = data.lessons.find(l => l.id === session.lessonId) || {
                                      id: `lsn_${Date.now()}`,
                                      classId: session.id,
                                      teacherId: session.teacherId,
                                      date: dateStr,
                                      startTime: session.startTime,
                                      endTime: session.endTime,
                                      attendance: session.students.map(sid => ({ studentId: sid, status: 'present' })),
                                      status: session.status,
                                      content: '',
                                      homework: ''
                                    };
                                    setEditingLesson(lessonToEdit as Lesson);
                                    setIsAttendanceModalOpen(true);
                                  }}
                                  className="w-6 h-6 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                                  title="Điểm danh"
                                >
                                  <UserCheck size={12} />
                                </button>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                      {slotSessions.length === 0 && (
                        <div className="h-full flex items-center justify-center opacity-10">
                          <div className="w-full h-px bg-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    if (!data.settings) return null;
    
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Cài đặt hệ thống</h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold">
            <UserIcon size={14} />
            {user?.role === 'admin' ? 'Quyền Quản trị viên' : 'Quyền Giáo viên'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {user?.role === 'admin' && (
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users size={20} className="text-primary" />
                  Quản lý tài khoản giáo viên
                </h3>
                
                <div className="space-y-4">
                  {data.users?.filter(u => u.role === 'teacher').map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{u.username}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">
                            GV: {data.teachers.find(t => t.id === u.teacherId)?.name || 'Chưa gán'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={async () => {
                            const { value: newPassword } = await Swal.fire({
                              title: 'Đặt lại mật khẩu',
                              input: 'password',
                              inputLabel: `Mật khẩu mới cho ${u.username}`,
                              inputPlaceholder: 'Nhập mật khẩu mới',
                              showCancelButton: true,
                              confirmButtonText: 'Cập nhật',
                              cancelButtonText: 'Hủy'
                            });
                            if (newPassword) {
                              try {
                                const newHashedPassword = bcrypt.hashSync(newPassword, 10);
                                const updatedUsers = data.users.map(usr => usr.id === u.id ? { ...usr, password: newHashedPassword, isFirstLogin: true } : usr);
                                const newData = { ...data, users: updatedUsers };
                                setData(newData);
                                await FirebaseDB.saveAllData(newData);
                                Swal.fire('Thành công', 'Mật khẩu đã được đặt lại', 'success');
                              } catch (err) {
                                Swal.fire('Lỗi', 'Lỗi kết nối', 'error');
                              }
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors"
                          title="Đặt lại mật khẩu"
                        >
                          <Lock size={16} />
                        </button>
                        <button 
                          onClick={async () => {
                            const result = await Swal.fire({
                              title: 'Xác nhận xóa?',
                              text: `Tài khoản ${u.username} sẽ bị xóa vĩnh viễn`,
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#ef4444'
                            });
                            if (result.isConfirmed) {
                              try {
                                const updatedUsers = data.users.filter(usr => usr.id !== u.id);
                                const newData = { ...data, users: updatedUsers };
                                setData(newData);
                                await FirebaseDB.saveAllData(newData);
                                Swal.fire('Đã xóa', '', 'success');
                              } catch (err) {
                                Swal.fire('Lỗi', 'Không thể xóa tài khoản', 'error');
                              }
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-error transition-colors"
                          title="Xóa tài khoản"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={async () => {
                      const teachersWithoutAccount = data.teachers.filter(t => 
                        !data.users?.some(u => u.teacherId === t.id)
                      );

                      if (teachersWithoutAccount.length === 0) {
                        Swal.fire('Thông báo', 'Tất cả giáo viên đều đã có tài khoản', 'info');
                        return;
                      }

                      const { value: formValues } = await Swal.fire({
                        title: 'Tạo tài khoản giáo viên',
                        html:
                          '<div class="space-y-4 px-2">' +
                          '<div class="text-left space-y-1"><label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tên đăng nhập</label>' +
                          '<input id="swal-username" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" placeholder="Ví dụ: gv_nguyenvan"></div>' +
                          '<div class="text-left space-y-1"><label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mật khẩu</label>' +
                          '<input id="swal-password" type="password" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" placeholder="Nhập mật khẩu"></div>' +
                          '<div class="text-left space-y-1"><label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chọn giáo viên</label>' +
                          '<select id="swal-teacherId" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm bg-white appearance-none">' +
                          teachersWithoutAccount.map(t => `<option value="${t.id}">${t.name}</option>`).join('') +
                          '</select></div>' +
                          '</div>',
                        customClass: {
                          popup: 'rounded-3xl p-6',
                          confirmButton: 'px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-primary/30 transition-all w-full mt-4',
                          title: 'text-xl font-bold text-slate-800'
                        },
                        buttonsStyling: false,
                        focusConfirm: false,
                        preConfirm: () => {
                          const username = (document.getElementById('swal-username') as HTMLInputElement).value.trim();
                          const password = (document.getElementById('swal-password') as HTMLInputElement).value;
                          const teacherId = (document.getElementById('swal-teacherId') as HTMLSelectElement).value;
                          
                          if (!username || !password || !teacherId) {
                            Swal.showValidationMessage('Vui lòng nhập đầy đủ thông tin');
                            return false;
                          }
                          
                          return {
                            username,
                            password,
                            teacherId,
                            role: 'teacher' as const
                          }
                        }
                      });

                      if (formValues) {
                        try {
                          const usernameExists = data.users?.some(u => u.username === formValues.username);
                          if (usernameExists) {
                            Swal.fire('Lỗi', 'Tên đăng nhập đã tồn tại', 'error');
                            return;
                          }

                          const newUser: User = {
                            id: 'usr_' + Date.now().toString(),
                            username: formValues.username,
                            password: bcrypt.hashSync(formValues.password, 10),
                            role: formValues.role,
                            teacherId: formValues.teacherId,
                            isFirstLogin: true
                          };
                          
                          const newData = { ...data, users: [...(data.users || []), newUser] };
                          setData(newData);
                          await FirebaseDB.saveAllData(newData);
                          Swal.fire('Thành công', 'Đã tạo tài khoản giáo viên', 'success');
                        } catch (err) {
                          console.error(err);
                          Swal.fire('Lỗi', 'Không thể tạo tài khoản', 'error');
                        }
                      }
                    }}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2 font-bold text-sm"
                  >
                    <Plus size={18} />
                    Thêm tài khoản mới
                  </button>
                </div>
              </div>
            )}

            <div className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Lock size={20} className="text-primary" />
                Bảo mật tài khoản
              </h3>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700">Đổi mật khẩu</p>
                  <p className="text-xs text-slate-500">Thay đổi mật khẩu đăng nhập của bạn</p>
                </div>
                <button 
                  onClick={handleChangePassword}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Thay đổi
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-bold">Thông tin trung tâm</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tên trung tâm</label>
                  <input 
                    type="text" 
                    value={data.settings.centerName}
                    disabled={user?.role !== 'admin'}
                    onChange={(e) => updateData(prev => ({ ...prev, settings: { ...prev.settings, centerName: e.target.value } }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiền tệ</label>
                  <select 
                    value={data.settings.currency}
                    disabled={user?.role !== 'admin'}
                    onChange={(e) => updateData(prev => ({ ...prev, settings: { ...prev.settings, currency: e.target.value } }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            </div>

            {user?.role === 'admin' && (
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <BrainCircuit size={20} className="text-primary" />
                  Cấu hình AI
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gemini API Key</label>
                    <div className="relative">
                      <input 
                        type={showApiKey ? "text" : "password"}
                        value={data.settings.geminiApiKey || ''}
                        onChange={(e) => updateData(prev => ({ ...prev, settings: { ...prev.settings, geminiApiKey: e.target.value } }))}
                        className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        placeholder="Nhập API Key..."
                      />
                      <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isAuthReady || (user && !isDataLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">{!isAuthReady ? 'Đang tải hệ thống...' : 'Đang đồng bộ dữ liệu...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="w-20 h-20 gradient-bg rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-primary/30 mx-auto mb-6">
              <GraduationCap size={48} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Anh Ngữ Ms. Thương</h1>
            <p className="text-slate-400">Hệ thống quản lý trung tâm giáo dục</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <LogIn size={24} className="text-primary" />
              Đăng nhập hệ thống
            </h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tên đăng nhập</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    name="username"
                    type="text" 
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Nhập tên đăng nhập"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    name="password"
                    type="password" 
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Nhập mật khẩu"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 mt-4"
              >
                Đăng nhập
                <ChevronRight size={20} />
              </button>
            </form>
          </div>
          
          <p className="text-center text-slate-500 text-sm mt-8">
            Quên mật khẩu? Vui lòng liên hệ Admin để được cấp lại.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 transition-transform duration-300 transform flex flex-col h-full",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <GraduationCap size={24} />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Anh Ngữ Ms. Thương</h1>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">AI Powered</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Tổng quan" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setViewingClassId(null); }} />
            {user.role === 'admin' && (
              <SidebarItem icon={Users} label="Học viên" active={activeTab === 'students'} onClick={() => { setActiveTab('students'); setViewingClassId(null); }} />
            )}
            <SidebarItem 
              icon={GraduationCap} 
              label={user.role === 'admin' ? "Giáo viên" : "Hồ sơ cá nhân"} 
              active={activeTab === 'teachers'} 
              onClick={() => { setActiveTab('teachers'); setViewingClassId(null); }} 
            />
            <SidebarItem icon={BookOpen} label="Lớp học" active={activeTab === 'classes'} onClick={() => { setActiveTab('classes'); setViewingClassId(null); }} />
            <SidebarItem icon={Calendar} label="Lịch học" active={activeTab === 'schedule'} onClick={() => { setActiveTab('schedule'); setViewingClassId(null); }} />
            {user.role === 'admin' && (
              <SidebarItem icon={Wallet} label="Tài chính" active={activeTab === 'finance'} onClick={() => { setActiveTab('finance'); setViewingClassId(null); }} />
            )}
            <SidebarItem icon={Library} label="Học liệu" active={activeTab === 'resources'} onClick={() => { setActiveTab('resources'); setViewingClassId(null); }} />
            {user.role === 'admin' && (
              <SidebarItem icon={Settings} label="Cài đặt" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setViewingClassId(null); }} />
            )}
          </nav>
        </div>

        <div className="p-6 border-t border-slate-50 bg-white">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-3 text-error hover:bg-error/5 rounded-xl transition-all font-bold text-xs"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        isSidebarOpen ? "lg:ml-64" : "ml-0"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <h2 className="font-bold text-slate-800 hidden md:block">
              {activeTab === 'dashboard' && "Bảng điều khiển tổng quan"}
              {activeTab === 'students' && "Quản lý học viên"}
              {activeTab === 'teachers' && (user.role === 'admin' ? "Quản lý giáo viên" : "Thông tin cá nhân")}
              {activeTab === 'classes' && "Quản lý lớp học"}
              {activeTab === 'schedule' && "Lịch học & Giảng dạy"}
              {activeTab === 'finance' && "Quản lý tài chính"}
              {activeTab === 'settings' && "Cài đặt hệ thống"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Tìm kiếm nhanh..." 
                className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none w-64"
              />
            </div>
            
            <button 
              onClick={() => setIsApiKeyModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <Key size={14} />
              <span className="text-xs font-bold whitespace-nowrap">Lấy API key để sử dụng app</span>
            </button>

            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-none">{user.username}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase">{user.role}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'students' && renderStudents()}
              {activeTab === 'teachers' && renderTeachers()}
              {activeTab === 'classes' && renderClasses()}
              {activeTab === 'schedule' && renderSchedule()}
              {activeTab === 'finance' && renderFinance()}
              {activeTab === 'settings' && renderSettings()}
              {['resources'].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Plus size={40} className="opacity-20" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-600">Tính năng đang phát triển</h3>
                  <p className="text-sm">Vui lòng quay lại sau hoặc liên hệ hỗ trợ.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {!isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(true)}
        />
      )}

      {/* Class Detail Modal */}
      <ClassDetailModal 
        isOpen={!!selectedClassId}
        onClose={() => setSelectedClassId(null)}
        classData={data.classes.find(c => c.id === selectedClassId) || null}
        teacher={data.teachers.find(t => t.id === data.classes.find(c => c.id === selectedClassId)?.teacherId)}
        lessons={data.lessons}
      />

      <ClassModal 
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        classData={editingClass}
        teachers={data.teachers}
        students={data.students}
        onSave={handleSaveClass}
      />

      <AttendanceModal 
        isOpen={isAttendanceModalOpen}
        onClose={() => { setIsAttendanceModalOpen(false); setEditingLesson(null); }}
        classData={data.classes.find(c => c.id === viewingClassId) || null}
        students={data.students.filter(s => data.classes.find(c => c.id === viewingClassId)?.students.includes(s.id))}
        teachers={data.teachers}
        onSave={handleSaveLesson}
        lesson={editingLesson}
      />

      <StudentModal 
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        student={editingStudent}
        onSave={handleSaveStudent}
        geminiApiKey={data.settings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY}
      />

      <TeacherModal 
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        teacher={editingTeacher}
        onSave={handleSaveTeacher}
      />

      <ApiKeySettingsModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      {/* Hidden Tuition Notification Template for Export */}
      <div className="fixed -left-[9999px] top-0">
        {data.students.map(student => {
          const bill = (data.monthlyBills || []).find(b => b.studentId === student.id && b.month === dayjs(scheduleViewDate).format('YYYY-MM'));
          if (!bill) return null;
          const activeClasses = data.classes.filter(c => student.classes.includes(c.id) && c.status === 'active');
          return (
            <div key={student.id} id={`tuition-notification-${student.id}`} className="w-[600px] bg-white p-12 border-8 border-primary/10">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-primary uppercase tracking-tighter mb-2">{data.settings.centerName}</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Thông báo học phí</p>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-between border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Học viên</p>
                    <p className="text-xl font-bold text-slate-800">{student.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tháng báo phí</p>
                    <p className="text-xl font-bold text-slate-800">{bill.month}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase">Chi tiết học tập trong tháng</p>
                  <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng số buổi học trong tháng</p>
                      <p className="text-lg font-bold text-slate-800">{bill.totalSessions}</p>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Số buổi nghỉ</p>
                      <p className="text-lg font-bold text-error">{bill.absentSessions}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Số buổi bù</p>
                      <p className="text-lg font-bold text-success">{bill.makeupSessions}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase">Chi tiết các lớp</p>
                  {activeClasses.map(c => {
                    const discount = c.studentDiscounts?.[student.id];
                    let fee = c.tuitionFee || 0;
                    if (discount) {
                      if (discount.type === 'percent') fee = fee * (1 - discount.value / 100);
                      else fee = Math.max(0, fee - discount.value);
                    }
                    return (
                      <div key={c.id} className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm font-medium text-slate-700">{c.name}</span>
                        <span className="text-sm font-bold text-slate-800">{formatCurrency(fee)}</span>
                      </div>
                    );
                  })}
                </div>

                {bill.deductions > 0 && (
                  <div className="flex justify-between items-center py-2 text-error">
                    <span className="text-sm font-medium italic">Khấu trừ (vắng/nghỉ tháng trước)</span>
                    <span className="text-sm font-bold">-{formatCurrency(bill.deductions)}</span>
                  </div>
                )}

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">Tổng học phí cần đóng:</span>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(bill.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">Số tiền đã nộp:</span>
                    <span className="text-sm font-bold text-success">{formatCurrency(bill.amountPaid)}</span>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-xl flex justify-between items-center mt-2">
                    <span className="text-lg font-bold text-slate-700">Số tiền còn thiếu</span>
                    <span className="text-2xl font-black text-primary">{formatCurrency(Math.max(0, bill.totalAmount - bill.amountPaid))}</span>
                  </div>
                </div>

                <div className="pt-8 text-center space-y-2">
                  <p className="text-xs text-slate-500 italic">Vui lòng hoàn tất học phí trước ngày 05 hàng tháng.</p>
                  <p className="text-xs text-slate-500 font-bold">Trân trọng cảm ơn quý phụ huynh!</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden Salary Notification Template for Export */}
      <div className="fixed -left-[9999px] top-0">
        {data.teachers.map(teacher => {
          let totalHours = 0;
          let teachingDays = new Set();
          const daysInMonth = scheduleViewDate.daysInMonth();
          const selectedMonth = scheduleViewDate.startOf('month');
          
          for (let i = 1; i <= daysInMonth; i++) {
            const date = selectedMonth.date(i);
            const sessions = getSessionsForDate(date, data.classes, data.lessons);
            sessions.forEach(session => {
              if (session.status !== 'cancel' && (session.teacherId === teacher.id || session.assistantId === teacher.id)) {
                const start = dayjs(`2000-01-01 ${session.startTime}`);
                const end = dayjs(`2000-01-01 ${session.endTime}`);
                totalHours += end.diff(start, 'hour', true);
                teachingDays.add(date.format('YYYY-MM-DD'));
              }
            });
          }

          const mKey = scheduleViewDate.format('YYYY-MM');
          const adj = teacher.salaryAdjustments?.[mKey] || { allowance: 0, penalty: 0, notes: '' };
          const basePay = totalHours * (teacher.hourlyRate || 0);
          const totalPay = basePay + adj.allowance - adj.penalty;

          return (
            <div key={teacher.id} id={`salary-notification-${teacher.id}`} className="w-[600px] bg-white p-12 border-8 border-secondary/10">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-secondary uppercase tracking-tighter mb-2">{data.settings.centerName}</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Phiếu lương giáo viên</p>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-between border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Giáo viên</p>
                    <p className="text-xl font-bold text-slate-800">{teacher.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tháng lương</p>
                    <p className="text-xl font-bold text-slate-800">{scheduleViewDate.format('YYYY-MM')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng giờ dạy</p>
                    <p className="text-lg font-bold text-slate-800">{totalHours.toFixed(1)} giờ</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Số ngày dạy</p>
                    <p className="text-lg font-bold text-slate-800">{teachingDays.size} ngày</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-sm font-medium text-slate-700">Lương theo giờ ({formatCurrency(teacher.hourlyRate || 0)}/h)</span>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(basePay)}</span>
                  </div>
                  
                  {adj.allowance > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-50 text-success">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Phụ cấp</span>
                        {adj.notes?.split('|')[0] && <span className="text-[10px] italic">({adj.notes.split('|')[0]})</span>}
                      </div>
                      <span className="text-sm font-bold">+{formatCurrency(adj.allowance)}</span>
                    </div>
                  )}

                  {adj.penalty > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-50 text-error">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Phạt</span>
                        {adj.notes?.split('|')[1] && <span className="text-[10px] italic">({adj.notes.split('|')[1]})</span>}
                      </div>
                      <span className="text-sm font-bold">-{formatCurrency(adj.penalty)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-secondary/5 p-6 rounded-2xl flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-700">Tổng lương thực nhận</span>
                  <span className="text-2xl font-black text-secondary">{formatCurrency(totalPay)}</span>
                </div>

                <div className="pt-8 text-center">
                  <p className="text-xs text-slate-500 font-bold italic">Mọi thắc mắc vui lòng liên hệ bộ phận kế toán.</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
