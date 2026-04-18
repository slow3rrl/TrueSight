import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bell, BookOpen, Calendar, Copy, Home, Menu, Plus, Settings, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { GlobalThemeToggle } from "../../components/theme/GlobalThemeToggle";
import { useAuth } from "../../context/useAuth";
import {
  analyzeSingleSubmission,
  analyzeAllClassSubmissions,
  createClassActivity,
  createTeacherClass,
  fetchClassActivities,
  fetchClassStudents,
  fetchClassSubmissions,
  fetchTeacherClasses,
  type ActivitySubmissionType,
  type ClassActivity,
  type ClassSubmission,
  type EnrolledStudent,
  type TeacherClass,
} from "./services/teacherClassroomService";
import { generateUniqueClassCode } from "../../utils/ClassCode";
import {
  TeacherSidebar,
  type TeacherSection,
} from "./components/TeacherSidebar";
import { TeacherClassManagerModal } from "./components/TeacherClassManagerModal";
import { TeacherSettingsPanel } from "./components/TeacherSettingsPanel";

type Section = TeacherSection;

type ActivityFormState = {
  title: string;
  instructor: string;
  description: string;
  submissionType: ActivitySubmissionType;
  dueDate: string;
};

const SIDEBAR_ITEMS = [
  { key: "home", label: "Home", icon: Home },
  { key: "classes", label: "Classes", icon: BookOpen },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

const DEFAULT_SECTION: Section = "home";
const VALID_SECTIONS: Section[] = ["home", "classes", "calendar", "settings"];

const isValidSection = (value?: string): value is Section =>
  Boolean(value && VALID_SECTIONS.includes(value as Section));

const resolveSection = (value?: string): Section =>
  isValidSection(value) ? value : DEFAULT_SECTION;

const getProbabilityTone = (probability: number | null) => {
  if (probability === null) {
    return "bg-[color-mix(in_srgb,var(--app-muted)_25%,transparent)] text-[var(--app-text)]";
  }

  if (probability >= 80) {
    return "bg-rose-500/20 text-rose-300";
  }

  if (probability >= 60) {
    return "bg-amber-500/20 text-amber-300";
  }

  return "bg-emerald-500/20 text-emerald-300";
};

export default function TeacherScreen() {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const { user, logout } = useAuth();

  const activeSection = resolveSection(section);

  const teacherName = user?.name ?? "Teacher";

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [className, setClassName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [description, setDescription] = useState("");
  const [latestCreatedCode, setLatestCreatedCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [isClassManagerOpen, setIsClassManagerOpen] = useState(false);
  const [managedClass, setManagedClass] = useState<TeacherClass | null>(null);
  const [isLoadingClassManager, setIsLoadingClassManager] = useState(false);

  const [classActivities, setClassActivities] = useState<ClassActivity[]>([]);
  const [classStudents, setClassStudents] = useState<EnrolledStudent[]>([]);
  const [classSubmissions, setClassSubmissions] = useState<ClassSubmission[]>([]);

  const [activityForm, setActivityForm] = useState<ActivityFormState>({
    title: "",
    instructor: teacherName,
    description: "",
    submissionType: "essay",
    dueDate: "",
  });
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingSubmissionId, setAnalyzingSubmissionId] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  const totalStudents = useMemo(
    () => classes.reduce((sum, classroom) => sum + classroom.students, 0),
    [classes],
  );

  const totalAssignments = useMemo(
    () => classes.reduce((sum, classroom) => sum + classroom.assignments, 0),
    [classes],
  );

  const upcomingActivities = useMemo(() => {
    return [...classActivities]
      .sort(
        (left, right) =>
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
      )
      .slice(0, 5);
  }, [classActivities]);

  const goToSection = (target: Section) => {
    navigate(`/teacher/teacher_screen/${target}`);
  };

  useEffect(() => {
    if (!isValidSection(section)) {
      navigate(`/teacher/teacher_screen/${DEFAULT_SECTION}`, { replace: true });
    }
  }, [section, navigate]);

  useEffect(() => {
    setActivityForm((previous) => ({ ...previous, instructor: teacherName }));
  }, [teacherName]);

  const loadTeacherClasses = async () => {
    setIsLoadingClasses(true);

    try {
      const loaded = await fetchTeacherClasses();
      setClasses(loaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load classes.";
      toast.error(message);
      setClasses([]);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const loadClassManagerData = async (classId: string) => {
    setIsLoadingClassManager(true);

    try {
      const [activities, students, submissions] = await Promise.all([
        fetchClassActivities(classId),
        fetchClassStudents(classId),
        fetchClassSubmissions(classId),
      ]);

      setClassActivities(activities);
      setClassStudents(students);
      setClassSubmissions(submissions);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load class manager.";
      toast.error(message);
    } finally {
      setIsLoadingClassManager(false);
    }
  };

  useEffect(() => {
    void loadTeacherClasses();
  }, []);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success("Class code copied.");
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      toast.error("Unable to copy class code.");
    }
  };

  const resetCreateClassForm = () => {
    setClassName("");
    setCourseCode("");
    setDescription("");
  };

  const handleCreateClass = async (event: FormEvent) => {
    event.preventDefault();

    if (isCreatingClass) {
      return;
    }

    setIsCreatingClass(true);

    try {
      const generatedCode = generateUniqueClassCode(classes.map((classroom) => classroom.code));

      await createTeacherClass({
        name: `${courseCode.trim()} - ${className.trim()}`,
        description: description.trim(),
        code: generatedCode,
      });

      setLatestCreatedCode(generatedCode);
      setIsCreateModalOpen(false);
      resetCreateClassForm();
      await loadTeacherClasses();
      goToSection("classes");
      toast.success("Class created successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create class.";
      toast.error(message);
    } finally {
      setIsCreatingClass(false);
    }
  };

  const openClassManager = async (classroom: TeacherClass) => {
    setManagedClass(classroom);
    setIsClassManagerOpen(true);
    setExpandedSubmissionId(null);
    setActivityForm({
      title: "",
      instructor: teacherName,
      description: "",
      submissionType: "essay",
      dueDate: "",
    });

    await loadClassManagerData(classroom.id);
  };

  const handleCreateActivity = async (event: FormEvent) => {
    event.preventDefault();

    if (!managedClass || isCreatingActivity) {
      return;
    }

    setIsCreatingActivity(true);

    try {
      await createClassActivity(managedClass.id, {
        title: activityForm.title.trim(),
        instructor: activityForm.instructor.trim(),
        description: activityForm.description.trim(),
        submissionType: activityForm.submissionType,
        dueDate: activityForm.dueDate,
      });

      toast.success("Activity created successfully.");
      setActivityForm({
        title: "",
        instructor: teacherName,
        description: "",
        submissionType: "essay",
        dueDate: "",
      });

      await Promise.all([loadTeacherClasses(), loadClassManagerData(managedClass.id)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create activity.";
      toast.error(message);
    } finally {
      setIsCreatingActivity(false);
    }
  };

  const handleAnalyzeAll = async () => {
    if (!managedClass || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);

    try {
      const updated = await analyzeAllClassSubmissions(managedClass.id);
      toast.success(`Analysis complete. ${updated} submissions processed.`);
      await loadClassManagerData(managedClass.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to analyze submissions.";
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeSubmission = async (submissionId: string) => {
    if (!managedClass || isAnalyzing || analyzingSubmissionId) {
      return;
    }

    setAnalyzingSubmissionId(submissionId);

    try {
      const result = await analyzeSingleSubmission(submissionId);
      const confidenceSuffix =
        typeof result.confidenceScore === "number"
          ? ` (${result.confidenceScore.toFixed(2)}% confidence)`
          : "";

      toast.success(`Submission analyzed${confidenceSuffix}.`);
      await loadClassManagerData(managedClass.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to analyze submission.";
      toast.error(message);
    } finally {
      setAnalyzingSubmissionId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore transport issues and keep redirect deterministic.
    }

    navigate("/auth/login_screen", { replace: true });
  };

  const renderHome = () => (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="theme-surface rounded-3xl border border-dashed theme-border px-6 py-7 sm:px-8"
      >
        <h1 className="theme-title text-3xl font-extrabold sm:text-4xl">ArtSense AI</h1>
        <p className="mt-4 max-w-3xl text-base theme-muted sm:text-lg">
          Advanced machine learning analysis to distinguish between human-created and
          AI-generated coursework.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Class
          </Button>
          <Button variant="outline" onClick={() => goToSection("classes")}>
            Open Classes
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-4">
        <motion.div whileHover={{ y: -4 }}>
          <Card className="theme-card">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide theme-muted">Classes</p>
              <p className="mt-2 text-3xl font-bold text-[var(--app-text)]">
                {isLoadingClasses ? "--" : classes.length}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4 }}>
          <Card className="theme-card">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide theme-muted">Students</p>
              <p className="mt-2 text-3xl font-bold text-[var(--app-text)]">
                {isLoadingClasses ? "--" : totalStudents}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4 }}>
          <Card className="theme-card">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide theme-muted">Activities</p>
              <p className="mt-2 text-3xl font-bold text-[var(--app-text)]">
                {isLoadingClasses ? "--" : totalAssignments}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4 }}>
          <Card className="theme-card">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide theme-muted">Upcoming</p>
              <p className="mt-2 text-3xl font-bold text-[var(--app-text)]">
                {upcomingActivities.length}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );

  const renderClasses = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--app-text)]">Your Classes</h2>
          <p className="text-sm theme-muted">
            Hover cards, manage activities, students, and AI analysis per class.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Class
        </Button>
      </div>

      {latestCreatedCode && (
        <Card className="theme-card border-dashed theme-border">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium theme-title">Latest generated join code</p>
              <p className="font-mono text-2xl font-bold text-[var(--app-text)] tracking-widest">
                {latestCreatedCode}
              </p>
            </div>
            <Button variant="outline" onClick={() => handleCopyCode(latestCreatedCode)}>
              <Copy className="mr-2 h-4 w-4" />
              {copiedCode === latestCreatedCode ? "Copied" : "Copy Code"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoadingClasses ? (
        <Card className="theme-card">
          <CardContent className="p-6 text-sm theme-muted">Loading classes...</CardContent>
        </Card>
      ) : classes.length === 0 ? (
        <Card className="theme-card">
          <CardContent className="p-6 text-sm theme-muted">
            No classes yet. Create your first class.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {classes.map((classroom) => (
            <motion.div key={classroom.id} whileHover={{ scale: 1.01 }}>
              <Card className="theme-card overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-[var(--app-accent)] to-[var(--app-accent-2)]" />
                <CardContent className="space-y-4 p-5">
                  <div>
                    <p className="text-lg font-bold text-[var(--app-text)]">{classroom.name}</p>
                    <p className="mt-1 text-sm theme-muted line-clamp-2">{classroom.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)] p-3">
                      <p className="text-xs theme-muted">Students</p>
                      <p className="text-lg font-bold text-[var(--app-text)]">{classroom.students}</p>
                    </div>
                    <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)] p-3">
                      <p className="text-xs theme-muted">Activities</p>
                      <p className="text-lg font-bold text-[var(--app-text)]">{classroom.assignments}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] px-4 py-3">
                    <div>
                      <p className="text-xs font-medium theme-title">Join code</p>
                      <p className="font-mono font-bold text-[var(--app-text)] tracking-widest">
                        {classroom.code}
                      </p>
                    </div>
                    <Button variant="ghost" onClick={() => handleCopyCode(classroom.code)}>
                      <Copy className="mr-1 h-4 w-4" />
                      {copiedCode === classroom.code ? "Copied" : "Copy"}
                    </Button>
                  </div>

                  <Button onClick={() => void openClassManager(classroom)}>Manage Class</Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCalendar = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[var(--app-text)]">Calendar</h2>
        <p className="text-sm theme-muted">
          Upcoming activities from the currently managed class.
        </p>
      </div>

      {upcomingActivities.length === 0 ? (
        <Card className="theme-card">
          <CardContent className="p-6 text-sm theme-muted">
            No upcoming activities to display yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {upcomingActivities.map((activity) => (
            <motion.div key={activity.id} whileHover={{ y: -2 }}>
              <Card className="theme-card">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--app-text)]">{activity.title}</p>
                    <p className="text-sm theme-muted">{activity.description}</p>
                  </div>
                  <p className="text-sm theme-title font-semibold">
                    {new Date(activity.dueDate).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <TeacherSettingsPanel
      onAccountDeleted={() => navigate("/auth/login_screen", { replace: true })}
    />
  );

  return (
    <div className="min-h-screen bg-transparent text-[var(--app-text)]">
      <TeacherSidebar
        items={[...SIDEBAR_ITEMS]}
        activeSection={activeSection}
        mobileOpen={mobileSidebarOpen}
        onSelect={(section) => goToSection(section)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <header className="sticky top-0 z-10 border-b theme-border bg-[color-mix(in_srgb,var(--app-bg)_78%,transparent)] backdrop-blur-md md:ml-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="theme-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border theme-border text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)] md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs theme-muted">Teacher Panel</p>
              <p className="text-sm font-semibold capitalize text-[var(--app-text)]">
                {activeSection}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GlobalThemeToggle />
            <button className="theme-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border theme-border text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)]">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-10 sm:px-6 md:ml-20">
        {activeSection === "home" && renderHome()}
        {activeSection === "classes" && renderClasses()}
        {activeSection === "calendar" && renderCalendar()}
        {activeSection === "settings" && renderSettings()}
      </main>

      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.button
              className="absolute inset-0 bg-[var(--sidebar-backdrop)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="theme-surface relative w-full max-w-xl overflow-hidden rounded-3xl"
            >
              <div className="border-b theme-border px-6 py-5">
                <p className="text-sm font-medium theme-title">Create a new class</p>
                <h3 className="mt-1 text-xl font-bold text-[var(--app-text)]">
                  Generate a student join code
                </h3>
              </div>

              <form onSubmit={handleCreateClass} className="space-y-4 p-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--app-text)]">Class Name</label>
                  <Input
                    value={className}
                    onChange={(event) => setClassName(event.target.value)}
                    placeholder="e.g. Artificial Intelligence"
                    required
                    className="bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--app-text)]">Course Code</label>
                  <Input
                    value={courseCode}
                    onChange={(event) => setCourseCode(event.target.value)}
                    placeholder="e.g. IT 301"
                    required
                    className="bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--app-text)]">Description</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Short class overview for students"
                    rows={4}
                    className="theme-ring w-full rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)] px-3 py-2 text-sm text-[var(--app-text)]"
                    required
                  />
                </div>

                <div className="rounded-2xl border border-dashed theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-4 text-sm theme-muted">
                  The system generates a unique code so students can join this class.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      resetCreateClassForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreatingClass}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isCreatingClass ? "Creating..." : "Create Class"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TeacherClassManagerModal
        open={isClassManagerOpen}
        classroom={managedClass}
        loading={isLoadingClassManager}
        activities={classActivities}
        students={classStudents}
        submissions={classSubmissions}
        activityForm={activityForm}
        isCreatingActivity={isCreatingActivity}
        isAnalyzing={isAnalyzing}
        analyzingSubmissionId={analyzingSubmissionId}
        expandedSubmissionId={expandedSubmissionId}
        onClose={() => setIsClassManagerOpen(false)}
        onAnalyzeAll={handleAnalyzeAll}
        onAnalyzeSubmission={(submissionId) => void handleAnalyzeSubmission(submissionId)}
        onOpenSubmissionPage={(submissionId) =>
          navigate(`/teacher/submissions/${submissionId}`)
        }
        onOpenAnalysisPage={(submissionId) =>
          navigate(`/teacher/submissions/${submissionId}/analysis`)
        }
        onSubmitActivity={handleCreateActivity}
        onChangeActivityForm={(patch) =>
          setActivityForm((previous) => ({
            ...previous,
            ...patch,
          }))
        }
        onToggleSubmission={(submissionId) =>
          setExpandedSubmissionId((current) =>
            current === submissionId ? null : submissionId,
          )
        }
        getProbabilityTone={getProbabilityTone}
      />
    </div>
  );
}
