import { notFound } from "next/navigation";
import { phaseOnePages } from "../../config/navigation.mjs";
import { SectionContent } from "./section-content";

export const dynamic = "force-dynamic";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = phaseOnePages.find((candidate: { productionPath: string }) => candidate.productionPath === `/${section}`);
  if (!page) notFound();
  return <SectionContent section={section} />;
}
