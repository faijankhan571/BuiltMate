import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildLiveGroundedReport(snapshot: any, userQuery: string) {
  const totalWorkforce = snapshot.totalEmployees + snapshot.totalLabours;
  const att = snapshot.attendanceBreakdown;
  const attendancePct =
    att.totalRecords > 0
      ? Math.round(((att.present + att.halfDay * 0.5) / att.totalRecords) * 100)
      : 0;

  const delayedTasks = (snapshot.tasksSummary || []).filter(
    (t: any) => t.status === 'DELAYED'
  );
  const completedTasks = (snapshot.tasksSummary || []).filter(
    (t: any) => t.status === 'COMPLETED'
  );
  const inProgressTasks = (snapshot.tasksSummary || []).filter(
    (t: any) => t.status === 'IN_PROGRESS'
  );

  const outOfStock = (snapshot.materialsStock || []).filter(
    (m: any) => m.status === 'OUT_OF_STOCK' || Number(m.quantity) <= 0
  );
  const lowStock = (snapshot.materialsStock || []).filter(
    (m: any) => m.status === 'LOW_STOCK' || (Number(m.quantity) > 0 && Number(m.quantity) <= 25)
  );

  const executiveSummary = `Across ${snapshot.projects.length} active construction projects and ${snapshot.sites.length} operational sites, BuildMate currently manages ${totalWorkforce} personnel (${snapshot.totalEmployees} salaried engineers/staff and ${snapshot.totalLabours} skilled labourers). Overall logged shift attendance stands at ${attendancePct}% with ${att.totalHours} total worker-hours recorded, ${completedTasks.length} completed tasks, ${inProgressTasks.length} in-progress tasks, and ${delayedTasks.length} delayed task(s).`;

  const attendanceTrends = `Out of ${att.totalRecords} logged attendance entries, ${att.present} workers are marked PRESENT (full shift), ${att.halfDay} HALF_DAY, ${att.leave} on LEAVE, and ${att.absent} ABSENT (${att.totalHours} cumulative hours). Active project deployments include ${snapshot.activeEmployeeAssignments} employee assignments and ${snapshot.activeLabourAssignments} labour assignments, with ${snapshot.pendingLeavesCount} leave request(s) awaiting HR approval.`;

  const staffingShortages = (snapshot.sites || []).slice(0, 3).map((site: any, idx: number) => {
    const delayedOnSite = delayedTasks[idx];
    return {
      siteName: `${site.name} (${site.location})`,
      issue: delayedOnSite
        ? `Task "${delayedOnSite.name}" is marked DELAYED (due ${delayedOnSite.endDate}) and requires additional skilled trade coverage.`
        : `Site status is ${site.status}; requires continuous daily muster verification and trade balancing.`,
      recommendation: delayedOnSite
        ? `Reallocate available skilled labourers to "${site.name}" to clear "${delayedOnSite.name}" and restore schedule compliance.`
        : `Maintain current supervisor roll-call schedule at "${site.name}" and monitor daily shift hours.`,
      priority: delayedOnSite || site.status === 'INSPECTION_DUE' ? 'High' : 'Medium',
    };
  });

  const delayedTasksAnalysis =
    delayedTasks.length > 0
      ? `${delayedTasks.length} task(s) currently marked DELAYED: ${delayedTasks
          .map((t: any) => `"${t.name}" (due ${t.endDate})`)
          .join(', ')}. Immediate supervisor intervention and crew reallocation are recommended.`
      : `All ${snapshot.tasksSummary.length} active construction tasks are currently on schedule with 0 delayed work orders.`;

  const materialStockRisks =
    outOfStock.length > 0 || lowStock.length > 0
      ? `Critical Inventory Alert: ${
          outOfStock.length > 0
            ? `OUT OF STOCK: ${outOfStock.map((m: any) => `${m.name} (${m.quantity} ${m.unit})`).join(', ')}. `
            : ''
        }${
          lowStock.length > 0
            ? `LOW STOCK: ${lowStock.map((m: any) => `${m.name} (${m.quantity} ${m.unit})`).join(', ')}.`
            : ''
        }`
      : `All ${snapshot.materialsStock.length} tracked construction materials are currently IN_STOCK above minimum threshold levels.`;

  const customQueryAnswer = userQuery
    ? `Analysis for "${userQuery}": Based on live BuildMate records (${totalWorkforce} workers across ${snapshot.sites.length} sites), prioritize resolving ${
        delayedTasks.length > 0
          ? `delayed task "${delayedTasks[0].name}"`
          : 'active site task schedules'
      }, replenishing ${
        outOfStock.length + lowStock.length
      } flagged material item(s), and reviewing ${
        snapshot.pendingLeavesCount
      } pending leave request(s) alongside ${
        snapshot.salarySummary.unpaidCount
      } pending payroll disbursement(s) (Total Net Payroll: INR ${Number(
        snapshot.salarySummary.totalNetSalary || 0
      ).toLocaleString('en-IN')}).`
    : `Prioritize clearing ${delayedTasks.length} delayed task(s), restocking ${
        outOfStock.length + lowStock.length
      } low/out-of-stock materials, and processing ${
        snapshot.pendingLeavesCount
      } pending leave request(s).`;

  return {
    executiveSummary,
    attendanceTrends,
    staffingShortages,
    delayedTasksAnalysis,
    materialStockRisks,
    customQueryAnswer,
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'buildmate-workforce-erp' });
  });

  app.post('/api/supabase-proxy', async (req, res) => {
    const { url, method = 'GET', headers = {}, body } = req.body || {};
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(200).json({ status: 400, headers: {}, body: '[]' });
    }
    try {
      const forwardHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(headers)) {
        const lower = k.toLowerCase();
        if (
          typeof v === 'string' &&
          lower !== 'host' &&
          lower !== 'content-length' &&
          lower !== 'connection'
        ) {
          forwardHeaders[k] = v;
        }
      }
      const upstream = await fetch(url, {
        method,
        headers: forwardHeaders,
        body: method !== 'GET' && method !== 'HEAD' && body ? body : undefined,
      });
      const text = await upstream.text();
      const respHeaders: Record<string, string> = {};
      upstream.headers.forEach((val, key) => {
        if (key.toLowerCase() === 'content-range' || key.toLowerCase() === 'content-type') {
          respHeaders[key] = val;
        }
      });
      return res.status(200).json({
        status: upstream.status,
        headers: respHeaders,
        body: text,
      });
    } catch (err: any) {
      return res.status(200).json({
        status: 503,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: err?.message || 'Upstream fetch error' }),
      });
    }
  });

  app.post('/api/auth/verify-role-login', async (req, res) => {
    const { identifier = '', password = '' } = req.body || {};
    const cleanId = String(identifier).trim();
    const rawUrl = (process.env.VITE_SUPABASE_URL || '').trim();
    let rawKey = (
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    ).trim();
    if (
      rawKey.startsWith('sb_publishable__A2zXL397Egt6QGqJB1NfQ_GdSEkig') &&
      rawKey.endsWith('fQ_GdSEkig')
    ) {
      rawKey = `${rawKey}H`;
    }

    if (!rawUrl || !rawKey || !cleanId) {
      return res.json({
        configured: false,
        tableRows: {},
        tableErrors: {},
      });
    }

    const sb = createClient(rawUrl, rawKey);
    const roleTables = [
      'admins',
      'hr_managers',
      'site_supervisors',
      'accountants',
      'employees',
      'labourers',
    ] as const;

    const tableRows: Record<string, any[]> = {};
    const tableErrors: Record<string, string> = {};

    // First try Supabase Auth signInWithPassword if identifier is a standard email
    let authUser: { id: string; email?: string } | null = null;
    if (cleanId.includes('@') && password) {
      const authRes = await sb.auth.signInWithPassword({
        email: cleanId,
        password,
      });
      if (authRes.data?.user) {
        authUser = {
          id: authRes.data.user.id,
          email: authRes.data.user.email,
        };
      }
    }

    await Promise.all(
      roleTables.map(async (tableName) => {
        const { data, error } = await sb
          .from(tableName)
          .select('*')
          .or(`work_email.ilike.${cleanId},user_id.ilike.${cleanId}`);

        if (error) {
          tableErrors[tableName] = `[${error.code}] ${error.message}`;
        } else if (data && data.length > 0) {
          tableRows[tableName] = data;
        }
      })
    );

    return res.json({
      configured: true,
      authUser,
      tableRows,
      tableErrors,
    });
  });

  app.post('/api/ai/workforce-insights', async (req, res) => {
    const {
      employees = [],
      labours = [],
      projects = [],
      sites = [],
      empAssignments = [],
      labourAssignments = [],
      attendance = [],
      tasks = [],
      leaves = [],
      salaries = [],
      materials = [],
      customQuery = '',
      focusQuery = '',
    } = req.body || {};

    const userQuery = customQuery || focusQuery || '';

    const snapshotSummary = {
      totalEmployees: employees.length,
      totalLabours: labours.length,
      employees: employees.map((e: any) => ({
        id: e.employee_id,
        name: e.name,
        designation: e.designation,
        status: e.status,
      })),
      labours: labours.map((l: any) => ({
        id: l.labour_id,
        name: l.name,
        skill: l.skill,
        wageRate: l.wage_rate,
        status: l.status,
      })),
      projects: projects.map((p: any) => ({
        id: p.project_id,
        name: p.project_name,
        location: p.location,
        budget: p.budget,
        status: p.status,
      })),
      sites: sites.map((s: any) => ({
        id: s.site_id,
        name: s.site_name,
        location: s.location,
        status: s.status,
      })),
      activeEmployeeAssignments: empAssignments.filter((a: any) => a.status === 'ACTIVE').length,
      activeLabourAssignments: labourAssignments.filter((a: any) => a.status === 'ACTIVE').length,
      attendanceBreakdown: {
        totalRecords: attendance.length,
        present: attendance.filter((a: any) => a.status === 'PRESENT').length,
        halfDay: attendance.filter((a: any) => a.status === 'HALF_DAY').length,
        absent: attendance.filter((a: any) => a.status === 'ABSENT').length,
        leave: attendance.filter((a: any) => a.status === 'LEAVE').length,
        totalHours: attendance.reduce((s: number, a: any) => s + Number(a.hours_worked || 0), 0),
      },
      tasksSummary: tasks.map((t: any) => ({
        name: t.task_name,
        status: t.status,
        endDate: t.end_date,
      })),
      pendingLeavesCount: leaves.filter((l: any) => l.status === 'PENDING').length,
      salarySummary: {
        totalNetSalary: salaries.reduce((s: number, r: any) => s + Number(r.net_salary || 0), 0),
        unpaidCount: salaries.filter((r: any) => r.payment_status !== 'PAID').length,
      },
      materialsStock: materials.map((m: any) => ({
        name: m.material_name,
        quantity: m.quantity,
        unit: m.unit,
        status: m.status,
      })),
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.json(buildLiveGroundedReport(snapshotSummary, userQuery));
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `
Analyze the following BuildMate Construction Labour & Workforce Operations dataset and generate an operational analysis.
STRICT RULE: Use ONLY the numbers, worker names, site names, tasks, and material stock quantities present in the JSON dataset below. Clearly label estimates and recommendations. Never fabricate project statistics.

Dataset Snapshot:
${JSON.stringify(snapshotSummary, null, 2)}

${
  userQuery
    ? `User Specific Focus Question: "${userQuery}"`
    : 'Provide a complete workforce & project summary, attendance trends, staffing shortages, delayed task analysis, and low-stock material risk assessment.'
}
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        executiveSummary: { type: Type.STRING },
        attendanceTrends: { type: Type.STRING },
        staffingShortages: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              siteName: { type: Type.STRING },
              issue: { type: Type.STRING },
              recommendation: { type: Type.STRING },
              priority: { type: Type.STRING },
            },
            required: ['siteName', 'issue', 'recommendation', 'priority'],
          },
        },
        delayedTasksAnalysis: { type: Type.STRING },
        materialStockRisks: { type: Type.STRING },
        customQueryAnswer: { type: Type.STRING },
      },
      required: [
        'executiveSummary',
        'attendanceTrends',
        'staffingShortages',
        'delayedTasksAnalysis',
        'materialStockRisks',
        'customQueryAnswer',
      ],
    };

    const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash'];
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              'You are a Senior Construction Operations & Workforce Analyst. Analyze only the provided JSON data from the application database. Do not fabricate any workers, sites, tasks, or numbers.',
            responseMimeType: 'application/json',
            responseSchema,
          },
        });

        const rawText = response.text || '';
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return res.json(parsed);
        }
      } catch (err: any) {
        // If model is experiencing temporary 503 high demand or rate limit, try next model or fallback
        console.warn(`Gemini model ${modelName} transient notice:`, err?.status || err?.message);
      }
    }

    // Graceful deterministic fallback computed directly from live database state
    return res.json(buildLiveGroundedReport(snapshotSummary, userQuery));
  });

  const distPath = path.join(__dirname, 'dist');
  const hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isDevLifecycle =
    process.env.npm_lifecycle_event === 'dev' ||
    process.env.NODE_ENV === 'development';
  const isProd =
    !isDevLifecycle &&
    (process.env.NODE_ENV === 'production' ||
      process.env.npm_lifecycle_event === 'start' ||
      hasBuiltDist);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BuildMate Server listening on http://localhost:${PORT}`);
  });
}

startServer();
