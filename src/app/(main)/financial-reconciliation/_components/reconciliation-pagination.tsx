"use client";

import { Button } from "@/components/ui/button";

type PageItem = number | "left-ellipsis" | "right-ellipsis";

interface ReconciliationPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function pageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, "right-ellipsis", totalPages];
  }

  if (page >= totalPages - 3) {
    return [1, "left-ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "left-ellipsis", page - 1, page, page + 1, "right-ellipsis", totalPages];
}

export function ReconciliationPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: ReconciliationPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const pages = pageItems(safePage, safeTotalPages);

  return (
    <div className="recon-pagination">
      <span>共 {total} 条，第 {safePage} / {safeTotalPages} 页</span>
      <nav className="recon-page-buttons" aria-label="分页">
        <Button size="sm" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
          上一页
        </Button>
        {pages.map((item) => {
          if (typeof item !== "number") {
            return (
              <span key={item} className="recon-page-ellipsis" aria-hidden="true">
                ...
              </span>
            );
          }

          return (
            <Button
              key={item}
              size="sm"
              variant={item === safePage ? "primary" : "default"}
              className="recon-page-number"
              aria-current={item === safePage ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          );
        })}
        <Button size="sm" disabled={safePage >= safeTotalPages} onClick={() => onPageChange(safePage + 1)}>
          下一页
        </Button>
      </nav>
    </div>
  );
}
