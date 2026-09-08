import { SkillRunPage } from "./skill-run-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return <SkillRunPage runId={runId} />;
}
