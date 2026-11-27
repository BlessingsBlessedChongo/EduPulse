// Everything the app asks of the service goes through here.

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** The learner's own date, so "today" is their today wherever the server is. */
export function localDay(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'X-Day': localDay(), 'X-Zone-Minutes': String(-new Date().getTimezoneOffset()) };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(path, { method, headers, body: payload, credentials: 'same-origin' });
  } catch {
    throw new ApiError('EduPulse could not be reached. Check your connection and try again.', 0);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const detail = (data as { detail?: string } | null)?.detail;
    throw new ApiError(detail || fallback(response.status), response.status);
  }
  return data as T;
}

function fallback(status: number): string {
  if (status === 401) return 'Please sign in again.';
  if (status === 404) return 'That could not be found.';
  if (status === 413) return 'That file is too large.';
  if (status === 429) return 'Too many tries. Wait a little and try again.';
  return 'Something went wrong. Please try again.';
}

export const api = {
  get: <T>(path: string) => call<T>('GET', path),
  post: <T>(path: string, body?: unknown) => call<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => call<T>('PATCH', path, body),
  del: <T>(path: string, body?: unknown) => call<T>('DELETE', path, body),
};

// ---- the shapes the service sends back

export type Me = { id: string; name: string; email: string; isDemo: boolean };

export type About = {
  ai: boolean;
  photos: boolean;
  photosPerDay: number;
  maxPages: number;
  comingSoon: { name: string; detail: string }[];
};

export type Kind = 'Choice' | 'Short' | 'Maths' | 'Blank';

export type Question = {
  id: string;
  courseId: string;
  course: string;
  topic: string;
  kind: Kind;
  prompt: string;
  options: string[];
  marks: number;
  isNew: boolean;
};

export type Today = {
  date: string;
  questions: Question[];
  due: number;
  doneToday: number;
  courses: number;
  totalQuestions: number;
  documentsBeingRead: number;
  photosLeft: number;
};

export type Award = { point: string; marks: number; earned: number; note: string };

export type Verdict = {
  score: number;
  max: number;
  markedBy: 'exact' | 'engine' | 'ai' | 'rules' | 'none';
  awards: Award[];
  summary: string;
  finalAnswerRight: boolean | null;
  read: string[];
  unsure: string[];
  review?: { reason: string; decision: 'changed' | 'upheld'; reply: string; before: number } | null;
};

export type Marked = {
  attemptId: string;
  verdict: Verdict;
  answer: string;
  quote: string;
  page: number;
  documentId: string;
  document: string;
  nextDue: string | null;
  photosLeft: number;
};

export type TopicPulse = { topicId: string; topic: string; percent: number; questions: number; seen: number; due: number; reading: string };

export type CoursePulse = {
  courseId: string;
  course: string;
  percent: number;
  questions: number;
  seen: number;
  due: number;
  examDate: string | null;
  daysToExam: number | null;
  topics: TopicPulse[];
};

export type Day = { date: string; answered: number; marks: number; outOf: number };

export type PulseView = { percent: number; questions: number; seen: number; dueToday: number; streak: number; courses: CoursePulse[]; days: Day[] };

export type CourseCard = {
  id: string;
  name: string;
  examDate: string | null;
  daysToExam: number | null;
  percent: number;
  questions: number;
  seen: number;
  due: number;
  documents: number;
  working: number;
  hasStyle: boolean;
};

export type Style = {
  choice: number;
  short: number;
  maths: number;
  commandWords: string[];
  usualMarks: number[];
  layout: string;
  examples: string[];
  papersRead: number;
};

export type DocumentRow = {
  id: string;
  kind: 'Notes' | 'PastPaper';
  title: string;
  status: 'Queued' | 'Reading' | 'Ready' | 'Failed';
  note: string | null;
  pageCount: number;
  questionCount: number;
  proposed: number;
  notOnPage: number;
  createdAt: string;
};

export type CourseDetail = {
  id: string;
  name: string;
  examDate: string | null;
  daysToExam: number | null;
  percent: number;
  questions: number;
  seen: number;
  due: number;
  style: Style | null;
  documents: DocumentRow[];
  topics: TopicPulse[];
};

export type Measured = {
  questions: { proposed: number; refusedNotOnPage: number; kept: number };
  marking: { by: string; count: number; disputed: number }[];
  calls: { purpose: string; calls: number; answered: number; medianMs: number }[];
};

export type SourcePage = { title: string; number: number; text: string; pages: number };
