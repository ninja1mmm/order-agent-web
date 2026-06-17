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
