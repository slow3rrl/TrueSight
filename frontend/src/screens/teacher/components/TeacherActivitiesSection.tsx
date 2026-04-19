import { motion } from "framer-motion";
import { Card, CardContent } from "../../../components/ui/Card";
import type { TeacherOverviewActivity } from "../services/teacherClassroomService";

type TeacherActivitiesSectionProps = {
  activities: TeacherOverviewActivity[];
  isLoading: boolean;
};

export function TeacherActivitiesSection({
  activities,
  isLoading,
}: TeacherActivitiesSectionProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[var(--app-text)]">All Activities</h2>
        <p className="text-sm theme-muted">
          Complete list of activities created across your classes.
        </p>
      </div>

      {isLoading ? (
        <Card className="theme-card">
          <CardContent className="p-6 text-sm theme-muted">Loading activities...</CardContent>
        </Card>
      ) : activities.length === 0 ? (
        <Card className="theme-card">
          <CardContent className="p-6 text-sm theme-muted">
            No activities created yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <motion.div key={activity.id} whileHover={{ y: -2 }}>
              <Card className="theme-card">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--app-text)]">{activity.title}</p>
                      <p className="text-xs theme-muted">{activity.className}</p>
                    </div>
                    <p className="text-xs font-medium theme-title">
                      Due {new Date(activity.dueDate).toLocaleString()}
                    </p>
                  </div>

                  <p className="text-sm theme-muted">{activity.description}</p>

                  <div className="flex items-center gap-3 text-xs theme-muted">
                    <span className="rounded-full bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] px-2 py-1 text-[var(--app-accent)]">
                      {activity.submissionType === "essay" ? "Essay" : "File"}
                    </span>
                    <span>{activity.submissionCount} submissions</span>
                    <span>Instructor: {activity.instructor}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
