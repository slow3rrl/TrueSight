export type TeacherClass = {
  id: string;
  name: string;
  code: string;
  description: string;
  students: number;
  assignments: number;
  instructorId: string;
  createdAt: string;
};

export type EnrolledClass = TeacherClass & {
  joinedAt: string;
  teacherName: string;
};

export type ActivitySubmissionType = "essay" | "file";

export type StudentActivitySubmission = {
  id: string;
  status: string;
  aiProbability: number | null;
  humanProbability: number | null;
  confidenceScore: number | null;
  isAIGenerated: boolean | null;
  analysisDetails: Record<string, unknown> | null;
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
  joinedAt: string;
  submissionCount: number;
};

export type ClassSubmission = {
  id: string;
  activityId: string;
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
  analysisDetails: Record<string, unknown> | null;
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
  analysisDetails: Record<string, unknown> | null;
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
  analysis_details?: Record<string, unknown> | null;
  submitted_at?: string | null;
  content_text?: string | null;
  file_name?: string | null;
};

type ApiStudent = {
  id: number;
  name: string;
  email: string;
  joined_at: string;
  submission_count: number;
};

type ApiSubmission = {
  id: number;
  activity_id: number;
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
  analysis_details: Record<string, unknown> | null;
  submitted_at: string;
  updated_at: string;
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
});

const mapEnrolledClass = (item: ApiClass): EnrolledClass => ({
  ...mapTeacherClass(item),
  joinedAt: item.joined_at ?? item.created_at,
  teacherName: item.teacher_name ?? "Unknown Teacher",
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

const extractAnalysisNumbers = (details: Record<string, unknown> | null) => ({
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
  joinedAt: item.joined_at,
  submissionCount: Number(item.submission_count ?? 0),
});

const mapSubmission = (item: ApiSubmission): ClassSubmission => {
  const analysisDetails = item.analysis_details ?? null;
  const { humanProbability, confidenceScore } = extractAnalysisNumbers(analysisDetails);

  return {
    id: String(item.id),
    activityId: String(item.activity_id),
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
      analysis_details: Record<string, unknown> | null;
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

export async function analyzeSingleSubmission(
  submissionId: string,
): Promise<SubmissionAnalysisResult> {
  const payload = await request<{
    submission: {
      id: number;
      status: string;
      ai_probability: number | null;
      is_ai_generated: boolean | null;
      analysis_details: Record<string, unknown> | null;
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
