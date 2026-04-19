import { motion } from "framer-motion";
import { BookOpen, CalendarClock, Plus, Users } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent } from "../../../components/ui/Card";
import type { TeacherSection } from "./TeacherSidebar";

type TeacherHomeSectionProps = {
  isLoading: boolean;
  classCount: number;
  studentCount: number;
  activityCount: number;
  upcomingCount: number;
  onCreateClass: () => void;
  onOpenSection: (section: TeacherSection) => void;
};

export function TeacherHomeSection({
  isLoading,
  classCount,
  studentCount,
  activityCount,
  upcomingCount,
  onCreateClass,
  onOpenSection,
}: TeacherHomeSectionProps) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="theme-surface rounded-3xl border border-dashed theme-border px-6 py-7 sm:px-8"
      >
        <h1 className="theme-title text-3xl font-extrabold sm:text-4xl">TrueSight</h1>
        <p className="mt-4 max-w-3xl text-base theme-muted sm:text-lg">
          Manage your classes, students, activities, and upcoming deadlines from one
          dashboard.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onCreateClass}>
            <Plus className="mr-2 h-4 w-4" />
            Create Class
          </Button>
          <Button variant="outline" onClick={() => onOpenSection("classes")}>
            <BookOpen className="mr-2 h-4 w-4" />
            View Classes
          </Button>
          <Button variant="outline" onClick={() => onOpenSection("students")}>
            <Users className="mr-2 h-4 w-4" />
            View Students
          </Button>
          <Button variant="outline" onClick={() => onOpenSection("upcoming")}>
            <CalendarClock className="mr-2 h-4 w-4" />
            View Upcoming
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-4">
        <motion.div whileHover={{ y: -4 }}>
          <Card className="theme-card">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide theme-muted">Classes</p>
              <p className="mt-2 text-3xl font-bold text-[var(--app-text)]">
                {isLoading ? "--" : classCount}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -4 }}>
          <Card className="theme-card">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide theme-muted">Students</p>
              <p className="mt-2 text-3xl font-bold text-[var(--app-text)]">
                {isLoading ? "--" : studentCount}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -4 }}>
          <Card className="theme-card">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide theme-muted">Activities</p>
              <p className="mt-2 text-3xl font-bold text-[var(--app-text)]">
                {isLoading ? "--" : activityCount}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -4 }}>
          <Card className="theme-card">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide theme-muted">Upcoming</p>
              <p className="mt-2 text-3xl font-bold text-[var(--app-text)]">
                {isLoading ? "--" : upcomingCount}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
