(function () {
  "use strict";

  var currentStep = 1;
  var currentSource = "shipping";
  var generatedTaskNumber = 1048;

  var sourceMeta = {
    body: { label: "Email Body", file: "邮件正文", taskId: "T-1039", status: "正文解析已完成", mode: "readonly" },
    shipping: { label: "Shipping Plan", file: "15WK35-无锡佛吉亚提货计划.xlsx", taskId: "T-1042", status: "待核对物料", mode: "review" },
    forecast: { label: "Forecast", file: "15WK35-无锡佛吉亚提货计划.xlsx", taskId: null, status: "浏览来源" },
    summary: { label: "Summary", file: "15WK35-无锡佛吉亚提货计划.xlsx", taskId: null, status: "浏览来源" },
    pdf: { label: "W35 Delivery Note.pdf", file: "W35 Delivery Note.pdf", taskId: "T-1041", status: "等待 Merge", mode: "readonly" }
  };

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function toast(message) {
    var node = document.querySelector("[data-toast]");
    if (!node) {
      node = document.createElement("div");
      node.className = "prototype-toast";
      node.dataset.toast = "";
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function () { node.classList.remove("show"); }, 2300);
  }

  function setTaskContext(taskId, source, status) {
    document.querySelectorAll("[data-active-task-id]").forEach(function (node) { node.textContent = taskId || "—"; });
    document.querySelectorAll("[data-active-source-label]").forEach(function (node) { node.textContent = sourceMeta[source].label; });
    var badge = document.querySelector("[data-task-status]");
    if (badge) {
      badge.innerHTML = '<span class="dot"></span>' + (status || sourceMeta[source].status);
      badge.className = "badge " + (taskId ? (status && status.indexOf("解析中") >= 0 ? "primary" : "warning") : "info");
    }
  }

  function updateEditStage(source) {
    var meta = sourceMeta[source];
    var target = meta.mode === "review" ? String(currentStep) : meta.mode === "readonly" ? "readonly" : meta.status === "解析中" ? "processing" : "empty";
    document.querySelectorAll("[data-edit-stage]").forEach(function (stage) {
      stage.classList.toggle("active", stage.dataset.editStage === target);
    });
    document.querySelector(".step-bar")?.classList.toggle("locked", meta.mode !== "review");
  }

  function showSource(source, options) {
    if (!sourceMeta[source]) return;
    currentSource = source;
    var settings = options || {};
    document.querySelectorAll("[data-source-content]").forEach(function (node) {
      node.classList.toggle("active", node.dataset.sourceContent === source);
    });
    document.querySelectorAll("[data-source-select]").forEach(function (node) {
      node.classList.toggle("selected", node.dataset.sourceSelect === source);
    });
    document.querySelectorAll("[data-sheet-tab]").forEach(function (node) {
      node.classList.toggle("active", node.dataset.sheetTab === source);
    });
    var file = document.querySelector("[data-source-file]");
    var label = document.querySelector("[data-source-label-inline]");
    if (file) file.textContent = sourceMeta[source].file;
    if (label) label.textContent = sourceMeta[source].label;

    var createButton = document.querySelector("[data-create-task]");
    if (createButton) {
      createButton.dataset.source = source;
      var span = createButton.querySelector("span");
      if (sourceMeta[source].taskId) {
        createButton.disabled = true;
        if (span) span.textContent = "已有解析任务";
      } else {
        createButton.disabled = false;
        if (span) span.textContent = "新增解析此 Sheet";
      }
      createButton.classList.toggle("primary", !sourceMeta[source].taskId);
    }

    if (settings.taskId || settings.keepTask) {
      if (settings.taskId) setTaskContext(settings.taskId, source, settings.status);
    } else {
      setTaskContext(sourceMeta[source].taskId, source);
      document.querySelectorAll("[data-task-select]").forEach(function (node) {
        node.classList.toggle("selected", node.dataset.taskId === sourceMeta[source].taskId);
      });
    }
    updateEditStage(source);
  }

  function setStep(step) {
    var next = Math.max(1, Math.min(4, Number(step) || 1));
    if (sourceMeta[currentSource].mode !== "review") {
      toast(sourceMeta[currentSource].status === "解析中" ? "当前 Task 仍在解析，完成后才能进入审查步骤。" : "请先选择一个可审查的独立 Task。");
      return;
    }
    currentStep = next;
    document.querySelectorAll("[data-review-step]").forEach(function (button) {
      var value = Number(button.dataset.reviewStep);
      button.classList.toggle("active", value === next);
      button.classList.toggle("done", value < next);
      button.setAttribute("aria-current", value === next ? "step" : "false");
      var index = button.querySelector(".step-index");
      if (index) index.textContent = value < next ? "✓" : String(value);
    });
    if (next < 4) updateEditStage(currentSource);
    document.querySelectorAll("[data-step-page]").forEach(function (page) {
      var target = next === 4 ? "orders" : "edit";
      page.classList.toggle("active", page.dataset.stepPage === target);
    });
    refreshIcons();
  }

  document.querySelectorAll("[data-source-select]").forEach(function (button) {
    button.addEventListener("click", function () { showSource(button.dataset.sourceSelect); });
  });

  document.querySelectorAll("[data-sheet-tab]").forEach(function (button) {
    button.addEventListener("click", function () { showSource(button.dataset.sheetTab); });
  });

  document.querySelectorAll("[data-task-select]").forEach(function (button) {
    button.addEventListener("click", function () {
      document.querySelectorAll("[data-task-select]").forEach(function (node) { node.classList.toggle("selected", node === button); });
      showSource(button.dataset.taskSource, { taskId: button.dataset.taskId, status: button.dataset.taskStatus });
      if (button.dataset.taskStatus === "解析中") toast("该 Task 正在独立解析，完成后进入物料核对。");
      else toast("已切换到 Task " + button.dataset.taskId + "。");
    });
  });

  document.querySelectorAll("[data-branch-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      var branch = document.getElementById(button.dataset.branchToggle);
      if (!branch) return;
      var expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      branch.classList.toggle("hidden", expanded);
      var icon = button.querySelector("svg:last-child");
      if (icon) icon.style.transform = expanded ? "rotate(-90deg)" : "rotate(0deg)";
    });
  });

  var createTaskButton = document.querySelector("[data-create-task]");
  if (createTaskButton) {
    createTaskButton.addEventListener("click", function () {
      var source = createTaskButton.dataset.source;
      if (!source || sourceMeta[source].taskId) return;
      var original = createTaskButton.innerHTML;
      createTaskButton.disabled = true;
      createTaskButton.textContent = "创建中…";
      window.setTimeout(function () {
        var taskId = "T-" + generatedTaskNumber++;
        sourceMeta[source].taskId = taskId;
        sourceMeta[source].status = "解析中";
        sourceMeta[source].mode = "processing";
        var slot = document.querySelector('[data-task-slot="' + source + '"]');
        if (slot) {
          var taskButton = document.createElement("button");
          taskButton.className = "tree-task";
          taskButton.dataset.taskSelect = taskId;
          taskButton.dataset.taskId = taskId;
          taskButton.dataset.taskSource = source;
          taskButton.dataset.sourceLabel = sourceMeta[source].label;
          taskButton.dataset.taskStatus = "解析中";
          taskButton.innerHTML = '<i data-lucide="loader-circle"></i><span class="tree-copy"><span class="task-id">Task ' + taskId + '</span><span class="task-state running"><span class="dot"></span>AI 提取中 · 独立 Task</span></span>';
          taskButton.addEventListener("click", function () {
            document.querySelectorAll("[data-task-select]").forEach(function (node) { node.classList.toggle("selected", node === taskButton); });
            showSource(source, { taskId: taskId, status: "解析中" });
            toast("该 Task 正在独立解析，完成后进入物料核对。");
          });
          slot.replaceWith(taskButton);
          document.querySelectorAll("[data-task-select]").forEach(function (node) { node.classList.toggle("selected", node === taskButton); });
        }
        var taskCount = document.querySelector(".tree-head .badge");
        if (taskCount) taskCount.textContent = "5 Tasks";
        createTaskButton.innerHTML = original;
        var label = createTaskButton.querySelector("span");
        if (label) label.textContent = "解析任务已创建";
        createTaskButton.disabled = true;
        setTaskContext(taskId, source, "解析中");
        updateEditStage(source);
        refreshIcons();
        toast(sourceMeta[source].label + " 已创建独立解析任务 " + taskId + "。Task 将挂载在该 Sheet 下。 ");
      }, 850);
    });
  }

  document.querySelectorAll("[data-review-step]").forEach(function (button) {
    button.addEventListener("click", function () { setStep(button.dataset.reviewStep); });
  });
  document.querySelectorAll("[data-next-step]").forEach(function (button) {
    button.addEventListener("click", function () { setStep(button.dataset.nextStep); });
  });
  document.querySelectorAll("[data-prev-step]").forEach(function (button) {
    button.addEventListener("click", function () { setStep(button.dataset.prevStep); });
  });

  var previewToggle = document.querySelector("[data-toggle-preview]");
  if (previewToggle) {
    previewToggle.addEventListener("click", function () {
      var workspace = document.querySelector("[data-vertical-workspace]");
      if (!workspace) return;
      var collapsed = workspace.classList.toggle("preview-collapsed");
      var label = previewToggle.querySelector("span");
      if (label) label.textContent = collapsed ? "展开来源" : "收起来源";
      var icon = previewToggle.querySelector("svg");
      if (icon) icon.setAttribute("data-lucide", collapsed ? "panel-top-open" : "panel-top-close");
      refreshIcons();
    });
  }

  function isoWeek(value) {
    var date = new Date(value + "T00:00:00Z");
    if (Number.isNaN(date.getTime())) return "—";
    var day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    var week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return date.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
  }

  function updateWeek(rowKey, value) {
    document.querySelectorAll('[data-row-key="' + rowKey + '"] [data-derived-week]').forEach(function (cell) {
      cell.textContent = isoWeek(value);
    });
  }

  function syncField(source) {
    var row = source.closest("[data-row-key]");
    if (!row) return;
    var rowKey = row.dataset.rowKey;
    var field = source.dataset.field;
    document.querySelectorAll('[data-row-key="' + rowKey + '"] [data-field="' + field + '"]').forEach(function (target) {
      if (target !== source) target.value = source.value;
    });
    if (field === "date_info") updateWeek(rowKey, source.value);
  }

  document.querySelectorAll("[data-field]").forEach(function (field) {
    field.addEventListener("change", function () { syncField(field); });
  });

  function paintOrderType(button, type) {
    button.dataset.orderType = type;
    var options = button.querySelectorAll(".order-type-option");
    options[0]?.classList.toggle("active-confirmed", type === "confirmed");
    options[1]?.classList.toggle("active-forecast", type === "forecast");
  }

  function refreshOrderTypeHeaders() {
    document.querySelectorAll(".result-table").forEach(function (table) {
      var toggles = Array.from(table.querySelectorAll("tbody [data-order-type]"));
      var allConfirmed = toggles.length > 0 && toggles.every(function (item) { return item.dataset.orderType === "confirmed"; });
      var allForecast = toggles.length > 0 && toggles.every(function (item) { return item.dataset.orderType === "forecast"; });
      var header = table.querySelector("[data-bulk-order-type] .order-type-switch");
      if (!header) return;
      header.querySelectorAll(".order-type-option")[0]?.classList.toggle("active-confirmed", allConfirmed);
      header.querySelectorAll(".order-type-option")[1]?.classList.toggle("active-forecast", allForecast);
    });
  }

  function setOrderTypeForRow(rowKey, type) {
    document.querySelectorAll('[data-row-key="' + rowKey + '"] [data-order-type]').forEach(function (button) {
      paintOrderType(button, type);
    });
    refreshOrderTypeHeaders();
  }

  document.querySelectorAll("tbody [data-order-type]").forEach(function (button) {
    button.addEventListener("click", function () {
      var row = button.closest("[data-row-key]");
      var next = button.dataset.orderType === "confirmed" ? "forecast" : "confirmed";
      setOrderTypeForRow(row.dataset.rowKey, next);
    });
  });

  document.querySelectorAll("[data-bulk-order-type]").forEach(function (header) {
    header.addEventListener("click", function () {
      var table = header.closest("table");
      var toggles = Array.from(table.querySelectorAll("tbody [data-order-type]"));
      var next = toggles.every(function (item) { return item.dataset.orderType === "confirmed"; }) ? "forecast" : "confirmed";
      toggles.forEach(function (button) {
        var row = button.closest("[data-row-key]");
        setOrderTypeForRow(row.dataset.rowKey, next);
      });
      toast("已将全部结果设置为 " + (next === "confirmed" ? "Firm" : "Forecast") + "。");
    });
  });

  document.querySelector("[data-apply-dates]")?.addEventListener("click", function () {
    var days = Math.max(0, Number(document.querySelector("[data-date-days]").value) || 0);
    document.querySelectorAll('[data-edit-stage="2"] [data-row-key]').forEach(function (row) {
      var input = row.querySelector('[data-field="date_info"]');
      var base = input.dataset.baseDate || input.value;
      var date = new Date(base + "T00:00:00Z");
      date.setUTCDate(date.getUTCDate() - days);
      input.value = date.toISOString().slice(0, 10);
      syncField(input);
    });
    toast("已将全部到货日期提前 " + days + " 天并更新为提货日期，仍可逐行修改。");
  });

  document.querySelector("[data-apply-quantity]")?.addEventListener("click", function () {
    var strategy = document.querySelector("[data-bulk-quantity-strategy]").value;
    document.querySelectorAll('[data-edit-stage="3"] [data-field="merge_strategy"]').forEach(function (select) {
      select.value = strategy;
      syncField(select);
    });
    toast("已将全部结果的合并策略更新为 " + strategy + "。");
  });

  document.querySelectorAll("[data-delete-row]").forEach(function (button) {
    button.addEventListener("click", function () {
      var row = button.closest("[data-row-key]");
      var rowKey = row.dataset.rowKey;
      document.querySelectorAll('[data-row-key="' + rowKey + '"]').forEach(function (target) { target.remove(); });
      refreshOrderTypeHeaders();
      toast("已从当前解析结果删除该行。");
    });
  });

  document.querySelectorAll(".orders-lane-toggle").forEach(function (button) {
    button.addEventListener("click", function () {
      var active = document.querySelectorAll(".orders-lane-toggle.active");
      if (button.classList.contains("active") && active.length === 1) return;
      button.classList.toggle("active");
      button.setAttribute("aria-pressed", String(button.classList.contains("active")));
    });
  });

  refreshOrderTypeHeaders();

  document.querySelectorAll("[data-open-modal]").forEach(function (button) {
    button.addEventListener("click", function () { document.querySelector(button.dataset.openModal)?.classList.add("open"); });
  });
  document.querySelectorAll("[data-close-modal]").forEach(function (button) {
    button.addEventListener("click", function () { button.closest(".modal-backdrop")?.classList.remove("open"); });
  });
  document.querySelectorAll(".modal-backdrop").forEach(function (modal) {
    modal.addEventListener("click", function (event) { if (event.target === modal) modal.classList.remove("open"); });
  });
  document.querySelector("[data-confirm-merge]")?.addEventListener("click", function () {
    var button = this;
    var modal = button.closest(".modal-backdrop");
    button.disabled = true;
    button.textContent = "Merge 中…";
    window.setTimeout(function () {
      modal.classList.remove("open");
      document.querySelectorAll("[data-step-page]").forEach(function (page) { page.classList.toggle("active", page.dataset.stepPage === "complete"); });
      document.querySelectorAll("[data-review-step]").forEach(function (step) { step.classList.add("done"); step.classList.remove("active"); step.setAttribute("aria-current", "false"); });
      document.querySelector("[data-task-status]").className = "badge success";
      document.querySelector("[data-task-status]").innerHTML = '<span class="dot"></span>已合并';
      refreshIcons();
      toast("解析结果已合并到 Orders。");
    }, 900);
  });

  document.querySelectorAll("[data-demo-action]").forEach(function (button) {
    button.addEventListener("click", function () { toast(button.dataset.demoAction); });
  });

  var query = new URLSearchParams(window.location.search);
  var initialStep = Number(query.get("step"));
  if (initialStep >= 1 && initialStep <= 4) setStep(initialStep);
  refreshIcons();
})();
