import { notFound } from "next/navigation";
import { phaseOnePages } from "../../config/navigation.mjs";
import { SectionContent } from "./section-content";

export function generateStaticParams() {
  return phaseOnePages.map((page: { productionPath: string }) => ({ section: page.productionPath.slice(1) }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = phaseOnePages.find((candidate: { productionPath: string }) => candidate.productionPath === `/${section}`);
  if (!page) notFound();
  return <SectionContent section={section} />;
}
