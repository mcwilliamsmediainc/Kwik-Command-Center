import { Router, type IRouter } from "express";

export interface Job {
  id: string;
  customer: string;
  service: string;
  amount: number | null;
  technician: string;
  status: string;
  receivedAt: string;
  raw: Record<string, unknown>;
}

const jobs: Job[] = [];

const router: IRouter = Router();

router.post("/webhooks/housecallpro", (req, res) => {
  const body = req.body as Record<string, unknown>;

  const job: Job = {
    id: String(body.id ?? body.job_id ?? `hcp-${Date.now()}`),
    customer: String(body.customer ?? body.customer_name ?? body.client ?? "Unknown"),
    service: String(body.service ?? body.service_type ?? body.job_type ?? ""),
    amount: body.amount != null ? Number(body.amount) : body.total != null ? Number(body.total) : null,
    technician: String(body.technician ?? body.tech ?? body.assigned_to ?? ""),
    status: String(body.status ?? body.job_status ?? "scheduled"),
    receivedAt: new Date().toISOString(),
    raw: body,
  };

  const existingIndex = jobs.findIndex((j) => j.id === job.id);
  if (existingIndex >= 0) {
    jobs[existingIndex] = job;
    req.log.info({ jobId: job.id }, "hcp webhook: job updated");
  } else {
    jobs.unshift(job);
    req.log.info({ jobId: job.id }, "hcp webhook: job created");
  }

  res.status(200).json({ ok: true, jobId: job.id });
});

router.get("/jobs", (_req, res) => {
  res.json({ jobs, total: jobs.length });
});

export default router;
