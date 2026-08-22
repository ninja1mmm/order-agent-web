(function () {
  "use strict";

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function toast(message) {
    let node = document.querySelector("[data-toast]");
    if (!node) {
      node = document.createElement("div");
      node.className = "prototype-toast";
      node.dataset.toast = "";
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function () { node.classList.remove("show"); }, 2200);
  }

  function setWorkbenchView(view) {
    document.querySelectorAll("[data-workbench-panel]").forEach(function (panel) {
      panel.classList.toggle("active", panel.dataset.workbenchPanel === view);
    });
    document.querySelectorAll("[data-workbench-view]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.workbenchView === view);
      button.setAttribute("aria-pressed", String(button.dataset.workbenchView === view));
    });
  }

  document.querySelectorAll("[data-workbench-view]").forEach(function (button) {
    button.addEventListener("click", function () { setWorkbenchView(button.dataset.workbenchView); });
  });

  document.querySelectorAll("[data-mail-select]").forEach(function (button) {
    button.addEventListener("click", function () {
      const scope = button.closest("[data-mail-scope]") || document;
      scope.querySelectorAll("[data-mail-select]").forEach(function (item) {
        item.classList.toggle("selected", item === button);
      });
      const title = button.dataset.mailTitle;
      const date = button.dataset.mailDate;
      document.querySelectorAll("[data-selected-mail-title]").forEach(function (node) { node.textContent = title || node.textContent; });
      document.querySelectorAll("[data-selected-mail-date]").forEach(function (node) { node.textContent = date || node.textContent; });
      toast("已切换邮件上下文，附件状态与邮件内容同步更新。");
    });
  });

  document.querySelectorAll("[data-customer-select]").forEach(function (button) {
    button.addEventListener("click", function () {
      document.querySelectorAll("[data-customer-select]").forEach(function (item) {
        item.classList.toggle("selected", item === button);
      });
      const customer = button.dataset.customerName || "全部客户";
      document.querySelectorAll("[data-customer-context]").forEach(function (node) { node.textContent = customer; });
      toast("时间线已切换到 " + customer + "。");
    });
  });

  document.querySelectorAll("[data-detail-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      const value = button.dataset.detailTab;
      const root = button.closest("[data-detail-tabs-root]") || document;
      root.querySelectorAll("[data-detail-tab]").forEach(function (item) { item.classList.toggle("active", item === button); });
      root.querySelectorAll("[data-detail-panel]").forEach(function (panel) { panel.hidden = panel.dataset.detailPanel !== value; });
    });
  });

  function setReviewStep(step) {
    const total = document.querySelectorAll("[data-review-step]").length;
    const nextStep = Math.min(total, Math.max(1, Number(step)));
    document.querySelectorAll("[data-review-step]").forEach(function (item) {
      const value = Number(item.dataset.reviewStep);
      item.classList.toggle("active", value === nextStep);
      item.classList.toggle("done", value < nextStep);
      item.setAttribute("aria-current", value === nextStep ? "step" : "false");
      const index = item.querySelector(".step-index");
      if (index) index.textContent = value < nextStep ? "✓" : String(value);
    });
    document.querySelectorAll("[data-step-panel]").forEach(function (panel) {
      panel.classList.toggle("active", Number(panel.dataset.stepPanel) === nextStep);
    });
    document.querySelectorAll("[data-preview-panel]").forEach(function (panel) {
      panel.classList.toggle("active", Number(panel.dataset.previewPanel) === nextStep);
    });
    document.querySelectorAll("[data-current-step-label]").forEach(function (node) {
      const active = document.querySelector('[data-review-step="' + nextStep + '"] .step-copy strong');
      node.textContent = active ? active.textContent : "";
    });
    const editBody = document.querySelector(".edit-panel .panel-body");
    const previewBody = document.querySelector(".preview-panel .panel-body");
    if (editBody) editBody.scrollTop = 0;
    if (previewBody) previewBody.scrollTop = 0;
    refreshIcons();
  }

  document.querySelectorAll("[data-review-step]").forEach(function (button) {
    button.addEventListener("click", function () { setReviewStep(button.dataset.reviewStep); });
  });
  document.querySelectorAll("[data-next-step]").forEach(function (button) {
    button.addEventListener("click", function () { setReviewStep(button.dataset.nextStep); });
  });
  document.querySelectorAll("[data-prev-step]").forEach(function (button) {
    button.addEventListener("click", function () { setReviewStep(button.dataset.prevStep); });
  });

  document.querySelectorAll("[data-sheet-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      document.querySelectorAll("[data-sheet-tab]").forEach(function (item) { item.classList.toggle("active", item === button); });
      toast("已切换到 Sheet：" + button.textContent.trim());
    });
  });

  document.querySelectorAll("[data-reparse-source]").forEach(function (button) {
    button.addEventListener("click", function () {
      const original = button.innerHTML;
      button.disabled = true;
      button.textContent = "解析中…";
      window.setTimeout(function () {
        button.disabled = false;
        button.innerHTML = original;
        refreshIcons();
        toast("新 Sheet 已重新解析，生成了独立草稿版本 v4。");
      }, 900);
    });
  });

  document.querySelectorAll("[data-date-apply]").forEach(function (button) {
    button.addEventListener("click", function () {
      document.querySelectorAll("[data-normalized-date]").forEach(function (cell, index) {
        const dates = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27"];
        cell.textContent = dates[index % dates.length];
        cell.classList.add("changed");
      });
      toast("已将收货日期按运输提前期批量转换为发运日期。");
    });
  });

  function recalculateQuantity(row) {
    const current = Number(row.dataset.current || 0);
    const extracted = Number(row.dataset.extracted || 0);
    const select = row.querySelector("[data-quantity-strategy]");
    const strategy = select ? select.value : "replace";
    let result = extracted;
    let delta = extracted - current;
    if (strategy === "increment") { result = current + extracted; delta = extracted; }
    if (strategy === "decrement") { result = Math.max(0, current - extracted); delta = result - current; }
    row.querySelectorAll("[data-after-quantity]").forEach(function (cell) { cell.textContent = result.toLocaleString("zh-CN"); });
    row.querySelectorAll("[data-delta-quantity]").forEach(function (cell) {
      cell.textContent = (delta > 0 ? "+" : "") + delta.toLocaleString("zh-CN");
      cell.classList.toggle("positive", delta > 0);
      cell.classList.toggle("negative", delta < 0);
    });
  }

  document.querySelectorAll("[data-quantity-row]").forEach(function (row) {
    recalculateQuantity(row);
    const select = row.querySelector("[data-quantity-strategy]");
    if (select) select.addEventListener("change", function () { recalculateQuantity(row); });
  });

  document.querySelectorAll("[data-apply-strategy]").forEach(function (button) {
    button.addEventListener("click", function () {
      const value = button.dataset.applyStrategy;
      document.querySelectorAll("[data-quantity-strategy]").forEach(function (select) {
        select.value = value;
        recalculateQuantity(select.closest("[data-quantity-row]"));
      });
      toast("已批量应用数量合并策略。");
    });
  });

  document.querySelectorAll("[data-open-modal]").forEach(function (button) {
    button.addEventListener("click", function () {
      const modal = document.querySelector(button.dataset.openModal);
      if (modal) modal.classList.add("open");
    });
  });
  document.querySelectorAll("[data-close-modal]").forEach(function (button) {
    button.addEventListener("click", function () {
      const modal = button.closest(".modal-backdrop");
      if (modal) modal.classList.remove("open");
    });
  });
  document.querySelectorAll(".modal-backdrop").forEach(function (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) modal.classList.remove("open");
    });
  });

  document.querySelectorAll("[data-confirm-merge]").forEach(function (button) {
    button.addEventListener("click", function () {
      const modal = button.closest(".modal-backdrop");
      button.disabled = true;
      button.textContent = "合并中…";
      window.setTimeout(function () {
        if (modal) modal.classList.remove("open");
        button.disabled = false;
        button.textContent = "确认合并";
        setReviewStep(6);
        toast("邮件解析结果已作为一个 changeset 合并到 Orders。");
      }, 850);
    });
  });

  document.querySelectorAll("[data-demo-action]").forEach(function (button) {
    button.addEventListener("click", function () { toast(button.dataset.demoAction); });
  });

  const query = new URLSearchParams(window.location.search);
  if (query.get("view") === "customer") {
    setWorkbenchView("customer");
  }
  const initialReviewStep = Number(query.get("step"));
  if (initialReviewStep >= 1 && initialReviewStep <= 6) {
    setReviewStep(initialReviewStep);
  }
  if (query.get("attachment")) {
    window.setTimeout(function () { toast("已从附件卡片进入，并聚焦：" + query.get("attachment")); }, 350);
  }

  refreshIcons();
})();
