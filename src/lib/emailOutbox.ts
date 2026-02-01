import mongoose from 'mongoose';
import { EmailOutbox, Student, Submission, type IStudent, type ISubmission, type ITestResult } from '@/lib/models';
import { specs, listAssignments } from '@/lib/specs';
import { getEmailConfig, sendEmail } from '@/lib/email';
import {
  computeCompletedCumulative,
  computeEmailSignature,
  computeFailedChecksSignature
} from '@/lib/gradeReportEmail';

function toJson(value: unknown): string {
  try {
    if (value === undefined) return 'undefined';
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function pickAssignmentTitle(week: number, session: number): string {
  const all = listAssignments();
  const match = all.find((a) => a.week === week && a.session === session);
  return match?.title || `Week ${week} / Session ${session}`;
}

function renderTextFailedChecks(failed: Array<Partial<ITestResult>>): string {
  if (failed.length === 0) return 'All checks passed.';
  const lines: string[] = [];
  lines.push(`Failed checks (${failed.length}):`);
  for (const f of failed) {
    lines.push(`- ${String(f.functionName ?? 'unknown')} #${String(f.testIndex ?? '')}`);
    lines.push(`  input: ${toJson(f.input)}`);
    lines.push(`  expected: ${toJson(f.expected)}`);
    lines.push(`  actual: ${toJson(f.actual)}`);
    if (f.error) lines.push(`  error: ${String(f.error)}`);
  }
  return lines.join('\n');
}

function renderHtmlFailedChecks(failed: Array<Partial<ITestResult>>): string {
  if (failed.length === 0) {
    return '<p><strong>All checks passed.</strong></p>';
  }

  const rows = failed
    .map((r) => {
      const fn = escapeHtml(String(r.functionName ?? 'unknown'));
      const idx = escapeHtml(String(r.testIndex ?? ''));
      const input = escapeHtml(toJson(r.input));
      const expected = escapeHtml(toJson(r.expected));
      const actual = escapeHtml(toJson(r.actual));
      const error = escapeHtml(String(r.error ?? ''));

      return `
<tr>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;white-space:nowrap;">${fn} #${idx}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;"><code>${input}</code></td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;"><code>${expected}</code></td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;"><code>${actual}</code></td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${error}</td>
</tr>`;
    })
    .join('');

  return `
<table style="border-collapse:collapse;width:100%;font-family:ui-sans-serif,system-ui;">
  <thead>
    <tr>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Check</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Input</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Expected</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Actual</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Error</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
}

export function computeCurrentGradeEmailSignature(submission: Pick<ISubmission, 'score' | 'maxScore' | 'results'>): string {
  const score = Number(submission.score || 0);
  const maxScore = Number(submission.maxScore || 0);
  const results = (submission.results || []) as Array<Partial<ITestResult>>;
  const failedChecksSignature = computeFailedChecksSignature(results);
  return computeEmailSignature({ score, maxScore, failedChecksSignature });
}

export async function enqueueGradeReportEmail(params: {
  student: Pick<IStudent, '_id' | 'name' | 'email'>;
  submission: Pick<ISubmission, '_id' | 'studentId' | 'week' | 'session' | 'status' | 'score' | 'maxScore' | 'results' | 'lastEmailSignature' | 'lastEmailedAt'>;
}): Promise<{ enqueued: boolean; skipped: boolean; reason?: string; signature?: string }> {
  // Never block grading on SMTP. This function only writes to MongoDB.
  let enabled = false;
  try {
    enabled = getEmailConfig().enabled;
  } catch {
    return { enqueued: false, skipped: true, reason: 'email-config-error' };
  }

  if (!enabled) return { enqueued: false, skipped: true, reason: 'email-disabled' };
  if (params.submission.status !== 'completed') {
    return { enqueued: false, skipped: true, reason: 'submission-not-completed' };
  }

  const to = String(params.student.email || '').trim();
  if (!to) return { enqueued: false, skipped: true, reason: 'missing-student-email' };

  const signature = computeCurrentGradeEmailSignature(params.submission);

  if (params.submission.lastEmailSignature === signature && params.submission.lastEmailedAt) {
    return { enqueued: false, skipped: true, reason: 'deduped', signature };
  }

  const studentId = new mongoose.Types.ObjectId(String(params.student._id));
  const submissionId = new mongoose.Types.ObjectId(String(params.submission._id));

  await EmailOutbox.updateOne(
    { submissionId, signature },
    {
      $setOnInsert: {
        type: 'grade-report',
        status: 'pending',
        attempts: 0,
        nextAttemptAt: new Date(),
        studentId,
        submissionId,
        to
      }
    },
    { upsert: true }
  );

  return { enqueued: true, skipped: false, signature };
}

function computeBackoffMs(attempts: number): number {
  // 1m, 2m, 4m, 8m, ... up to 6h
  const base = 60_000;
  const max = 6 * 60 * 60_000;
  const raw = base * Math.pow(2, Math.max(0, attempts - 1));
  return Math.min(raw, max);
}

async function buildGradeReportEmail(params: { student: IStudent; submission: ISubmission }) {
  const title = pickAssignmentTitle(params.submission.week, params.submission.session);
  const courseName = specs.course?.name || 'Course';

  const score = Number(params.submission.score || 0);
  const maxScore = Number(params.submission.maxScore || 0);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const results = (params.submission.results || []) as Array<Partial<ITestResult>>;
  const failed = results.filter((r) => r && r.passed === false);

  const signature = computeCurrentGradeEmailSignature(params.submission);
  const cumulative = await computeCompletedCumulative(String(params.student._id));

  const subject = `${courseName} — Week ${params.submission.week} Session ${params.submission.session} — ${title} — Grade Report`;

  const html = `
<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.4;color:#111827;">
  <p>Hi ${escapeHtml(String(params.student.name))},</p>
  <p>Your assignment has been graded:</p>
  <p style="margin:0;"><strong>${escapeHtml(courseName)} — Week ${params.submission.week} / Session ${params.submission.session} — ${escapeHtml(title)}</strong></p>
  <p style="margin:0;">Score: <strong>${score}/${maxScore} (${percentage}%)</strong></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
  <p style="margin:0 0 8px 0;"><strong>Cumulative (completed submissions only)</strong></p>
  <p style="margin:0;">Total: <strong>${cumulative.totalScore}/${cumulative.totalMaxScore} (${cumulative.overallPercentage}%)</strong></p>
  <p style="margin:0;">Assignments graded: <strong>${cumulative.completedAssignments}/${cumulative.totalAssignments}</strong></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
  <p style="margin:0 0 8px 0;"><strong>Failed checks</strong></p>
  ${renderHtmlFailedChecks(failed)}
  <p style="margin-top:16px;color:#6b7280;font-size:12px;">If you have failures, recreate the inputs locally and compare expected vs actual outputs.</p>
</div>`;

  const text =
    `Hi ${params.student.name},\n\n` +
    `Your assignment has been graded: ${courseName} — Week ${params.submission.week} / Session ${params.submission.session} — ${title}\n` +
    `Score: ${score}/${maxScore} (${percentage}%)\n\n` +
    `Cumulative (completed submissions only):\n` +
    `Total: ${cumulative.totalScore}/${cumulative.totalMaxScore} (${cumulative.overallPercentage}%) — ${cumulative.completedAssignments}/${cumulative.totalAssignments} assignments graded\n\n` +
    `${renderTextFailedChecks(failed)}\n`;

  return { subject, html, text, signature };
}

export async function processEmailOutboxBatch(params: { limit?: number }) {
  const limit = Math.max(1, Math.min(100, Number(params.limit || 20)));
  const now = new Date();

  const summary = {
    claimed: 0,
    sent: 0,
    retried: 0,
    canceled: 0
  };

  for (let i = 0; i < limit; i++) {
    const job = await EmailOutbox.findOneAndUpdate(
      { status: 'pending', nextAttemptAt: { $lte: now } },
      { $set: { status: 'processing', processingStartedAt: new Date() } },
      { sort: { createdAt: 1 }, new: true }
    );

    if (!job) break;
    summary.claimed++;

    try {
      const submission = await Submission.findById(job.submissionId);
      const student = await Student.findById(job.studentId);

      if (!submission || !student) {
        job.status = 'canceled';
        job.cancelReason = 'missing-student-or-submission';
        await job.save();
        summary.canceled++;
        continue;
      }

      if (submission.status !== 'completed') {
        job.status = 'canceled';
        job.cancelReason = 'submission-not-completed';
        await job.save();
        summary.canceled++;
        continue;
      }

      const currentSignature = computeCurrentGradeEmailSignature(submission);
      if (currentSignature !== job.signature) {
        job.status = 'canceled';
        job.cancelReason = 'superseded-by-new-grade';
        await job.save();
        summary.canceled++;
        continue;
      }

      if (submission.lastEmailSignature === currentSignature && submission.lastEmailedAt) {
        job.status = 'canceled';
        job.cancelReason = 'already-sent';
        await job.save();
        summary.canceled++;
        continue;
      }

      const to = String(student.email || '').trim();
      if (!to) {
        job.status = 'canceled';
        job.cancelReason = 'missing-student-email';
        await job.save();
        summary.canceled++;
        continue;
      }

      const { subject, html, text } = await buildGradeReportEmail({ student, submission });

      await sendEmail({ to, subject, html, text });

      job.status = 'sent';
      job.sentAt = new Date();
      job.lastError = null;
      job.processingStartedAt = null;
      job.to = to;
      await job.save();

      submission.lastEmailSignature = currentSignature;
      submission.lastEmailedAt = new Date();
      submission.lastEmailError = null;
      await submission.save();

      summary.sent++;
    } catch (error: any) {
      const attempts = Number(job.attempts || 0) + 1;
      const backoffMs = computeBackoffMs(attempts);

      job.status = 'pending';
      job.attempts = attempts;
      job.nextAttemptAt = new Date(Date.now() + backoffMs);
      job.lastError = String(error?.message || error);
      job.processingStartedAt = null;
      await job.save();

      await Submission.updateOne(
        { _id: job.submissionId },
        { $set: { lastEmailError: job.lastError } }
      );

      summary.retried++;
    }
  }

  return summary;
}
