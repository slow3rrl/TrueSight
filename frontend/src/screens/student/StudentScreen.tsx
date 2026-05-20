import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { motion } from "framer-motion";
import { BookOpen, Home, Menu, Plus, Settings, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { GlobalThemeToggle } from "../../components/theme/GlobalThemeToggle";
import { ActivityNotificationsPopover } from "../../components/ActivityNotificationsPopover";
import { useAuth } from "../../context/useAuth";
import {
  getHasSeenWelcome,
  getWelcomeGreeting,
  markWelcomeSeen,
} from "../../utils/welcome";
import {
  fetchClassActivities,
  fetchEnrolledClasses,
  fetchUserNotifications,
  joinClassByCode,
  type ActivityNotification,
  type ClassActivity,
  type EnrolledClass,
} from "./services/studentClassroomService";
import {
  StudentSidebar,
  type StudentSection,
} from "./components/StudentSidebar";
import { StudentEnrolledSection } from "./components/StudentEnrolledSection";
import { StudentSettingsPanel } from "./components/StudentSettingsPanel";

const SIDEBAR_ITEMS = [
  { key: "home", label: "Home", icon: Home },
  { key: "enrolled", label: "Enrolled", icon: BookOpen },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

export default function StudentScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const joinInputRef = useRef<HTMLInputElement | null>(null);
  const welcomeSeenRef = useRef<Record<number, boolean>>({});

  const [activeSection, setActiveSection] = useState<StudentSection>("home");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const [activities, setActivities] = useState<ClassActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const selectedClass = useMemo(
    () => enrolledClasses.find((item) => item.id === selectedClassId) ?? null,
    [enrolledClasses, selectedClassId],
  );

  const upcomingActivities = useMemo(() => {
    return [...activities]
      .sort(
        (left, right) =>
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
      )
      .slice(0, 4);
  }, [activities]);

  const studentName = user?.name || "Student";
  const hasSeenWelcome = user
    ? (welcomeSeenRef.current[user.id] ??= getHasSeenWelcome(user.id))
    : true;
  const welcomeGreeting = getWelcomeGreeting(user?.created_at, hasSeenWelcome);

  const loadEnrolledClasses = async () => {
    setIsLoadingClasses(true);

    try {
      const loaded = await fetchEnrolledClasses();
      setEnrolledClasses(loaded);

      if (loaded.length > 0) {
        setSelectedClassId((current) => current ?? loaded[0].id);
      } else {
        setSelectedClassId(null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load enrolled classes.";
      toast.error(message);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const loadClassActivities = async (classId: string) => {
    setIsLoadingActivities(true);

    try {
      const loaded = await fetchClassActivities(classId);
      setActivities(loaded);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load class activities.";
      toast.error(message);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const loadNotifications = async () => {
    setIsLoadingNotifications(true);

    try {
      const payload = await fetchUserNotifications();
      setNotifications(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load notifications.";
      toast.error(message);
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadEnrolledClasses(), loadNotifications()]);
  }, []);

  useEffect(() => {
    if (user?.id) {
      const timer = window.setTimeout(() => markWelcomeSeen(user.id), 2000);
      return () => window.clearTimeout(timer);
    }
  }, [user?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setActivities([]);
      return;
    }

    void loadClassActivities(selectedClassId);
  }, [selectedClassId]);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeSection, selectedClassId]);

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a class code.");
      return;
    }

    setIsJoining(true);

    try {
      const joined = await joinClassByCode(joinCode.trim());
      toast.success(`Joined ${joined.name}`);
      setJoinCode("");
      await Promise.all([loadEnrolledClasses(), loadNotifications()]);
      setSelectedClassId(joined.id);
      setActiveSection("enrolled");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to join class.";
      toast.error(message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore logout transport errors and keep user flow consistent.
    }

    window.location.href = "/auth/login_screen";
  };

  const renderHome = () => (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="theme-surface rounded-3xl border border-dashed theme-border px-6 py-7 sm:px-8"
      >
        <h1 className="theme-title text-3xl font-extrabold sm:text-4xl">TrueSight</h1>
        <p className="mt-4 max-w-3xl text-base theme-muted sm:text-lg">
          An AI-powered tool desgined for academic integrity in Buenavista Community College. Join your classes, view activities, and submit your work with confidence.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setActiveSection("enrolled")}>
            <BookOpen className="mr-2 h-4 w-4" />
            Open Enrolled
          </Button>
          <Button variant="outline" onClick={() => joinInputRef.current?.focus()}>
            <Sparkles className="mr-2 h-4 w-4" />
            Join New Class
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <motion.div whileHover={{ y: -4 }}>
          <Card className="theme-card transition-all">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide theme-muted">Enrolled</p>
              <p className="mt-2 text-3xl font-bold text-[var(--app-text)]">
                {enrolledClasses.length}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4 }}>
          <Card className="theme-card transition-all">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide theme-muted">Upcoming</p>
              <p className="mt-2 text-3xl font-bold text-[var(--app-text)]">
                {upcomingActivities.length}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4 }}>
          <Card className="theme-card transition-all">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide theme-muted">Active Class</p>
              <p className="mt-2 text-base font-semibold text-[var(--app-text)]">
                {selectedClass?.name ?? "No class selected"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="theme-card">
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-[var(--app-text)]">Join Class by Code</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              ref={joinInputRef}
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="e.g. ABC123-XY4"
              className="bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)]"
            />
            <Button onClick={handleJoinClass} disabled={isJoining}>
              <Plus className="mr-2 h-4 w-4" />
              {isJoining ? "Joining..." : "Join Class"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEnrolled = () => (
    <StudentEnrolledSection
      enrolledClasses={enrolledClasses}
      selectedClassId={selectedClassId}
      selectedClass={selectedClass}
      activities={activities}
      isLoadingClasses={isLoadingClasses}
      isLoadingActivities={isLoadingActivities}
      onSelectClass={(classId) => {
        setSelectedClassId(classId);
        setActiveSection("enrolled");
      }}
      onOpenActivityDetails={(activity) =>
        navigate(`/student/classes/${activity.classId}/activities/${activity.id}`)
      }
    />
  );

  const renderSettings = () => (
    <StudentSettingsPanel onAccountDeleted={() => (window.location.href = "/auth/login_screen")} />
  );

  return (
    <div className="h-screen overflow-hidden bg-transparent text-[var(--app-text)]">
      <StudentSidebar
        items={[...SIDEBAR_ITEMS]}
        activeSection={activeSection}
        mobileOpen={mobileSidebarOpen}
        enrolledClasses={enrolledClasses}
        selectedClassId={selectedClassId}
        onSelectSection={setActiveSection}
        onSelectClass={(classId) => {
          setSelectedClassId(classId);
          setActiveSection("enrolled");
        }}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <header className="fixed left-0 right-0 top-0 z-10 h-20 border-b theme-border bg-[color-mix(in_srgb,var(--app-bg)_78%,transparent)] backdrop-blur-md md:left-20">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="theme-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border theme-border text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)] md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs theme-muted">
                Student Panel - {activeSection}
              </p>
              <p className="truncate text-base font-semibold text-[var(--app-text)] sm:text-lg">
                {welcomeGreeting}, {studentName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GlobalThemeToggle />
            <ActivityNotificationsPopover
              notifications={notifications}
              open={notificationsOpen}
              loading={isLoadingNotifications}
              onToggle={() => setNotificationsOpen((current) => !current)}
              onClose={() => setNotificationsOpen(false)}
              onRefresh={() => void loadNotifications()}
            />
          </div>
        </div>
      </header>

      <main
        ref={mainScrollRef}
        data-route-scroll-container
        className="fixed inset-x-0 bottom-0 top-20 overflow-y-auto px-4 py-6 pb-10 sm:px-6 md:left-20"
      >
        <div className="mx-auto max-w-6xl">
          {activeSection === "home" && renderHome()}
          {activeSection === "enrolled" && renderEnrolled()}
          {activeSection === "settings" && renderSettings()}
        </div>
      </main>

    </div>
  );
}
