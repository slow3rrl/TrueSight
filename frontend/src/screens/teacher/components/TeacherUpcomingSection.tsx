import { motion } from "framer-motion";
import { Card, CardContent } from "../../../components/ui/Card";
import type { TeacherOverviewActivity } from "../services/teacherClassroomService";

type TeacherUpcomingSectionProps = {
  upcomingActivities: TeacherOverviewActivity[];
  isLoading: boolean;
};

export function TeacherUpcomingSection({
  upcomingActivities,
  isLoading,
}: TeacherUpcomingSectionProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[var(--app-text)]">Upcoming</h2>
        <p className="text-sm theme-muted">
          Activities with future deadlines across all your classes.
        </p>
      </div>

      {isLoading ? (
        <Card className="theme-card">
          <CardContent className="p-6 text-sm theme-muted">Loading upcoming items...</CardContent>
        </Card>
      ) : upcomingActivities.length === 0 ? (
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
                    <p className="text-sm theme-muted">{activity.className}</p>
                  </div>
                  <p className="text-sm font-semibold theme-title">
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
}
