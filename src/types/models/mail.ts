export type ProcessMailResponse = {
  tasks: Array<{ taskId: string; status: string; taskType: string }>;
};
