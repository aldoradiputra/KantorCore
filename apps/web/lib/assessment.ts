import 'server-only'
import { and, eq, asc, desc } from 'drizzle-orm'
import {
  assessments, assessmentSections, questions, questionOptions,
  assessSessions, assessAnswers,
  type Assessment, type AssessSession, type Question, type QuestionOption,
  type SessionStatus,
} from '@kantorcore/db'
import { withTenant } from './db'

export type { Assessment, AssessSession, Question, QuestionOption, SessionStatus }

// ── Assessment templates ───────────────────────────────────────────────────────

export async function listAssessments(tenantId: string): Promise<Assessment[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(assessments)
      .where(eq(assessments.tenantId, tenantId))
      .orderBy(desc(assessments.createdAt))
  )
}

export async function getAssessment(tenantId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const [assessment] = await tx.select().from(assessments)
      .where(and(eq(assessments.id, id), eq(assessments.tenantId, tenantId)))
      .limit(1)
    if (!assessment) return null

    const sectionRows = await tx.select().from(assessmentSections)
      .where(eq(assessmentSections.assessmentId, id))
      .orderBy(asc(assessmentSections.position))

    const questionRows = await tx.select().from(questions)
      .where(eq(questions.assessmentId, id))
      .orderBy(asc(questions.position))

    const optionRows = await tx.select().from(questionOptions)
      .where(eq(questionOptions.questionId, questionRows.map((q) => q.id) as any))

    // Build option map
    const optsByQuestion: Record<string, QuestionOption[]> = {}
    for (const opt of optionRows) {
      if (!optsByQuestion[opt.questionId]) optsByQuestion[opt.questionId] = []
      optsByQuestion[opt.questionId]!.push(opt)
    }

    return {
      assessment,
      sections: sectionRows,
      questions: questionRows.map((q) => ({
        ...q,
        options: (optsByQuestion[q.id] ?? []).sort((a, b) => a.position - b.position),
      })),
    }
  })
}

export async function createAssessment(input: {
  tenantId:           string
  userId:             string
  title:              string
  description?:       string | null
  instructions?:      string | null
  timeLimitMinutes?:  number | null
  passingScore?:      number | null
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Judul wajib diisi.' }

  return withTenant(input.tenantId, async (tx) => {
    const [a] = await tx.insert(assessments).values({
      tenantId:          input.tenantId,
      title,
      description:       input.description ?? null,
      instructions:      input.instructions ?? null,
      timeLimitMinutes:  input.timeLimitMinutes ?? null,
      passingScore:      input.passingScore ?? null,
      createdBy:         input.userId,
    }).returning({ id: assessments.id })
    return { ok: true as const, id: a!.id }
  })
}

export async function addQuestion(input: {
  tenantId:     string
  assessmentId: string
  type:         'multiple_choice' | 'multiple_select' | 'essay' | 'rating'
  content:      string
  points?:      number
  sectionId?:   string | null
  explanation?: string | null
  ratingMax?:   number | null
}): Promise<{ ok: true; questionId: string } | { ok: false; error: string }> {
  const content = input.content.trim()
  if (!content) return { ok: false, error: 'Konten pertanyaan wajib diisi.' }

  return withTenant(input.tenantId, async (tx) => {
    // Determine position
    const existing = await tx.select({ id: questions.id })
      .from(questions).where(eq(questions.assessmentId, input.assessmentId))
    const position = existing.length

    const [q] = await tx.insert(questions).values({
      assessmentId: input.assessmentId,
      sectionId:    input.sectionId ?? null,
      type:         input.type,
      content,
      explanation:  input.explanation ?? null,
      position,
      points:       String(input.points ?? 1),
      ratingMax:    input.ratingMax ?? null,
    }).returning({ id: questions.id })
    return { ok: true as const, questionId: q!.id }
  })
}

export async function addOption(input: {
  questionId:  string
  content:     string
  isCorrect:   boolean
  scoreWeight?: number
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const content = input.content.trim()
  if (!content) return { ok: false, error: 'Konten opsi wajib diisi.' }

  return withTenant('', async (tx) => {
    const existing = await tx.select({ id: questionOptions.id })
      .from(questionOptions).where(eq(questionOptions.questionId, input.questionId))
    await tx.insert(questionOptions).values({
      questionId:  input.questionId,
      content,
      isCorrect:   input.isCorrect,
      scoreWeight: String(input.scoreWeight ?? 1),
      position:    existing.length,
    })
    return { ok: true as const }
  })
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(input: {
  assessmentId: string
  contextType:  string
  contextId:    string
  subjectType:  'candidate' | 'employee'
  subjectId:    string
  subjectName?: string
  expiresAt?:   Date
}): Promise<string> {
  return withTenant('', async (tx) => {
    const [s] = await tx.insert(assessSessions).values({
      assessmentId: input.assessmentId,
      contextType:  input.contextType,
      contextId:    input.contextId,
      subjectType:  input.subjectType,
      subjectId:    input.subjectId,
      subjectName:  input.subjectName ?? null,
      expiresAt:    input.expiresAt ?? null,
      status:       'pending',
    }).returning({ id: assessSessions.id })
    return s!.id
  })
}

export async function getSessionWithAnswers(sessionId: string) {
  return withTenant('', async (tx) => {
    const [session] = await tx.select().from(assessSessions)
      .where(eq(assessSessions.id, sessionId)).limit(1)
    if (!session) return null

    const answerRows = await tx.select().from(assessAnswers)
      .where(eq(assessAnswers.sessionId, sessionId))

    return { session, answers: answerRows }
  })
}

export async function submitAnswer(input: {
  sessionId:         string
  questionId:        string
  selectedOptionIds?: string[]
  textResponse?:     string
  ratingValue?:      number
}) {
  return withTenant('', async (tx) => {
    // Upsert answer
    const existing = await tx.select({ id: assessAnswers.id })
      .from(assessAnswers)
      .where(and(eq(assessAnswers.sessionId, input.sessionId), eq(assessAnswers.questionId, input.questionId)))
      .limit(1)

    if (existing.length > 0) {
      await tx.update(assessAnswers)
        .set({
          selectedOptionIds: input.selectedOptionIds ?? null,
          textResponse:      input.textResponse ?? null,
          ratingValue:       input.ratingValue ?? null,
        })
        .where(eq(assessAnswers.id, existing[0]!.id))
    } else {
      await tx.insert(assessAnswers).values({
        sessionId:         input.sessionId,
        questionId:        input.questionId,
        selectedOptionIds: input.selectedOptionIds ?? null,
        textResponse:      input.textResponse ?? null,
        ratingValue:       input.ratingValue ?? null,
      })
    }
  })
}

export async function gradeSession(sessionId: string, gradedBy: string): Promise<{
  totalScore: number; maxScore: number; passed: boolean | null
}> {
  return withTenant('', async (tx) => {
    const [session] = await tx.select().from(assessSessions)
      .where(eq(assessSessions.id, sessionId)).limit(1)
    if (!session) throw new Error('Session not found')

    const questionRows = await tx.select().from(questions)
      .where(eq(questions.assessmentId, session.assessmentId))

    const optionRows = await tx.select().from(questionOptions)
      .where(eq(questionOptions.questionId, questionRows.map((q) => q.id) as any))

    const answerRows = await tx.select().from(assessAnswers)
      .where(eq(assessAnswers.sessionId, sessionId))

    const optByQuestion: Record<string, QuestionOption[]> = {}
    for (const o of optionRows) {
      if (!optByQuestion[o.questionId]) optByQuestion[o.questionId] = []
      optByQuestion[o.questionId]!.push(o)
    }

    let totalScore = 0
    let maxScore = 0

    for (const q of questionRows) {
      const pts = Number(q.points)
      maxScore += pts
      const answer = answerRows.find((a) => a.questionId === q.id)
      if (!answer) continue

      if (q.type === 'multiple_choice') {
        const selected = answer.selectedOptionIds?.[0]
        const correct = optByQuestion[q.id]?.find((o) => o.isCorrect)
        if (selected && correct && selected === correct.id) {
          totalScore += pts
          await tx.update(assessAnswers).set({ score: String(pts), isCorrect: true }).where(eq(assessAnswers.id, answer.id))
        } else {
          await tx.update(assessAnswers).set({ score: '0', isCorrect: false }).where(eq(assessAnswers.id, answer.id))
        }
      } else if (q.type === 'multiple_select') {
        const correctIds = new Set(optByQuestion[q.id]?.filter((o) => o.isCorrect).map((o) => o.id) ?? [])
        const selectedIds = new Set(answer.selectedOptionIds ?? [])
        const allCorrect = [...correctIds].every((id) => selectedIds.has(id)) && selectedIds.size === correctIds.size
        const score = allCorrect ? pts : 0
        totalScore += score
        await tx.update(assessAnswers).set({ score: String(score), isCorrect: allCorrect }).where(eq(assessAnswers.id, answer.id))
      }
      // essay / rating: manual grading — score set by grader separately
    }

    const passed = session.assessment?.passingScore != null
      ? (totalScore / maxScore * 100) >= Number((session as any).passingScore ?? 0)
      : null

    await tx.update(assessSessions).set({
      status:     'graded',
      totalScore: String(totalScore),
      maxScore:   String(maxScore),
      passed,
      gradedBy,
      gradedAt:   new Date(),
    }).where(eq(assessSessions.id, sessionId))

    return { totalScore, maxScore, passed }
  })
}
