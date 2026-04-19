import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Home,
  Menu,
  Settings,
  Users,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { GlobalThemeToggle } from "../../components/theme/GlobalThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { useAuth } from "../../context/useAuth";
import {
  analyzeSingleSubmission,
  analyzeAllClassSubmissions,
  createClassActivity,
  createTeacherClass,
  fetchClassActivities,
  fetchClassStudents,
  fetchClassSubmissions,
  fetchTeacherOverview,
  type ActivitySubmissionType,
  type ClassActivity,
  type ClassSubmission,
  type EnrolledStudent,
  type TeacherClass,
  type TeacherOverviewActivity,
  type TeacherOverviewStudent,
} from "./services/teacherClassroomService";
import { generateUniqueClassCode } from "../../utils/ClassCode";
import {
  TeacherSidebar,
  type TeacherSection,
} from "./components/TeacherSidebar";
import { TeacherClassManagerModal } from "./components/TeacherClassManagerModal";
import { TeacherSettingsPanel } from "./components/TeacherSettingsPanel";
import { TeacherHomeSection } from "./components/TeacherHomeSection";
import { TeacherClassesSection } from "./components/TeacherClassesSection";
import { TeacherStudentsSection } from "./components/TeacherStudentsSection";
import { TeacherActivitiesSection } from "./components/TeacherActivitiesSection";
import { TeacherUpcomingSection } from "./components/TeacherUpcomingSection";
import { getDisplayInitials } from "../../utils/profileImage";

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
  { key: "students", label: "Students", icon: Users },
  { key: "activities", label: "Activities", icon: ClipboardList },
  { key: "upcoming", label: "Upcoming", icon: CalendarClock },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

const DEFAULT_SECTION: Section = "home";
const LEGACY_SECTION_REDIRECTS: Record<string, Section> = {
  calendar: "upcoming",
};
const VALID_SECTIONS: Section[] = [
  "home",
  "classes",
  "students",
  "activities",
  "upcoming",
  "settings",
];

const isValidSection = (value?: string): value is Section =>
  Boolean(value && VALID_SECTIONS.includes(value as Section));

const resolveSection = (value?: string): Section => {
  if (!value) {
    return DEFAULT_SECTION;
  }

  if (LEGACY_SECTION_REDIRECTS[value]) {
    return LEGACY_SECTION_REDIRECTS[value];
  }

  return isValidSection(value) ? value : DEFAULT_SECTION;
};

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
  const [overviewStudents, setOverviewStudents] = useState<TeacherOverviewStudent[]>([]);
  const [overviewActivities, setOverviewActivities] = useState<TeacherOverviewActivity[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<TeacherOverviewActivity[]>([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

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

  const goToSection = (target: Section) => {
    navigate(`/teacher/teacher_screen/${target}`);
  };

  useEffect(() => {
    if (section !== activeSection) {
      navigate(`/teacher/teacher_screen/${activeSection}`, { replace: true });
    }
  }, [activeSection, navigate, section]);

  useEffect(() => {
    setActivityForm((previous) => ({ ...previous, instructor: teacherName }));
  }, [teacherName]);

  const loadTeacherOverview = async () => {
    setIsLoadingOverview(true);

    try {
      const overview = await fetchTeacherOverview();
      setClasses(overview.classes);
      setOverviewStudents(overview.students);
      setOverviewActivities(overview.activities);
      setUpcomingActivities(overview.upcoming);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load dashboard data.";
      toast.error(message);
      setClasses([]);
      setOverviewStudents([]);
      setOverviewActivities([]);
      setUpcomingActivities([]);
    } finally {
      setIsLoadingOverview(false);
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
    void loadTeacherOverview();
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
      await loadTeacherOverview();
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

      await Promise.all([loadTeacherOverview(), loadClassManagerData(managedClass.id)]);
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
      await Promise.all([loadTeacherOverview(), loadClassManagerData(managedClass.id)]);
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
      await Promise.all([loadTeacherOverview(), loadClassManagerData(managedClass.id)]);
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
        onSelect={(selectedSection) => goToSection(selectedSection)}
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
            <Avatar className="h-9 w-9 border theme-border">
              {user?.profileImageUrl ? <AvatarImage src={user.profileImageUrl} alt={teacherName} /> : null}
              <AvatarFallback className="text-xs font-semibold text-[var(--app-text)]">
                {getDisplayInitials(teacherName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-10 sm:px-6 md:ml-20">
        {activeSection === "home" && (
          <TeacherHomeSection
            isLoading={isLoadingOverview}
            classCount={classes.length}
            studentCount={overviewStudents.length}
            activityCount={overviewActivities.length}
            upcomingCount={upcomingActivities.length}
            onCreateClass={() => setIsCreateModalOpen(true)}
            onOpenSection={goToSection}
          />
        )}

        {activeSection === "classes" && (
          <TeacherClassesSection
            classes={classes}
            isLoading={isLoadingOverview}
            latestCreatedCode={latestCreatedCode}
            copiedCode={copiedCode}
            onCreateClass={() => setIsCreateModalOpen(true)}
            onCopyCode={(code) => void handleCopyCode(code)}
            onManageClass={(classroom) => void openClassManager(classroom)}
          />
        )}

        {activeSection === "students" && (
          <TeacherStudentsSection students={overviewStudents} isLoading={isLoadingOverview} />
        )}

        {activeSection === "activities" && (
          <TeacherActivitiesSection
            activities={overviewActivities}
            isLoading={isLoadingOverview}
          />
        )}

        {activeSection === "upcoming" && (
          <TeacherUpcomingSection
            upcomingActivities={upcomingActivities}
            isLoading={isLoadingOverview}
          />
        )}

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
        onOpenSubmissionPage={(submissionId) => navigate(`/teacher/submissions/${submissionId}`)}
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
