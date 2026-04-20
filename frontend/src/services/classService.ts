export type TeacherClass = {
  id: string;
  name: string;
  code: string;
  description: string;
  students: number;
  assignments: number;
  instructorId: string;
  createdAt: string;
  teacherName: string;
  teacherProfileImageUrl: string | null;
};

export type EnrolledClass = Omit<
  TeacherClass,
  "teacherName" | "teacherProfileImageUrl"
> & {
  joinedAt: string;
  teacherName: string;
  teacherProfileImageUrl: string | null;
};

export type ActivitySubmissionType = "essay" | "file";

export type ActivityNotificationType = "new_activity" | "upcoming_deadline";

export type ActivityNotification = {
  id: string;
  type: ActivityNotificationType;
  severity: "info" | "warning";
  classId: string;
  className: string;
  activityId: string;
  activityTitle: string;
  title: string;
  message: string;
  eventAt: string;
  dueDate: string | null;
  createdAt: string | null;
};

export type ExplainabilitySignal = {
  id: string;
  label: string;
  score: number;
  explanation: string;
};

export type SuspiciousSentence = {
  sentenceNumber: number;
  sentence: string;
  aiSuspicionScore: number;
  reasons: string[];
};

export type SubmissionAnalysisDetails = {
  source?: string;
  verdict?: string;
  reasons?: string[];
  metrics?: Record<string, unknown>;
  aiProbability?: number;
  humanProbability?: number;
  confidenceScore?: number;
  confidenceLevel?: string;
  writingConsistencyScore?: number;
  humanRevisionLikelihood?: number;
  suspiciousSentences?: SuspiciousSentence[];
  explainabilitySignals?: ExplainabilitySignal[];
  [key: string]: unknown;
};

export type StudentActivitySubmission = {
  id: string;
  status: string;
  aiProbability: number | null;
  humanProbability: number | null;
  confidenceScore: number | null;
  isAIGenerated: boolean | null;
  analysisDetails: SubmissionAnalysisDetails | null;
  submittedAt: string | null;
  contentText: string | null;
  fileName: string | null;
};

export type ClassActivity = {
  id: string;
  classId: string;
  title: string;
  instructor: string;
  description: string;
  submissionType: ActivitySubmissionType;
  dueDate: string;
  createdAt: string;
  submissionCount: number;
  mySubmission: StudentActivitySubmission | null;
};

export type EnrolledStudent = {
  id: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  joinedAt: string;
  submissionCount: number;
};

export type TeacherOverviewStudent = {
  id: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  firstJoinedAt: string;
  lastJoinedAt: string;
  classCount: number;
  submissionCount: number;
};

export type TeacherOverviewActivity = {
  id: string;
  classId: string;
  className: string;
  title: string;
  instructor: string;
  description: string;
  submissionType: ActivitySubmissionType;
  dueDate: string;
  createdAt: string;
  submissionCount: number;
};

export type TeacherOverview = {
  classes: TeacherClass[];
  students: TeacherOverviewStudent[];
  activities: TeacherOverviewActivity[];
  upcoming: TeacherOverviewActivity[];
};

export type TeacherAnalyticsTotals = {
  totalSubmissions: number;
  flaggedOutputs: number;
  averageIntegrityScore: number | null;
};

export type TeacherSuspiciousClass = {
  classId: string;
  className: string;
  submissions: number;
  flaggedOutputs: number;
  averageAiProbability: number | null;
  averageIntegrityScore: number | null;
};

export type TeacherMonthlyTrend = {
  month: string;
  monthKey: string;
  submissions: number;
  flaggedOutputs: number;
  averageIntegrityScore: number | null;
};

export type TeacherAnalytics = {
  totals: TeacherAnalyticsTotals;
  topSuspiciousClasses: TeacherSuspiciousClass[];
  monthlyTrends: TeacherMonthlyTrend[];
};

export type ClassSubmission = {
  id: string;
  activityId: string;
  classId: string | null;
  className: string | null;
  activityTitle: string;
  submissionType: ActivitySubmissionType;
  dueDate: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  contentText: string | null;
  fileName: string | null;
  status: string;
  aiProbability: number | null;
  humanProbability: number | null;
  confidenceScore: number | null;
  isAIGenerated: boolean | null;
  analysisDetails: SubmissionAnalysisDetails | null;
  submittedAt: string;
  updatedAt: string;
};

export type SubmissionAnalysisResult = {
  id: string;
  status: string;
  aiProbability: number | null;
  humanProbability: number | null;
  confidenceScore: number | null;
  isAIGenerated: boolean | null;
  analysisDetails: SubmissionAnalysisDetails | null;
  updatedAt: string;
};

type ApiClass = {
  id: number;
  name: string;
  code: string;
  description: string;
  teacher_id: number;
  student_count: number;
  assignment_count: number;
  created_at: string;
  joined_at?: string;
  teacher_name?: string;
  teacher_profile_image_url?: string | null;
};

type ApiActivity = {
  id: number;
  class_id: number;
  title: string;
  instructor: string;
  description: string;
  submission_type: ActivitySubmissionType;
  due_date: string;
  created_at: string;
  submission_count?: number;
  submission_id?: number | null;
  submission_status?: string | null;
  ai_probability?: number | null;
  is_ai_generated?: boolean | null;
  analysis_details?: SubmissionAnalysisDetails | null;
  submitted_at?: string | null;
  content_text?: string | null;
  file_name?: string | null;
};

type ApiStudent = {
  id: number;
  name: string;
  email: string;
  profile_image_url?: string | null;
  joined_at: string;
  submission_count: number;
};

type ApiTeacherOverviewStudent = {
  id: number;
  name: string;
  email: string;
  profile_image_url?: string | null;
  first_joined_at: string;
  last_joined_at: string;
  class_count: number;
  submission_count: number;
};

type ApiTeacherOverviewActivity = {
  id: number;
  class_id: number;
  class_name: string;
  title: string;
  instructor: string;
  description: string;
  submission_type: ActivitySubmissionType;
  due_date: string;
  created_at: string;
  submission_count: number;
};

type ApiSubmission = {
  id: number;
  activity_id: number;
  class_id?: number;
  class_name?: string;
  activity_title: string;
  submission_type: ActivitySubmissionType;
  due_date: string;
  student_id: number;
  student_name: string;
  student_email: string;
  content_text: string | null;
  file_name: string | null;
  status: string;
  ai_probability: number | null;
  is_ai_generated: boolean | null;
  analysis_details: SubmissionAnalysisDetails | null;
  submitted_at: string;
  updated_at: string;
};

type ApiTeacherSuspiciousClass = {
  classId: string;
  className: string;
  submissions: number;
  flaggedOutputs: number;
  averageAiProbability: number | null;
  averageIntegrityScore: number | null;
};

type ApiTeacherMonthlyTrend = {
  month: string;
  monthKey: string;
  submissions: number;
  flaggedOutputs: number;
  averageIntegrityScore: number | null;
};

type ApiTeacherAnalytics = {
  totals: {
    totalSubmissions: number;
    flaggedOutputs: number;
    averageIntegrityScore: number | null;
  };
  topSuspiciousClasses: ApiTeacherSuspiciousClass[];
  monthlyTrends: ApiTeacherMonthlyTrend[];
};

type ApiActivityNotification = {
  id: string;
  type: ActivityNotificationType;
  severity: "info" | "warning";
  classId: string | number;
  className: string;
  activityId: string | number;
  activityTitle: string;
  title: string;
  message: string;
  eventAt: string;
  dueDate?: string | null;
  createdAt?: string | null;
};

const API_URL = "http://localhost:5000/api/classes";

async function request<T>(
  path: string,
  options?: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
  },
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options?.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    throw new Error(
      typeof payload.message === "string"
        ? payload.message
        : "Request failed.",
    );
  }

  return payload as T;
}

const mapTeacherClass = (item: ApiClass): TeacherClass => ({
  id: String(item.id),
  name: item.name,
  code: item.code,
  description: item.description,
  students: Number(item.student_count ?? 0),
  assignments: Number(item.assignment_count ?? 0),
  instructorId: String(item.teacher_id),
  createdAt: item.created_at,
  teacherName: item.teacher_name ?? "Unknown Teacher",
  teacherProfileImageUrl: item.teacher_profile_image_url ?? null,
});

const mapEnrolledClass = (item: ApiClass): EnrolledClass => ({
  id: String(item.id),
  name: item.name,
  code: item.code,
  description: item.description,
  students: Number(item.student_count ?? 0),
  assignments: Number(item.assignment_count ?? 0),
  instructorId: String(item.teacher_id),
  createdAt: item.created_at,
  joinedAt: item.joined_at ?? item.created_at,
  teacherName: item.teacher_name ?? "Unknown Teacher",
  teacherProfileImageUrl: item.teacher_profile_image_url ?? null,
});

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const extractAnalysisNumbers = (details: SubmissionAnalysisDetails | null) => ({
  humanProbability: asNumber(details?.humanProbability),
  confidenceScore: asNumber(details?.confidenceScore),
});

const mapStudentSubmission = (item: ApiActivity): StudentActivitySubmission | null => {
  if (!item.submission_id) {
    return null;
  }

  const analysisDetails = item.analysis_details ?? null;
  const { humanProbability, confidenceScore } = extractAnalysisNumbers(analysisDetails);

  return {
    id: String(item.submission_id),
    status: item.submission_status ?? "pending",
    aiProbability: asNumber(item.ai_probability),
    humanProbability,
    confidenceScore,
    isAIGenerated:
      typeof item.is_ai_generated === "boolean" ? item.is_ai_generated : null,
    analysisDetails,
    submittedAt: item.submitted_at ?? null,
    contentText: item.content_text ?? null,
    fileName: item.file_name ?? null,
  };
};

const mapActivity = (item: ApiActivity): ClassActivity => ({
  id: String(item.id),
  classId: String(item.class_id),
  title: item.title,
  instructor: item.instructor,
  description: item.description,
  submissionType: item.submission_type,
  dueDate: item.due_date,
  createdAt: item.created_at,
  submissionCount: Number(item.submission_count ?? 0),
  mySubmission: mapStudentSubmission(item),
});

const mapStudent = (item: ApiStudent): EnrolledStudent => ({
  id: String(item.id),
  name: item.name,
  email: item.email,
  profileImageUrl: item.profile_image_url ?? null,
  joinedAt: item.joined_at,
  submissionCount: Number(item.submission_count ?? 0),
});

const mapTeacherOverviewStudent = (
  item: ApiTeacherOverviewStudent,
): TeacherOverviewStudent => ({
  id: String(item.id),
  name: item.name,
  email: item.email,
  profileImageUrl: item.profile_image_url ?? null,
  firstJoinedAt: item.first_joined_at,
  lastJoinedAt: item.last_joined_at,
  classCount: Number(item.class_count ?? 0),
  submissionCount: Number(item.submission_count ?? 0),
});

const mapTeacherOverviewActivity = (
  item: ApiTeacherOverviewActivity,
): TeacherOverviewActivity => ({
  id: String(item.id),
  classId: String(item.class_id),
  className: item.class_name,
  title: item.title,
  instructor: item.instructor,
  description: item.description,
  submissionType: item.submission_type,
  dueDate: item.due_date,
  createdAt: item.created_at,
  submissionCount: Number(item.submission_count ?? 0),
});

const mapTeacherAnalytics = (payload: ApiTeacherAnalytics): TeacherAnalytics => ({
  totals: {
    totalSubmissions: Number(payload.totals?.totalSubmissions ?? 0),
    flaggedOutputs: Number(payload.totals?.flaggedOutputs ?? 0),
    averageIntegrityScore: asNumber(payload.totals?.averageIntegrityScore),
  },
  topSuspiciousClasses: (payload.topSuspiciousClasses ?? []).map((item) => ({
    classId: item.classId,
    className: item.className,
    submissions: Number(item.submissions ?? 0),
    flaggedOutputs: Number(item.flaggedOutputs ?? 0),
    averageAiProbability: asNumber(item.averageAiProbability),
    averageIntegrityScore: asNumber(item.averageIntegrityScore),
  })),
  monthlyTrends: (payload.monthlyTrends ?? []).map((item) => ({
    month: item.month,
    monthKey: item.monthKey,
    submissions: Number(item.submissions ?? 0),
    flaggedOutputs: Number(item.flaggedOutputs ?? 0),
    averageIntegrityScore: asNumber(item.averageIntegrityScore),
  })),
});

const mapNotification = (item: ApiActivityNotification): ActivityNotification => ({
  id: item.id,
  type: item.type,
  severity: item.severity === "warning" ? "warning" : "info",
  classId: String(item.classId),
  className: item.className,
  activityId: String(item.activityId),
  activityTitle: item.activityTitle,
  title: item.title,
  message: item.message,
  eventAt: item.eventAt,
  dueDate: item.dueDate ?? null,
  createdAt: item.createdAt ?? null,
});

const mapSubmission = (item: ApiSubmission): ClassSubmission => {
  const analysisDetails = item.analysis_details ?? null;
  const { humanProbability, confidenceScore } = extractAnalysisNumbers(analysisDetails);

  return {
    id: String(item.id),
    activityId: String(item.activity_id),
    classId: typeof item.class_id === "number" ? String(item.class_id) : null,
    className: item.class_name ?? null,
    activityTitle: item.activity_title,
    submissionType: item.submission_type,
    dueDate: item.due_date,
    studentId: String(item.student_id),
    studentName: item.student_name,
    studentEmail: item.student_email,
    contentText: item.content_text,
    fileName: item.file_name,
    status: item.status,
    aiProbability: asNumber(item.ai_probability),
    humanProbability,
    confidenceScore,
    isAIGenerated:
      typeof item.is_ai_generated === "boolean" ? item.is_ai_generated : null,
    analysisDetails,
    submittedAt: item.submitted_at,
    updatedAt: item.updated_at,
  };
};

export async function fetchTeacherClasses(): Promise<TeacherClass[]> {
  const payload = await request<{ classes: ApiClass[] }>("/mine");
  return (payload.classes ?? []).map(mapTeacherClass);
}

export async function fetchTeacherOverview(): Promise<TeacherOverview> {
  const payload = await request<{
    classes: ApiClass[];
    students: ApiTeacherOverviewStudent[];
    activities: ApiTeacherOverviewActivity[];
    upcoming: ApiTeacherOverviewActivity[];
  }>("/teacher/overview");

  return {
    classes: (payload.classes ?? []).map(mapTeacherClass),
    students: (payload.students ?? []).map(mapTeacherOverviewStudent),
    activities: (payload.activities ?? []).map(mapTeacherOverviewActivity),
    upcoming: (payload.upcoming ?? []).map(mapTeacherOverviewActivity),
  };
}

export async function fetchTeacherAnalytics(): Promise<TeacherAnalytics> {
  const payload = await request<ApiTeacherAnalytics>("/teacher/analytics");
  return mapTeacherAnalytics(payload);
}

export async function fetchUserNotifications(): Promise<ActivityNotification[]> {
  const payload = await request<{ notifications: ApiActivityNotification[] }>(
    "/notifications",
  );

  return (payload.notifications ?? []).map(mapNotification);
}

export async function createTeacherClass(input: {
  name: string;
  description: string;
  code: string;
}): Promise<TeacherClass> {
  const payload = await request<{ class: ApiClass }>("/", {
    method: "POST",
    body: input,
  });

  return mapTeacherClass(payload.class);
}

export async function joinClassByCode(code: string): Promise<EnrolledClass> {
  const payload = await request<{ class: ApiClass }>("/join", {
    method: "POST",
    body: { code },
  });

  return mapEnrolledClass(payload.class);
}

export async function fetchEnrolledClasses(): Promise<EnrolledClass[]> {
  const payload = await request<{ classes: ApiClass[] }>("/enrolled");
  return (payload.classes ?? []).map(mapEnrolledClass);
}

export async function fetchClassActivities(classId: string): Promise<ClassActivity[]> {
  const payload = await request<{ activities: ApiActivity[] }>(`/${classId}/activities`);
  return (payload.activities ?? []).map(mapActivity);
}

export async function createClassActivity(
  classId: string,
  input: {
    title: string;
    instructor: string;
    description: string;
    submissionType: ActivitySubmissionType;
    dueDate: string;
  },
): Promise<ClassActivity> {
  const payload = await request<{ activity: ApiActivity }>(`/${classId}/activities`, {
    method: "POST",
    body: input,
  });

  return mapActivity(payload.activity);
}

export async function submitActivitySubmission(
  activityId: string,
  input: {
    contentText?: string;
    fileName?: string;
    extractedText?: string;
  },
): Promise<StudentActivitySubmission> {
  const payload = await request<{
    submission: {
      id: number;
      status: string;
      ai_probability: number | null;
      is_ai_generated: boolean | null;
      analysis_details: SubmissionAnalysisDetails | null;
      submitted_at: string;
      content_text: string | null;
      file_name: string | null;
    };
  }>(`/activities/${activityId}/submissions`, {
    method: "POST",
    body: input,
  });

  return {
    id: String(payload.submission.id),
    status: payload.submission.status,
    aiProbability: asNumber(payload.submission.ai_probability),
    humanProbability: asNumber(payload.submission.analysis_details?.humanProbability),
    confidenceScore: asNumber(payload.submission.analysis_details?.confidenceScore),
    isAIGenerated:
      typeof payload.submission.is_ai_generated === "boolean"
        ? payload.submission.is_ai_generated
        : null,
    analysisDetails: payload.submission.analysis_details,
    submittedAt: payload.submission.submitted_at,
    contentText: payload.submission.content_text,
    fileName: payload.submission.file_name,
  };
}

export async function fetchClassStudents(classId: string): Promise<EnrolledStudent[]> {
  const payload = await request<{ students: ApiStudent[] }>(`/${classId}/students`);
  return (payload.students ?? []).map(mapStudent);
}

export async function fetchClassSubmissions(
  classId: string,
): Promise<ClassSubmission[]> {
  const payload = await request<{ submissions: ApiSubmission[] }>(
    `/${classId}/submissions`,
  );
  return (payload.submissions ?? []).map(mapSubmission);
}

export async function fetchSubmissionDetail(
  submissionId: string,
): Promise<ClassSubmission> {
  const payload = await request<{ submission: ApiSubmission }>(
    `/submissions/${submissionId}`,
  );

  return mapSubmission(payload.submission);
}

export async function analyzeSingleSubmission(
  submissionId: string,
): Promise<SubmissionAnalysisResult> {
  const payload = await request<{
    submission: {
      id: number;
      status: string;
      ai_probability: number | null;
      is_ai_generated: boolean | null;
      analysis_details: SubmissionAnalysisDetails | null;
      updated_at: string;
    };
  }>(`/submissions/${submissionId}/analyze`, {
    method: "POST",
  });

  const analysisDetails = payload.submission.analysis_details ?? null;

  return {
    id: String(payload.submission.id),
    status: payload.submission.status,
    aiProbability: asNumber(payload.submission.ai_probability),
    humanProbability: asNumber(analysisDetails?.humanProbability),
    confidenceScore: asNumber(analysisDetails?.confidenceScore),
    isAIGenerated:
      typeof payload.submission.is_ai_generated === "boolean"
        ? payload.submission.is_ai_generated
        : null,
    analysisDetails,
    updatedAt: payload.submission.updated_at,
  };
}

export async function analyzeAllClassSubmissions(classId: string): Promise<number> {
  const payload = await request<{ updated: number }>(`/${classId}/submissions/analyze`, {
    method: "POST",
  });

  return Number(payload.updated ?? 0);
}
