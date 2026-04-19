import { motion } from "framer-motion";
import { Copy, Plus } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent } from "../../../components/ui/Card";
import type { TeacherClass } from "../services/teacherClassroomService";

type TeacherClassesSectionProps = {
  classes: TeacherClass[];
  isLoading: boolean;
  latestCreatedCode: string;
  copiedCode: string | null;
  onCreateClass: () => void;
  onCopyCode: (code: string) => void;
  onManageClass: (classroom: TeacherClass) => void;
};

export function TeacherClassesSection({
  classes,
  isLoading,
  latestCreatedCode,
  copiedCode,
  onCreateClass,
  onCopyCode,
  onManageClass,
}: TeacherClassesSectionProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--app-text)]">Your Classes</h2>
          <p className="text-sm theme-muted">
            Manage activities, students, and AI analysis per class.
          </p>
        </div>
        <Button onClick={onCreateClass}>
          <Plus className="mr-2 h-4 w-4" />
          New Class
        </Button>
      </div>

      {latestCreatedCode && (
        <Card className="theme-card border-dashed theme-border">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium theme-title">Latest generated join code</p>
              <p className="font-mono text-2xl font-bold tracking-widest text-[var(--app-text)]">
                {latestCreatedCode}
              </p>
            </div>
            <Button variant="outline" onClick={() => onCopyCode(latestCreatedCode)}>
              <Copy className="mr-2 h-4 w-4" />
              {copiedCode === latestCreatedCode ? "Copied" : "Copy Code"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
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
                      <p className="text-lg font-bold text-[var(--app-text)]">
                        {classroom.assignments}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] px-4 py-3">
                    <div>
                      <p className="text-xs font-medium theme-title">Join code</p>
                      <p className="font-mono font-bold tracking-widest text-[var(--app-text)]">
                        {classroom.code}
                      </p>
                    </div>
                    <Button variant="ghost" onClick={() => onCopyCode(classroom.code)}>
                      <Copy className="mr-1 h-4 w-4" />
                      {copiedCode === classroom.code ? "Copied" : "Copy"}
                    </Button>
                  </div>

                  <Button onClick={() => onManageClass(classroom)}>Manage Class</Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
