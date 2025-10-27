// register.js - migrated from main.js and trimmed for registration page usage
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("mlscForm");
  const prefsSection = document.getElementById("preferencesSection");
  const ideaEl = document.getElementById("projectIdea");
  const ideaCountEl = document.getElementById("ideaCount");

  function populatePrefOptions(selectEl) {
    if (!selectEl) return;
    const name = selectEl.name || selectEl.id || "";
    const isFirst = /pref1$/i.test(name);
    const defaultLabel = isFirst ? "Choose preference" : "No other choice";
    selectEl.innerHTML =
      `<option value="">${defaultLabel}</option>` +
      "<option value='tech'>Tech</option>" +
      "<option value='design'>Design</option>" +
      "<option value='management'>Management</option>";
  }

  function enforcePrefUniquenessFor(container) {
    if (!container) return;
    const selects = Array.from(container.querySelectorAll("select"));
    if (!selects.length) return;
    const chosen = selects.map((s) => s.value).filter((v) => v && v.length > 0);
    selects.forEach((s) => {
      const opts = Array.from(s.options || []);
      opts.forEach((o) => (o.disabled = false));
      opts.forEach((o) => {
        if (!o.value) return;
        const usedElsewhere = chosen.includes(o.value) && s.value !== o.value;
        o.disabled = usedElsewhere;
      });
    });
  }

  function evaluatePreferencesVisibility() {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    for (let i = 1; i <= 4; i++) {
      const radios = Array.from(
        document.querySelectorAll(`input[name="mlsc_member_${i}"]`)
      );
      let show = false;
      radios.forEach((r) => {
        if (r.checked) {
          const v = r.value?.toLowerCase?.();
          if (v === "yes" || v === "not-sure") show = true;
        }
      });
      const target =
        i === 1
          ? prefsSection
          : document.getElementById(`preferences_member_${i}`);
      if (!target) continue;
      if (show && target.classList.contains("pref-hidden")) {
        target.classList.remove("pref-hidden");
        target.setAttribute("aria-hidden", "false");
        target.classList.remove("pref-animate-out");
        target.classList.add("pref-animate-in");
        if (!reduceMotion)
          setTimeout(() => target.classList.remove("pref-animate-in"), 260);
        const pref1 =
          target.querySelector(".member-pref1") ||
          target.querySelector("#pref1");
        if (pref1) pref1.setAttribute("required", "required");
        target.querySelectorAll("select").forEach(populatePrefOptions);
        enforcePrefUniquenessFor(target);
      } else if (!show && !target.classList.contains("pref-hidden")) {
        target.classList.remove("pref-animate-in");
        target.classList.add("pref-animate-out");
        if (!reduceMotion) {
          setTimeout(() => {
            target.classList.add("pref-hidden");
            target.setAttribute("aria-hidden", "true");
            target.classList.remove("pref-animate-out");
            const pref1 =
              target.querySelector(".member-pref1") ||
              target.querySelector("#pref1");
            if (pref1) {
              pref1.removeAttribute("required");
              pref1.value = "";
            }
            target.querySelectorAll("select").forEach((s) => {
              if (s) s.value = "";
            });
            enforcePrefUniquenessFor(target);
          }, 200);
        } else {
          target.classList.add("pref-hidden");
          target.setAttribute("aria-hidden", "true");
          target.classList.remove("pref-animate-out");
          const pref1 =
            target.querySelector(".member-pref1") ||
            target.querySelector("#pref1");
          if (pref1) {
            pref1.removeAttribute("required");
            pref1.value = "";
          }
          target.querySelectorAll("select").forEach((s) => {
            if (s) s.value = "";
          });
          enforcePrefUniquenessFor(target);
        }
      }
    }
  }

  function wireMlscRadios() {
    const radios = document.querySelectorAll(".mlsc-radio");
    radios.forEach((r) =>
      r.addEventListener("change", () => {
        evaluatePreferencesVisibility();
        autoSaveDraft();
      })
    );
  }

  function wireIdeaCount() {
    if (!ideaEl || !ideaCountEl) return;
    ideaEl.addEventListener("input", (e) => {
      const len = e.target.value.length;
      ideaCountEl.textContent = len + " / 1000";
      if (len >= 900) ideaCountEl.classList.add("text-rose-400");
      else ideaCountEl.classList.remove("text-rose-400");
      autoSaveDraft();
    });
  }

  function collectFormObject() {
    const fd = new FormData(form);
    const obj = {};
    for (const [k, v] of fd.entries()) {
      if (obj[k] !== undefined) {
        if (!Array.isArray(obj[k])) obj[k] = [obj[k]];
        obj[k].push(v);
      } else obj[k] = v;
    }
    obj._members = [];
    for (let i = 2; i <= 4; i++) {
      const m = {
        name:
          (form.querySelector(`[name="member${i}_name"]`) || {}).value || "",
        email:
          (form.querySelector(`[name="member${i}_email"]`) || {}).value || "",
        roll:
          (form.querySelector(`[name="member${i}_roll"]`) || {}).value || "",
        phone:
          (form.querySelector(`[name="member${i}_phone"]`) || {}).value || "",
        discord:
          (form.querySelector(`[name="member${i}_discord"]`) || {}).value || "",
        year:
          (form.querySelector(`[name="member${i}_year"]`) || {}).value || "",
        mlsc: (() => {
          const c = form.querySelector(
            `input[name="mlsc_member_${i}"]:checked`
          );
          return c ? c.value : "";
        })(),
      };
      obj._members.push(m);
    }
    return obj;
  }

  function autoSaveDraft() {
    try {
      const data = collectFormObject();
      localStorage.setItem("mlsc_registration_draft", JSON.stringify(data));
    } catch (e) {
      console.warn(e);
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem("mlsc_registration_draft");
      if (!raw) return;
      const data = JSON.parse(raw);
      const mapping = [
        "name",
        "email",
        "roll",
        "year",
        "phone",
        "discord",
        "teamName",
        "projectTitle",
        "projectIdea",
        "projectLink",
        "pref1",
        "pref2",
        "pref3",
        "member2_pref1",
        "member2_pref2",
        "member2_pref3",
        "member3_pref1",
        "member3_pref2",
        "member3_pref3",
        "member4_pref1",
        "member4_pref2",
        "member4_pref3",
      ];
      mapping.forEach((k) => {
        if (data[k] !== undefined) {
          const el = document.getElementById(k);
          if (el) el.value = data[k];
        }
      });
      if (data["mlsc_member_1"]) {
        const r = document.querySelector(
          `input[name="mlsc_member_1"][value="${data["mlsc_member_1"]}"]`
        );
        if (r) r.checked = true;
      }
      if (Array.isArray(data._members)) {
        data._members.forEach((m, idx) => {
          const i = idx + 2;
          if (!m) return;
          const map = {
            name: `member${i}_name`,
            email: `member${i}_email`,
            roll: `member${i}_roll`,
            phone: `member${i}_phone`,
            discord: `member${i}_discord`,
            year: `member${i}_year`,
          };
          for (const key in map) {
            const el = form.querySelector(`[name="${map[key]}"]`);
            if (el && m[key] !== undefined) el.value = m[key];
          }
          if (m.mlsc) {
            const r = document.querySelector(
              `input[name="mlsc_member_${i}"][value="${m.mlsc}"]`
            );
            if (r) r.checked = true;
          }
        });
      }
      if (ideaEl && ideaEl.value)
        ideaCountEl.textContent = ideaEl.value.length + " / 1000";
    } catch (e) {
      console.warn("load draft failed", e);
    }
  }

  function submitRegistration() {
    const name = form.querySelector("#name").value.trim();
    const email = form.querySelector("#email").value.trim();
    const roll = form.querySelector("#roll").value.trim();
    const year = form.querySelector("#year").value;
    if (!name || !email || !roll || !year) {
      alert("Please fill required personal details (name, email, roll, year).");
      return;
    }
    const agree1 = document.getElementById("agree1").checked;
    const agree2 = document.getElementById("agree2").checked;
    const agree3 = document.getElementById("agree3").checked;
    if (!agree1 || !agree2 || !agree3) {
      alert("Please accept agreements before submitting.");
      return;
    }
    const payload = collectFormObject();
    payload.timestamp = new Date().toISOString();
    try {
      localStorage.setItem(
        "mlsc_registration_preview",
        JSON.stringify(payload, null, 2)
      );
    } catch (e) {}
    const confirmModal = document.getElementById("confirmModal");
    if (confirmModal) confirmModal.classList.remove("hidden");
    confirmModal?.querySelector("h3")?.focus();
  }

  function downloadJSON() {
    const raw =
      localStorage.getItem("mlsc_registration_preview") ||
      localStorage.getItem("mlsc_registration_draft") ||
      "{}";
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mlsc_registration_summary.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function init() {
    document.querySelectorAll("#mlscForm select").forEach((s) => {
      if (s.name && /pref/.test(s.name)) populatePrefOptions(s);
    });
    document.querySelectorAll("#mlscForm select").forEach((s) => {
      if (s.name && /pref/.test(s.name)) {
        s.addEventListener("change", (e) => {
          const container =
            s.closest(".pref-hidden") ||
            s.closest('[id^="preferences_"]') ||
            s.closest("#preferencesSection");
          enforcePrefUniquenessFor(container || s.parentNode);
          autoSaveDraft();
        });
      }
    });
    wireMlscRadios();
    wireInputAutosave();
    wireIdeaCount();
    loadDraft();
    evaluatePreferencesVisibility();
    document
      .querySelectorAll('[id^="preferences_member_"]')
      .forEach((c) => enforcePrefUniquenessFor(c));
    enforcePrefUniquenessFor(document.getElementById("preferencesSection"));
    const closeModalBtn = document.getElementById("closeModalBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    closeModalBtn?.addEventListener("click", () => {
      document.getElementById("confirmModal").classList.add("hidden");
    });
    downloadBtn?.addEventListener("click", downloadJSON);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape")
        document.getElementById("confirmModal").classList.add("hidden");
    });
  }

  function wireInputAutosave() {
    document
      .querySelectorAll("#mlscForm input, #mlscForm select, #mlscForm textarea")
      .forEach((el) => {
        el.addEventListener("input", autoSaveDraft);
        el.addEventListener("change", autoSaveDraft);
      });
  }

  window.submitRegistration = submitRegistration;
  init();
});
