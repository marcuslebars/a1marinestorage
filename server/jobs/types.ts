export interface JobResult {
  /** How many records this run acted on. 0 is the healthy steady state. */
  processed: number;
  notes?: string;
}

export interface Job {
  name: string;
  run(): Promise<JobResult>;
}
