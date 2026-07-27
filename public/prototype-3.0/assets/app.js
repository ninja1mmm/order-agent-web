function initPrototype() {
  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function showToast(message) {
    let toast = document.querySelector("[data-prototype-toast]");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "prototype-toast";
      toast.dataset.prototypeToast = "";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function switchReconTab(tab) {
    document.querySelectorAll("[data-recon-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.reconPanel === tab);
    });
    document.querySelectorAll(".recon-tabs [data-recon-tab]").forEach((item) => {
      item.classList.toggle("active", item.dataset.reconTab === tab);
    });
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }

  document.querySelectorAll("[data-open]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const target = document.querySelector(trigger.dataset.open);
      if (target) target.classList.add("open");
    });
  });

  document.querySelectorAll("[data-close]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const target = trigger.closest(".modal-backdrop, .sheet-backdrop");
      if (target) target.classList.remove("open");
    });
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open]");
    if (!trigger) return;
    const target = document.querySelector(trigger.dataset.open);
    if (target) target.classList.add("open");
    event.stopPropagation();
  });

  document.querySelectorAll("[data-order-view]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const view = trigger.dataset.orderView;
      document.querySelectorAll("[data-order-table]").forEach((table) => {
        table.style.display = table.dataset.orderTable === view ? "block" : "none";
      });
      document.querySelectorAll("[data-order-view]").forEach((button) => {
        button.classList.toggle("primary", button === trigger);
      });
    });
  });

  document.querySelectorAll("[data-order-tab]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const tab = trigger.dataset.orderTab;
      document.querySelectorAll("[data-order-section]").forEach((section) => {
        section.style.display = section.dataset.orderSection === tab ? "block" : "none";
      });
      document.querySelectorAll("[data-order-tab]").forEach((item) => {
        item.classList.toggle("active", item === trigger);
      });
    });
  });

  document.querySelectorAll("[data-skill-tab]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const tab = trigger.dataset.skillTab;
      document.querySelectorAll("[data-skill-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.skillPanel === tab);
      });
      document.querySelectorAll("[data-skill-tab]").forEach((item) => {
        item.classList.toggle("active", item === trigger);
      });
    });
  });

  document.querySelectorAll("[data-profile-tab]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const tab = trigger.dataset.profileTab;
      document.querySelectorAll("[data-profile-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.profilePanel === tab);
      });
      document.querySelectorAll("[data-profile-tab]").forEach((item) => {
        item.classList.toggle("active", item === trigger);
      });
    });
  });

  document.querySelectorAll("[data-profile-mode]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      document.querySelectorAll("[data-profile-mode]").forEach((button) => {
        button.classList.toggle("primary", button === trigger);
      });
      const mode = trigger.dataset.profileMode;
      document.querySelectorAll("[data-profile-mode-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.profileModePanel === mode);
      });
    });
  });

  document.querySelectorAll("[data-profile-view-toggle]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const modePanel = trigger.closest("[data-profile-mode-panel]");
      const scope = modePanel ?? document;
      scope.querySelectorAll("[data-profile-heatmap]").forEach((grid) => {
        grid.classList.toggle("compact");
      });
      const compact = scope.querySelector("[data-profile-heatmap]")?.classList.contains("compact");
      if (compact) {
        trigger.innerHTML = '<i data-lucide="panel-top-open"></i>';
      } else {
        trigger.innerHTML = '<i data-lucide="panel-top-close"></i>';
      }
      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
  });

  document.querySelectorAll("[data-recon-tab]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      switchReconTab(trigger.dataset.reconTab);
    });
  });

  function markReconGenerated(isRerun = false) {
    const board = document.querySelector("[data-recon-board]");
    if (board) {
      board.classList.add("matching-active", "reconciled");
    }
    document.querySelectorAll(".btn[data-recon-start]").forEach((button) => {
      button.classList.add("primary");
      button.innerHTML = `<i data-lucide="check-circle-2"></i>${isRerun ? "重新对帐已完成" : "对帐结果已生成"}`;
    });
    document.querySelectorAll(".icon-link[data-recon-start], .icon-link[data-recon-rerun]").forEach((button) => {
      button.innerHTML = '<i data-lucide="check-circle-2"></i>';
      button.setAttribute("aria-label", isRerun ? "重新对帐已完成" : "对帐结果已生成");
    });
    refreshIcons();
    showToast(isRerun ? "已基于最新发运/收货数据重新生成对帐结果。" : "已生成对帐结果，可继续人工确认和预更新。");
  }

  document.querySelectorAll("[data-recon-start]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      switchReconTab("detail");
      markReconGenerated(false);
    });
  });

  document.querySelectorAll("[data-recon-rerun]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      switchReconTab("detail");
      markReconGenerated(true);
    });
  });

  function updateRecordFooter(type, totalDelta = 0) {
    const table = document.querySelector(`[data-record-table="${type}"]`);
    const footerText = table?.closest(".panel")?.querySelector(".table-footer > span");
    if (!table || !footerText) return;
    const visibleRows = table.querySelectorAll("tbody tr").length;
    const currentTotal = Number(footerText.textContent.match(/\/\s*(\d+)/)?.[1] ?? visibleRows);
    const nextTotal = Math.max(visibleRows, currentTotal + totalDelta);
    footerText.textContent = `显示 1-${visibleRows} / ${nextTotal}`;
  }

  function syncSelectAll(type) {
    const table = document.querySelector(`[data-record-table="${type}"]`);
    const selectAll = document.querySelector(`[data-select-all="${type}"]`);
    if (!table || !selectAll) return;
    const rowChecks = Array.from(table.querySelectorAll("tbody [data-row-select]"));
    const selectedCount = rowChecks.filter((checkbox) => checkbox.checked).length;
    selectAll.checked = rowChecks.length > 0 && selectedCount === rowChecks.length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < rowChecks.length;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;",
    })[char]);
  }

  function createRecordRow(type, values) {
    const editSheet = type === "shipment" ? "#shipmentEditSheet" : "#receiptEditSheet";
    const typeLabel = type === "shipment" ? "发运" : "收货";
    const safe = (value) => escapeHtml(value?.trim() || "-");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" data-row-select aria-label="选择${typeLabel}记录 ${safe(values.material)}"></td>
      <td>${safe(values.date)}</td>
      <td>${safe(values.material)}</td>
      <td>${safe(values.qty)}</td>
      <td>0</td>
      <td><span class="invoice-pill open">未对帐</span></td>
      <td>${safe(values.delivery)}</td>
      <td>${safe(values.request)}</td>
      <td>手工新增</td>
      <td>
        <div class="row-actions">
          <button class="icon-link" data-open="${editSheet}" aria-label="编辑${typeLabel}记录 ${safe(values.material)}"><i data-lucide="pencil"></i></button>
          <button class="icon-link danger" data-delete-row aria-label="删除${typeLabel}记录 ${safe(values.material)}"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    `;
    return row;
  }

  document.querySelectorAll("[data-create-record]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const type = trigger.dataset.createRecord;
      const sheet = trigger.closest(".sheet-backdrop");
      const values = {};
      sheet?.querySelectorAll("[data-create-field]").forEach((field) => {
        values[field.dataset.createField] = field.value;
      });
      if (!values.date?.trim() || !values.material?.trim() || !values.qty?.trim()) {
        showToast("请先填写日期、物料和数量。");
        return;
      }
      const tableBody = document.querySelector(`[data-record-table="${type}"] tbody`);
      tableBody?.prepend(createRecordRow(type, values));
      sheet?.classList.remove("open");
      updateRecordFooter(type, 1);
      syncSelectAll(type);
      refreshIcons();
      showToast(type === "shipment" ? "发运记录已手工新增，可返回任务中心重新对帐。" : "收货记录已手工新增，可返回任务中心重新对帐。");
    });
  });

  document.querySelectorAll("[data-select-all]").forEach((trigger) => {
    trigger.addEventListener("change", () => {
      const table = document.querySelector(`[data-record-table="${trigger.dataset.selectAll}"]`);
      table?.querySelectorAll("tbody [data-row-select]").forEach((checkbox) => {
        checkbox.checked = trigger.checked;
      });
      trigger.indeterminate = false;
    });
  });

  document.querySelectorAll("[data-record-table]").forEach((table) => {
    table.addEventListener("change", (event) => {
      if (!event.target.matches("[data-row-select]")) return;
      syncSelectAll(table.dataset.recordTable);
    });
  });

  document.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-row]");
    if (!deleteButton) return;
    const row = deleteButton.closest("tr");
    const table = deleteButton.closest("[data-record-table]");
    if (!row || !table) return;
    if (!window.confirm("确认删除这条记录？删除后需要重新对帐才能反映最新数据。")) return;
    row.remove();
    updateRecordFooter(table.dataset.recordTable, -1);
    syncSelectAll(table.dataset.recordTable);
    showToast("记录已删除，请在任务中心重新对帐。");
  });

  document.querySelectorAll("[data-bulk-delete]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const type = trigger.dataset.bulkDelete;
      const table = document.querySelector(`[data-record-table="${type}"]`);
      const selectedRows = Array.from(table?.querySelectorAll("tbody [data-row-select]:checked") ?? [])
        .map((checkbox) => checkbox.closest("tr"))
        .filter(Boolean);
      if (!selectedRows.length) {
        showToast("请先选择要删除的记录。");
        return;
      }
      if (!window.confirm(`确认删除选中的 ${selectedRows.length} 条记录？`)) return;
      selectedRows.forEach((row) => row.remove());
      updateRecordFooter(type, -selectedRows.length);
      syncSelectAll(type);
      showToast(`已删除 ${selectedRows.length} 条记录，请重新对帐。`);
    });
  });

  document.querySelectorAll("[data-wizard]").forEach((wizard) => {
    const steps = Array.from(wizard.querySelectorAll("[data-wizard-step]"));
    const panels = Array.from(wizard.querySelectorAll("[data-wizard-panel]"));
    const prev = wizard.querySelector("[data-wizard-prev]");
    const next = wizard.querySelector("[data-wizard-next]");
    let currentStep = Number(wizard.querySelector("[data-wizard-step].active")?.dataset.wizardStep ?? 1);
    const nextLabels = {
      1: "完成处理，生成预览",
      2: "确认无误，保存并执行更新",
      3: "返回任务大厅",
    };
    const totalSteps = steps.length;

    function showStep(step) {
      currentStep = Math.min(totalSteps, Math.max(1, step));
      steps.forEach((item) => item.classList.toggle("active", Number(item.dataset.wizardStep) === currentStep));
      panels.forEach((panel) => panel.classList.toggle("active", Number(panel.dataset.wizardPanel) === currentStep));
      if (prev) prev.disabled = currentStep === 1;
      if (next) {
        next.innerHTML = `${nextLabels[currentStep]}<i data-lucide="${currentStep === totalSteps ? "clipboard-list" : "chevron-right"}"></i>`;
      }
      if (window.lucide) window.lucide.createIcons();
    }

    steps.forEach((item) => {
      item.addEventListener("click", () => showStep(Number(item.dataset.wizardStep)));
    });
    prev?.addEventListener("click", () => showStep(currentStep - 1));
    next?.addEventListener("click", () => {
      if (currentStep === totalSteps) {
        document.querySelector('[data-recon-tab="history"]')?.click();
        showStep(1);
      } else {
        showStep(currentStep + 1);
      }
    });

    const matchFilters = Array.from(wizard.querySelectorAll("[data-match-filter]"));
    const matchItems = Array.from(wizard.querySelectorAll("[data-match-status]"));
    function showMatchFilter(filter) {
      matchFilters.forEach((button) => {
        button.classList.toggle("active", button.dataset.matchFilter === filter);
      });
      matchItems.forEach((item) => {
        const isVisible = filter === "all" || item.dataset.matchStatus === filter;
        item.classList.toggle("is-hidden", !isVisible);
        item.open = false;
      });
      const firstVisible = matchItems.find((item) => !item.classList.contains("is-hidden"));
      if (firstVisible) firstVisible.open = true;
    }
    matchFilters.forEach((button) => {
      button.addEventListener("click", () => showMatchFilter(button.dataset.matchFilter));
    });

    wizard.querySelectorAll("[data-detail-edit]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const row = button.closest("tr");
        if (!row) return;
        const inputs = Array.from(row.querySelectorAll(".wizard-cell-input"));
        const isEditing = row.classList.contains("editing");
        row.classList.toggle("editing", !isEditing);
        button.classList.toggle("is-active", !isEditing);
        if (isEditing) {
          inputs.forEach((input) => input.setAttribute("readonly", ""));
          button.innerHTML = '<i data-lucide="pencil"></i>';
          button.setAttribute("aria-label", button.getAttribute("aria-label")?.replace("保存", "编辑") ?? "编辑明细");
          showToast("明细已更新。");
        } else {
          inputs.forEach((input) => input.removeAttribute("readonly"));
          button.innerHTML = '<i data-lucide="check"></i>';
          button.setAttribute("aria-label", button.getAttribute("aria-label")?.replace("编辑", "保存") ?? "保存明细");
          inputs[0]?.focus();
          inputs[0]?.select?.();
        }
        refreshIcons();
      });
    });

    showMatchFilter(wizard.querySelector("[data-match-filter].active")?.dataset.matchFilter ?? "all");
    showStep(currentStep);
  });

  document.querySelectorAll("[data-parse-upload]").forEach((trigger) => {
    let parseTimer;
    trigger.addEventListener("click", () => {
      const scope = trigger.closest("[data-recon-panel], .modal, .sheet") ?? document;
      const panel = scope.querySelector("[data-analysis-panel]");
      const status = scope.querySelector("[data-analysis-status]");
      const badge = scope.querySelector("[data-analysis-badge]");
      const confirmButton = scope.querySelector("[data-confirm-create]");
      const steps = scope.querySelectorAll("[data-analysis-step]");

      window.clearTimeout(parseTimer);
      panel?.classList.remove("is-complete");
      panel?.classList.add("is-running");
      steps.forEach((step) => step.classList.remove("done"));
      if (status) status.textContent = "正在解析当前上传文件，校验模板字段、客户范围、日期窗口和业务键。";
      if (badge) {
        badge.textContent = "解析中";
        badge.className = "badge blue";
      }
      if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.classList.remove("primary");
      }
      trigger.innerHTML = '<i data-lucide="loader-circle"></i>解析中';
      if (window.lucide) {
        window.lucide.createIcons();
      }

      parseTimer = window.setTimeout(() => {
        panel?.classList.remove("is-running");
        panel?.classList.add("is-complete");
        steps.forEach((step) => step.classList.add("done"));
        if (status) status.textContent = "解析完成。冲突数据仍停留在入池前结果，处理后可提交到正式业务池。";
        if (badge) {
          badge.textContent = "已解析";
          badge.className = "badge green";
        }
        if (confirmButton) {
          confirmButton.disabled = false;
          confirmButton.classList.add("primary");
        }
        trigger.innerHTML = '<i data-lucide="rotate-cw"></i>重新解析';
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }, 1100);
    });
  });

  document.querySelectorAll("[data-history-tab]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const tab = trigger.dataset.historyTab;
      const scope = trigger.closest(".history-section") ?? document;
      scope.querySelectorAll("[data-history-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.historyPanel === tab);
      });
      scope.querySelectorAll("[data-history-tab]").forEach((item) => {
        item.classList.toggle("active", item === trigger);
      });
    });
  });

  document.querySelectorAll("[data-file-tab]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const tab = trigger.dataset.fileTab;
      const scope = trigger.closest(".file-preview") ?? document;
      scope.querySelectorAll("[data-file-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.filePanel === tab);
      });
      scope.querySelectorAll("[data-file-tab]").forEach((item) => {
        item.classList.toggle("active", item === trigger);
      });
    });
  });

  document.querySelectorAll("[data-prep-tab]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const tab = trigger.dataset.prepTab;
      const scope = trigger.closest(".panel-body") ?? document;
      scope.querySelectorAll("[data-prep-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.prepPanel === tab);
      });
      scope.querySelectorAll("[data-prep-tab]").forEach((item) => {
        item.classList.toggle("active", item === trigger);
      });
    });
  });

  document.querySelectorAll("[data-service-mail-view]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const view = trigger.dataset.serviceMailView;
      document.querySelectorAll("[data-service-mail-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.serviceMailPanel === view);
      });
      document.querySelectorAll("[data-service-mail-view]").forEach((button) => {
        button.classList.toggle("primary", button === trigger);
      });
    });
  });

  document.querySelectorAll("[data-settings-section]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const section = trigger.dataset.settingsSection;
      document.querySelectorAll("[data-settings-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.settingsPanel === section);
      });
      document.querySelectorAll("[data-settings-section]").forEach((item) => {
        item.classList.toggle("selected", item === trigger);
      });
    });
  });

  document.querySelectorAll("[data-customer-config-tab]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const tab = trigger.dataset.customerConfigTab;
      document.querySelectorAll("[data-customer-config-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.customerConfigPanel === tab);
      });
      document.querySelectorAll("[data-customer-config-tab]").forEach((item) => {
        item.classList.toggle("active", item === trigger);
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", initPrototype);
