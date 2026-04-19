export type UserRole = "student" | "teacher";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  profileImageUrl: string | null;
  notifications: boolean;
};

export type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  darkMode: boolean;
  toggleTheme: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ) => Promise<void>;
  getMyProfile: () => Promise<AuthUser | null>;
  updateAccount: (input: {
    name: string;
    email: string;
    notifications: boolean;
    profileImageUrl: string | null;
  }) => Promise<AuthUser>;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
};
