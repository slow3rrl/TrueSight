import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Card, CardContent } from "../../../components/ui/Card";
import { getDisplayInitials } from "../../../utils/profileImage";
import type { TeacherOverviewStudent } from "../services/teacherClassroomService";

type TeacherStudentsSectionProps = {
  students: TeacherOverviewStudent[];
  isLoading: boolean;
};

export function TeacherStudentsSection({
  students,
  isLoading,
}: TeacherStudentsSectionProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[var(--app-text)]">All Students</h2>
        <p className="text-sm theme-muted">
          Unique student list across all your classes, deduplicated by username + email.
        </p>
      </div>

      {isLoading ? (
        <Card className="theme-card">
          <CardContent className="p-6 text-sm theme-muted">Loading students...</CardContent>
        </Card>
      ) : students.length === 0 ? (
        <Card className="theme-card">
          <CardContent className="p-6 text-sm theme-muted">
            No students enrolled in your classes yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {students.map((student) => (
            <motion.div key={`${student.email}-${student.name}`} whileHover={{ y: -2 }}>
              <Card className="theme-card">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border theme-border">
                      {student.profileImageUrl ? (
                        <AvatarImage src={student.profileImageUrl} alt={student.name} />
                      ) : null}
                      <AvatarFallback className="text-xs font-semibold text-[var(--app-text)]">
                        {getDisplayInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="font-semibold text-[var(--app-text)]">{student.name}</p>
                      <p className="text-xs theme-muted">{student.email}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--app-text)]">
                      {student.classCount} classes
                    </p>
                    <p className="text-xs theme-muted">
                      {student.submissionCount} submissions
                    </p>
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
