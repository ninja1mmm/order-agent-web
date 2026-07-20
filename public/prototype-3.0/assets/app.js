function initPrototype() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  document.querySelectorAll("[data-open]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
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
    trigger.addEventListener("click", () => {
      const tab = trigger.dataset.reconTab;
      document.querySelectorAll("[data-recon-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.reconPanel === tab);
      });
      document.querySelectorAll(".recon-tabs [data-recon-tab]").forEach((item) => {
        item.classList.toggle("active", item.dataset.reconTab === tab);
      });
    });
  });

  document.querySelectorAll("[data-recon-start]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const board = document.querySelector("[data-recon-board]");
      if (board) board.classList.add("matching-active");
      trigger.classList.add("primary");
      trigger.innerHTML = '<i data-lucide="check-circle-2"></i>对帐高亮已生成';
      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
  });

  document.querySelectorAll("[data-parse-upload]").forEach((trigger) => {
    let parseTimer;
    trigger.addEventListener("click", () => {
      const panel = document.querySelector("[data-analysis-panel]");
      const status = document.querySelector("[data-analysis-status]");
      const badge = document.querySelector("[data-analysis-badge]");
      const confirmButton = document.querySelector("[data-confirm-create]");
      const steps = document.querySelectorAll("[data-analysis-step]");

      window.clearTimeout(parseTimer);
      panel?.classList.remove("is-complete");
      panel?.classList.add("is-running");
      steps.forEach((step) => step.classList.remove("done"));
      if (status) status.textContent = "正在解析 SAP 发运、交货映射和客户收货单，校验模板字段、客户范围和日期窗口。";
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
        if (status) status.textContent = "解析完成。已生成文件摘要和上传校验结果，可复核提示后正式创建任务。";
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

  document.querySelectorAll("[data-receipt-route-card]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      document.querySelectorAll("[data-receipt-route-card]").forEach((card) => {
        const selected = card === trigger;
        card.classList.toggle("selected", selected);
        const input = card.querySelector('input[type="radio"]');
        if (input) input.checked = selected;
      });

      const status = document.querySelector("[data-receipt-route-status]");
      const uploadMeta = document.querySelector("[data-receipt-upload-meta]");
      const validation = document.querySelector("[data-receipt-route-validation]");
      const summaryMeta = document.querySelector("[data-receipt-summary-meta]");

      if (status) status.textContent = trigger.dataset.routeLabel;
      if (uploadMeta) uploadMeta.textContent = trigger.dataset.uploadMeta;
      if (validation) validation.textContent = trigger.dataset.validation;
      if (summaryMeta) summaryMeta.textContent = trigger.dataset.summaryMeta;
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
