export class WorkflowEntrypoint<Env = unknown, Params = unknown> {
  env: Env;
  params!: Params;
  constructor(ctx: unknown, env: Env) {
    this.env = env;
  }
  run(_event: unknown, _step: unknown): Promise<unknown> {
    throw new Error("Mock run method not implemented");
  }
}
export interface WorkflowEvent<Params = unknown> {
  id: string;
  payload: Params;
}
export interface WorkflowStep {
  do: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
}
