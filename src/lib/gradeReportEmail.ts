import crypto from 'crypto';
import mongoose from 'mongoose';
import { Submission, type IStudent, type ISubmission, type ITestResult } from '@/lib/models';
import { listAssignments, specs } from '@/lib/specs';
import { getEmailConfig, sendEmail } from '@/lib/email';

function toJson(value: unknown): string {
  try {
    if (value === undefined) return 'undefined';
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function computeFailedChecksSignature(results: Array<Partial<ITestResult>>): string {
  const failedKeys = results
    .filter((r) => r && r.passed === false)
    .map((r) => {
      const functionName = String(r.functionName ?? 'unknown');
      const testIndex = Number(r.testIndex ?? -1);
      return `${functionName}:${testIndex}`;
    })
    .sort();

  return failedKeys.join('|');
}

export function computeEmailSignature(params: {
  score: number;
  maxScore: number;
  failedChecksSignature: string;
}): string {
  const base = `${params.score}/${params.maxScore}|${params.failedChecksSignature}`;
  return crypto.createHash('sha256').update(base).digest('hex');
}

export async function computeCompletedCumulative(studentId: string) {
  const studentObjectId = new mongoose.Types.ObjectId(studentId);
  const totals = await Submission.aggregate([
    {
      $match: {
        studentId: studentObjectId,
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$studentId',
        totalScore: { $sum: '$score' },
        totalMaxScore: { $sum: '$maxScore' },
        completedAssignments: { $sum: 1 }
      }
    }
  ]);

  const row = totals[0] || { totalScore: 0, totalMaxScore: 0, completedAssignments: 0 };
  const totalScore = Number(row.totalScore || 0);
  const totalMaxScore = Number(row.totalMaxScore || 0);
  const overallPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

  const totalAssignments = listAssignments().length;

  return {
    totalScore,
    totalMaxScore,
    completedAssignments: Number(row.completedAssignments || 0),
    totalAssignments,
    overallPercentage
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderFailedChecksTable(failed: Array<Partial<ITestResult>>): string {
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

function renderTextReport(params: {
  studentName: string;
  week: number;
  session: number;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  cumulative: {
    totalScore: number;
    totalMaxScore: number;
    overallPercentage: number;
    completedAssignments: number;
    totalAssignments: number;
  };
  failed: Array<Partial<ITestResult>>;
}): string {
  const lines: string[] = [];
  lines.push(`Hi ${params.studentName},`);
  lines.push('');
  lines.push(`Your assignment has been graded: Week ${params.week} / Session ${params.session} — ${params.title}`);
  lines.push(`Score: ${params.score}/${params.maxScore} (${params.percentage}%)`);
  lines.push('');
  lines.push('Cumulative (completed submissions only):');
  lines.push(
    `Total: ${params.cumulative.totalScore}/${params.cumulative.totalMaxScore} (${params.cumulative.overallPercentage}%) — ` +
      `${params.cumulative.completedAssignments}/${params.cumulative.totalAssignments} assignments graded`
  );
  lines.push('');

  if (params.failed.length === 0) {
    lines.push('All checks passed. Great work.');
    return lines.join('\n');
  }

  lines.push(`Failed checks (${params.failed.length}):`);
  for (const f of params.failed) {
    lines.push(`- ${String(f.functionName ?? 'unknown')} #${String(f.testIndex ?? '')}`);
    lines.push(`  input: ${toJson(f.input)}`);
    lines.push(`  expected: ${toJson(f.expected)}`);
    lines.push(`  actual: ${toJson(f.actual)}`);
    if (f.error) lines.push(`  error: ${String(f.error)}`);
  }

  return lines.join('\n');
}

function pickAssignmentTitle(week: number, session: number): string {
  const all = listAssignments();
  const match = all.find((a) => a.week === week && a.session === session);
  return match?.title || `Week ${week} / Session ${session}`;
}

export async function maybeSendGradeReportEmail(params: {
  student: Pick<IStudent, '_id' | 'name' | 'email'>;
  submission: ISubmission & { _id: any; lastEmailSignature?: string | null; lastEmailedAt?: Date | null };
}): Promise<
  | { sent: true; skipped: false; signature: string }
  | { sent: false; skipped: true; reason: string; signature?: string }
  | { sent: false; skipped: false; reason: string; signature?: string }
> {
  let emailEnabled = false;
  try {
    emailEnabled = getEmailConfig().enabled;
  } catch (error: any) {
    return {
      sent: false,
      skipped: false,
      reason: error?.message || 'email-config-error'
    };
  }

  if (!emailEnabled) {
    return { sent: false, skipped: true, reason: 'email-disabled' };
  }

  if (params.submission.status !== 'completed') {
    return { sent: false, skipped: true, reason: 'submission-not-completed' };
  }

  const email = String(params.student.email || '').trim();
  if (!email) {
    return { sent: false, skipped: true, reason: 'missing-student-email' };
  }

  const score = Number(params.submission.score || 0);
  const maxScore = Number(params.submission.maxScore || 0);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const results = (params.submission.results || []) as Array<Partial<ITestResult>>;
  const failed = results.filter((r) => r && r.passed === false);

  const failedChecksSignature = computeFailedChecksSignature(results);
  const signature = computeEmailSignature({ score, maxScore, failedChecksSignature });

  if (params.submission.lastEmailSignature && params.submission.lastEmailSignature === signature) {
    return { sent: false, skipped: true, reason: 'deduped', signature };
  }

  const cumulative = await computeCompletedCumulative(String(params.student._id));

  const title = pickAssignmentTitle(params.submission.week, params.submission.session);
  const courseName = specs.course?.name || 'Course';
  const subject = `${courseName} — Week ${params.submission.week} Session ${params.submission.session} — ${title} — Grade Report`;

  const html = `
<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.4;color:#111827;">
  <p>Hi ${escapeHtml(String(params.student.name))},</p>
  <p>Your assignment has been graded:</p>
  <p style="margin:0;"><strong>Week ${params.submission.week} / Session ${params.submission.session} — ${escapeHtml(title)}</strong></p>
  <p style="margin:0;">Score: <strong>${score}/${maxScore} (${percentage}%)</strong></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
  <p style="margin:0 0 8px 0;"><strong>Cumulative (completed submissions only)</strong></p>
  <p style="margin:0;">Total: <strong>${cumulative.totalScore}/${cumulative.totalMaxScore} (${cumulative.overallPercentage}%)</strong></p>
  <p style="margin:0;">Assignments graded: <strong>${cumulative.completedAssignments}/${cumulative.totalAssignments}</strong></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
  <p style="margin:0 0 8px 0;"><strong>Failed checks</strong></p>
  ${renderFailedChecksTable(failed)}
  <p style="margin-top:16px;color:#6b7280;font-size:12px;">If you have failures, recreate the inputs locally and compare expected vs actual outputs.</p>
</div>`;

  const text = renderTextReport({
    studentName: String(params.student.name),
    week: params.submission.week,
    session: params.submission.session,
    title,
    score,
    maxScore,
    percentage,
    cumulative,
    failed
  });

  try {
    await sendEmail({ to: email, subject, html, text });

    await Submission.updateOne(
      { _id: params.submission._id },
      { $set: { lastEmailSignature: signature, lastEmailedAt: new Date(), lastEmailError: null } }
    );

    return { sent: true, skipped: false, signature };
  } catch (error: any) {
    await Submission.updateOne(
      { _id: params.submission._id },
      { $set: { lastEmailError: String(error?.message || error) } }
    );

    return { sent: false, skipped: false, reason: error?.message || 'email-send-failed', signature };
  }
}
