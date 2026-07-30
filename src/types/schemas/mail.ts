export type ProcessMailResponseSchema = {
  tasks: Array<{ taskId: string; status: string; taskType: string }>;
};
