export interface MindmapNode {
  id: string;
  parentId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  label: string | null;
  createdAt: string;
  metadata: {
    provider: string;
    model: string;
    temperature: number;
    tokenCount: number;
    toolsCalled: string[] | null;
  } | null;
}
