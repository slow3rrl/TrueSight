import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  role: Role;
  photoUrl: string;
  theme: 'light' | 'dark';
  notifications: boolean;
}

export interface ClassItem {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  description: string;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  submissionType: 'text' | 'document';
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string; // Will hold text or filename
  submittedAt: string;
  aiScore: number | null;
  analyzed: boolean;
  studentName?: string;
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  classes: ClassItem[];
  setClasses: React.Dispatch<React.SetStateAction<ClassItem[]>>;
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  submissions: Submission[];
  setSubmissions: React.Dispatch<React.SetStateAction<Submission[]>>;
  
  createClass: (name: string, description: string) => void;
  joinClass: (code: string) => void;
  createAssignment: (classId: string, title: string, description: string, dueDate: string, submissionType: 'text' | 'document') => void;
  submitAssignment: (assignmentId: string, content: string) => void;
  analyzeAllSubmissions: (assignmentId: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
}

const mockUser: User = {
  id: 'u1',
  name: 'Alex Johnson',
  role: 'teacher',
  photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150',
  theme: 'light',
  notifications: true,
};

const mockClasses: ClassItem[] = [
  { id: 'c1', name: 'Advanced Computer Science', code: 'CS401X', teacherId: 'u1', description: 'Ethics and AI in modern computing.' },
  { id: 'c2', name: 'World History 101', code: 'WH101A', teacherId: 'u2', description: 'Ancient civilizations to the Renaissance.' },
];

const mockAssignments: Assignment[] = [
  { id: 'a1', classId: 'c1', title: 'Essay on AI Ethics', description: 'Write a 1000-word essay on the implications of AGI.', dueDate: '2026-04-20T23:59:00Z', submissionType: 'text' },
  { id: 'a2', classId: 'c1', title: 'Code Review Reflection', description: 'Reflect on the recent code review exercise.', dueDate: '2026-04-25T23:59:00Z', submissionType: 'document' },
];

const mockSubmissions: Submission[] = [
  { id: 's1', assignmentId: 'a1', studentId: 'u3', studentName: 'Jordan Smith', content: 'Artificial General Intelligence poses a significant risk...', submittedAt: '2026-04-15T10:00:00Z', aiScore: null, analyzed: false },
  { id: 's2', assignmentId: 'a1', studentId: 'u4', studentName: 'Taylor Doe', content: 'In conclusion, the ethical frameworks must be established before...', submittedAt: '2026-04-16T14:30:00Z', aiScore: null, analyzed: false },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(mockUser);
  const [classes, setClasses] = useState<ClassItem[]>(mockClasses);
  const [assignments, setAssignments] = useState<Assignment[]>(mockAssignments);
  const [submissions, setSubmissions] = useState<Submission[]>(mockSubmissions);

  // Sync theme with document root
  useEffect(() => {
    if (currentUser.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentUser.theme]);

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const createClass = (name: string, description: string) => {
    const newClass: ClassItem = {
      id: `c${Date.now()}`,
      name,
      description,
      code: generateCode(),
      teacherId: currentUser.id,
    };
    setClasses([...classes, newClass]);
  };

  const joinClass = (code: string) => {
    const cls = classes.find(c => c.code === code);
    if (!cls) {
      alert('Class not found!');
      return;
    }
    alert(`Successfully joined ${cls.name}`);
  };

  const createAssignment = (classId: string, title: string, description: string, dueDate: string, submissionType: 'text' | 'document') => {
    const newAssignment: Assignment = {
      id: `a${Date.now()}`,
      classId,
      title,
      description,
      dueDate,
      submissionType,
    };
    setAssignments([...assignments, newAssignment]);
  };

  const submitAssignment = (assignmentId: string, content: string) => {
    const newSub: Submission = {
      id: `s${Date.now()}`,
      assignmentId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      content,
      submittedAt: new Date().toISOString(),
      aiScore: null,
      analyzed: false,
    };
    setSubmissions([...submissions, newSub]);
  };

  const analyzeAllSubmissions = async (assignmentId: string) => {
    // Simulate GPTZero API call delay
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setSubmissions(prev => prev.map(sub => {
          if (sub.assignmentId === assignmentId && !sub.analyzed) {
            // Random mock AI percentage (0-100)
            const score = Math.floor(Math.random() * 100);
            return { ...sub, aiScore: score, analyzed: true };
          }
          return sub;
        }));
        resolve();
      }, 2000);
    });
  };

  const updateProfile = (updates: Partial<User>) => {
    setCurrentUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      classes, setClasses,
      assignments, setAssignments,
      submissions, setSubmissions,
      createClass, joinClass, createAssignment, submitAssignment, analyzeAllSubmissions, updateProfile
    }}>
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within an AppProvider");
  return context;
};
