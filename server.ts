import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "edumanager-secret-key-123";
const DB_FILE = path.join(__dirname, "db.json");

// Initial data if db.json doesn't exist
const INITIAL_DB = {
  students: [
    {
      id: 'std_001',
      name: 'Nguyễn Văn A',
      email: 'vana@example.com',
      phone: '0901234567',
      dob: '2010-05-15',
      parentName: 'Nguyễn Văn C',
      parentPhone: '0901112223',
      goal: 'IELTS 6.5',
      classes: ['cls_001'],
      status: 'active',
      joinedDate: '2023-09-01',
      totalPaid: 5000000,
      balance: 0,
    }
  ],
  teachers: [
    {
      id: 'tch_001',
      name: 'Mr. Smith',
      shortName: 'Mr. Smith',
      email: 'smith@example.com',
      phone: '0987654321',
      specialization: 'IELTS Expert',
      baseSalary: 10000000,
      hourlyRate: 500000,
      kpi: 95,
      status: 'active',
      type: 'full-time',
      color: '#4A90E2',
      avatar: 'https://i.pravatar.cc/150?u=tch_001',
      startDate: '2023-01-01',
    }
  ],
  classes: [
    {
      id: 'cls_001',
      name: 'IELTS Foundation',
      teacherId: 'tch_001',
      schedule: [
        { day: 1, startTime: '18:00', endTime: '20:00', teacherId: 'tch_001' },
        { day: 3, startTime: '18:00', endTime: '20:00', teacherId: 'tch_001' },
      ],
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      tuitionFee: 4500000,
      color: '#4A90E2',
      students: ['std_001'],
      status: 'active',
      type: 'IELTS',
      room: 'Phòng 101',
    }
  ],
  lessons: [],
  transactions: [],
  monthlyBills: [],
  users: [
    {
      id: "admin_001",
      username: "admin",
      password: bcrypt.hashSync("admin123", 10),
      role: "admin"
    },
    {
      id: "user_tch_001",
      username: "smith",
      password: bcrypt.hashSync("teacher123", 10),
      role: "teacher",
      teacherId: "tch_001",
      isFirstLogin: true
    }
  ],
  settings: {
    currency: "VND",
    theme: "light",
    centerName: "Anh Ngữ Ms. Thương",
    aiModel: "gemini-3-flash-preview"
  }
};

function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2));
    return INITIAL_DB;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveData(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    next();
  };

  // API Routes
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const data = loadData();
    const user = data.users.find((u: any) => u.username === username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, teacherId: user.teacherId },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, { 
      httpOnly: true, 
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });
    res.json({ user: { id: user.id, username: user.username, role: user.role, teacherId: user.teacherId, isFirstLogin: user.isFirstLogin } });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token", { path: '/' });
    res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.json({ user: decoded });
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  });

  app.post("/api/auth/change-password", authenticate, (req: any, res) => {
    const { newPassword } = req.body;
    const data = loadData();
    const userIndex = data.users.findIndex((u: any) => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ message: "User not found" });

    data.users[userIndex].password = bcrypt.hashSync(newPassword, 10);
    data.users[userIndex].isFirstLogin = false;
    saveData(data);
    res.json({ message: "Password changed successfully" });
  });

  // Data Routes
  app.get("/api/data", authenticate, (req: any, res) => {
    const data = loadData();
    if (req.user.role === "admin") {
      res.json(data);
    } else {
      // Teacher filtering
      const teacherId = req.user.teacherId;
      const teacherClasses = data.classes.filter((c: any) => 
        c.teacherId === teacherId || 
        (c.schedule || []).some((s: any) => s.teacherId === teacherId || s.assistantId === teacherId)
      );
      const teacherClassIds = teacherClasses.map((c: any) => c.id);
      const teacherStudentIds = new Set(teacherClasses.flatMap((c: any) => c.students || []));

      const filteredData = {
        ...data,
        classes: teacherClasses,
        lessons: data.lessons.filter((l: any) => l.teacherId === teacherId || l.assistantId === teacherId || teacherClassIds.includes(l.classId)),
        teachers: data.teachers.filter((t: any) => t.id === teacherId),
        transactions: [],
        monthlyBills: [],
        students: data.students
          .filter((s: any) => teacherStudentIds.has(s.id))
          .map((s: any) => ({ ...s, balance: 0, totalPaid: 0 })) // Hide financial info
      };
      res.json(filteredData);
    }
  });

  app.post("/api/data", authenticate, (req: any, res) => {
    // Only admin can save full data, or we implement granular updates
    // For now, let's allow saving if it's a valid update
    const data = loadData();
    const updates = req.body;

    if (req.user.role === "admin") {
      const newData = { ...data, ...updates };
      saveData(newData);
      res.json({ message: "Data saved" });
    } else {
      // Teachers can only update lessons and attendance
      if (updates.lessons) {
        // Validate that they only update their own lessons
        const teacherId = req.user.teacherId;
        const updatedLessons = updates.lessons;
        // Merge lessons
        const mergedLessons = [...data.lessons];
        updatedLessons.forEach((ul: any) => {
          const idx = mergedLessons.findIndex(l => l.id === ul.id);
          if (idx !== -1) {
            // Check permission
            if (mergedLessons[idx].teacherId === teacherId || mergedLessons[idx].assistantId === teacherId) {
              mergedLessons[idx] = ul;
            }
          } else {
            // New lesson
            if (ul.teacherId === teacherId || ul.assistantId === teacherId) {
              mergedLessons.push(ul);
            }
          }
        });
        data.lessons = mergedLessons;
        saveData(data);
        res.json({ message: "Lessons updated" });
      } else {
        res.status(403).json({ message: "Forbidden" });
      }
    }
  });

  // Admin specific: User management
  app.post("/api/admin/users", authenticate, isAdmin, (req, res) => {
    const { username, password, role, teacherId } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const data = loadData();
    if (data.users.find((u: any) => u.username === username)) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
    }

    if (role === 'teacher' && !teacherId) {
      return res.status(400).json({ message: "Vui lòng chọn giáo viên" });
    }

    if (role === 'teacher' && data.users.find((u: any) => u.teacherId === teacherId)) {
      return res.status(400).json({ message: "Giáo viên này đã có tài khoản" });
    }

    const newUser = {
      id: `user_${Date.now()}`,
      username,
      password: bcrypt.hashSync(password, 10),
      role,
      teacherId,
      isFirstLogin: true
    };
    data.users.push(newUser);
    saveData(data);
    res.json(newUser);
  });

  app.delete("/api/admin/users/:id", authenticate, isAdmin, (req, res) => {
    const data = loadData();
    data.users = data.users.filter((u: any) => u.id !== req.params.id);
    saveData(data);
    res.json({ message: "User deleted" });
  });

  app.post("/api/admin/users/:id/reset-password", authenticate, isAdmin, (req, res) => {
    const { newPassword } = req.body;
    const data = loadData();
    const userIndex = data.users.findIndex((u: any) => u.id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: "User not found" });
    }
    data.users[userIndex].password = bcrypt.hashSync(newPassword, 10);
    data.users[userIndex].isFirstLogin = true; // Force change on next login
    saveData(data);
    res.json({ message: "Password reset successfully" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
