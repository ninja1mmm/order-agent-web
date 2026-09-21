import type { InlineImage } from "@/types/models/inbox";

function normalizeContentId(value: string): string {
  let normalized = value.trim();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep the original value when the CID contains an invalid escape sequence.
  }
  return normalized.replace(/^cid:/i, "").replace(/^<|>$/g, "").trim().toLowerCase();
}

export function replaceInlineImageCids(
  html: string,
  inlineImages: InlineImage[],
  backendUrl: string,
): string {
  const cidMap = new Map<string, string>();
  for (const image of inlineImages) {
    if (!image.contentId) continue;
    cidMap.set(
      normalizeContentId(image.contentId),
      `${backendUrl}/api/files/${encodeURIComponent(image.fileArtifactId)}/content`,
    );
  }

  return html.replace(/(\bsrc\s*=\s*)(["'])cid:([^"']+)\2/gi, (match, prefix: string, quote: string, cid: string) => {
    const url = cidMap.get(normalizeContentId(cid));
    return url ? `${prefix}${quote}${url}${quote}` : match;
  });
}

export function stripInlineImageCidPlaceholders(text: string, inlineImages: InlineImage[]): string {
  const knownContentIds = new Set(
    inlineImages
      .map((image) => image.contentId)
      .filter((contentId): contentId is string => Boolean(contentId))
      .map(normalizeContentId),
  );

  return text.replace(/\[cid:([^\]]+)]/gi, (match, cid: string) => (
    knownContentIds.has(normalizeContentId(cid)) ? "" : match
  ));
}
