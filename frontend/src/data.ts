// User Data
export const MOCK_TEACHER = {
  id: "t1",
  name: "Prof. Cruz",
  email: "teacher@truesight.edu",
  notificationsEnabled: true,
};

export const MOCK_STUDENT = {
  id: "st1",
  name: "Maria Santos",
  email: "student@truesight.edu",
  notificationsEnabled: true,
};

// Student Enrolled in Classes
export interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
  submissionsCount: number;
}

export const MOCK_ENROLLED_STUDENTS: Record<string, EnrolledStudent[]> = {
  "c1": [
    { id: "st1", name: "Maria Santos", email: "maria@email.com", enrolledAt: "2026-01-15", submissionsCount: 3 },
    { id: "st2", name: "Juan Dela Cruz", email: "juan@email.com", enrolledAt: "2026-01-16", submissionsCount: 2 },
    { id: "st3", name: "Alex Rivera", email: "alex@email.com", enrolledAt: "2026-01-17", submissionsCount: 4 },
    { id: "st4", name: "Sofia Chen", email: "sofia@email.com", enrolledAt: "2026-01-18", submissionsCount: 3 },
    { id: "st5", name: "Miguel Reyes", email: "miguel@email.com", enrolledAt: "2026-01-19", submissionsCount: 3 },
  ],
  "c2": [
    { id: "st6", name: "Elena Torres", email: "elena@email.com", enrolledAt: "2026-02-01", submissionsCount: 1 },
    { id: "st7", name: "Carlos Lopez", email: "carlos@email.com", enrolledAt: "2026-02-02", submissionsCount: 2 },
    { id: "st8", name: "Ana Garcia", email: "ana@email.com", enrolledAt: "2026-02-03", submissionsCount: 1 },
  ],
};

// Classes
export const MOCK_CLASSES = [
  {
    id: "c1",
    name: "IT 301 – Artificial Intelligence",
    code: "AI3-01H",
    description: "Introduction to Artificial Intelligence concepts and applications",
    students: 35,
    assignments: 4,
    instructor: "Prof. Cruz",
    instructorId: "t1",
    createdAt: "2026-01-10",
  },
  {
    id: "c2",
    name: "CS 202 – Data Structures",
    code: "CS2-02X",
    description: "Advanced data structures and algorithms",
    students: 28,
    assignments: 2,
    instructor: "Prof. Cruz",
    instructorId: "t1",
    createdAt: "2026-01-12",
  },
];

// Activities/Assignments
export interface Activity {
  id: string;
  classId: string;
  title: string;
  description: string;
  type: 'text' | 'document';
  dueDate: string;
  dueTime: string;
  submissionsCount: number;
  totalStudents: number;
  status: 'active' | 'closed';
  createdAt: string;
  maxFileSize?: number; // MB for document type
  allowedFormats?: string[]; // for document type
}

export const MOCK_ASSIGNMENTS: Activity[] = [
  {
    id: "a1",
    classId: "c1",
    title: "Essay Assessment: History of AI",
    description: "Write a comprehensive essay about the evolution of artificial intelligence from its inception to modern applications.",
    type: "text",
    dueDate: "2026-04-20",
    dueTime: "23:59",
    submissionsCount: 28,
    totalStudents: 35,
    status: "active",
    createdAt: "2026-04-01",
  },
  {
    id: "a2",
    classId: "c1",
    title: "Midterm Project: Neural Networks",
    description: "Submit your research paper on neural network architectures and their applications.",
    type: "document",
    dueDate: "2026-04-25",
    dueTime: "23:59",
    submissionsCount: 0,
    totalStudents: 35,
    status: "active",
    createdAt: "2026-04-05",
    maxFileSize: 10,
    allowedFormats: ['.pdf', '.docx', '.doc'],
  },
  {
    id: "a3",
    classId: "c2",
    title: "Algorithm Analysis Report",
    description: "Analyze the time complexity of sorting algorithms and submit your findings.",
    type: "text",
    dueDate: "2026-04-18",
    dueTime: "23:59",
    submissionsCount: 15,
    totalStudents: 28,
    status: "active",
    createdAt: "2026-03-28",
  },
];

// Notifications
export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'deadline' | 'new_activity' | 'graded';
  link?: string;
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    title: "New Activity Posted",
    message: "Prof. Cruz posted 'Midterm Project: Neural Networks' in IT 301",
    date: "2 hours ago",
    read: false,
    type: "new_activity",
    link: "/student/class/c1",
  },
  {
    id: "n2",
    title: "Deadline Approaching",
    message: "Essay Assessment: History of AI is due in 7 days",
    date: "5 hours ago",
    read: false,
    type: "deadline",
    link: "/student/assignment/a1",
  },
  {
    id: "n3",
    title: "Welcome to TrueSight",
    message: "You can now join classes and submit your assignments.",
    date: "1 day ago",
    read: true,
    type: "info",
  },
];

// Submissions
export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  type: 'text' | 'document';
  content?: string; // for text submissions
  fileName?: string; // for document submissions
  fileUrl?: string; // for document submissions
  submittedAt: string;
  status: 'pending' | 'analyzed';
  aiProbability: number | null;
  isAIGenerated?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  indicators: string[];
}

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: "s1",
    assignmentId: "a1",
    studentId: "st2",
    studentName: "Juan Dela Cruz",
    type: "text",
    content: "Artificial Intelligence has evolved significantly over the past decades...",
    submittedAt: "2026-04-13 10:20",
    status: "pending",
    aiProbability: null,
    indicators: [],
  },
  {
    id: "s2",
    assignmentId: "a1",
    studentId: "st1",
    studentName: "Maria Santos",
    type: "text",
    content: "The history of AI begins in the 1950s when computer scientists started exploring machine learning...",
    submittedAt: "2026-04-13 11:15",
    status: "analyzed",
    aiProbability: 82,
    isAIGenerated: true,
    confidence: "high",
    indicators: [
      "Uniform sentence patterns",
      "Low perplexity score",
      "Repetitive phrasing",
      "High AI generation probability"
    ],
  },
  {
    id: "s3",
    assignmentId: "a1",
    studentId: "st3",
    studentName: "Alex Rivera",
    type: "text",
    content: "My understanding of AI's history comes from personal research and class materials...",
    submittedAt: "2026-04-13 09:05",
    status: "analyzed",
    aiProbability: 15,
    isAIGenerated: false,
    confidence: "high",
    indicators: [],
  },
  {
    id: "s4",
    assignmentId: "a3",
    studentId: "st6",
    studentName: "Elena Torres",
    type: "text",
    content: "Sorting algorithms vary in complexity. Bubble sort has O(n²) time complexity...",
    submittedAt: "2026-04-12 14:30",
    status: "pending",
    aiProbability: null,
    indicators: [],
  },
];
