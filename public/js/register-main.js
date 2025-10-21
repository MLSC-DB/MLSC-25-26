// main.js — moved from inline <script> in index.html
document.addEventListener("DOMContentLoaded", () => {
  // Selectors & constants
  const ML_R = ".mlsc-radio";
  const prefsSection = document.getElementById("preferencesSection");
  const ideaEl = document.getElementById("projectIdea");
  const ideaCountEl = document.getElementById("ideaCount");
  const form = document.getElementById("mlscForm");
  const confirmModal = document.getElementById("confirmModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  let _previousActiveElement = null;
  let _modalKeyHandler = null;

  function getFocusableModalElements() {
    if (!confirmModal) return [];
    return Array.from(
      confirmModal.querySelectorAll(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(
      (el) =>
        el.offsetWidth > 0 ||
        el.offsetHeight > 0 ||
        el === document.activeElement
    );
  }

  function openModal() {
    if (!confirmModal) return;
    _previousActiveElement = document.activeElement;
    confirmModal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    // focus primary control
    closeModalBtn?.focus();

    _modalKeyHandler = function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key === "Tab") {
        const focusable = getFocusableModalElements();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", _modalKeyHandler);
  }

  function closeModal() {
    if (!confirmModal) return;
    confirmModal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    try {
      if (_previousActiveElement && _previousActiveElement.focus)
        _previousActiveElement.focus();
    } catch (e) {}
    if (_modalKeyHandler) {
      document.removeEventListener("keydown", _modalKeyHandler);
      _modalKeyHandler = null;
    }
  }

  // Populate preference select options for a given select element
  function populatePrefOptions(selectEl) {
    if (!selectEl) return;
    // choose default label depending on whether this is pref1 or pref2/pref3
    const name = selectEl.name || selectEl.id || "";
    const isFirst = /pref1$/i.test(name);
    const defaultLabel = isFirst ? "Choose preference" : "No other choice";
    selectEl.innerHTML =
      `<option value="">${defaultLabel}</option>` +
      "<option value='tech'>Tech</option>" +
      "<option value='design'>Design</option>" +
      "<option value='management'>Management</option>";
  }

  // animation timing constants (keep in sync with CSS)
  const PREF_IN_MS = 220;
  const PREF_OUT_MS = 160;

  // Show/hide preferences per member when their mlsc radio is 'yes' or 'not-sure'
  function evaluatePreferencesVisibility() {
    // respect reduced-motion preference
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // helper to toggle a member preferences container
    function togglePrefContainer(target, show) {
      if (!target) return;
      if (show && target.classList.contains("pref-hidden")) {
        target.classList.remove("pref-hidden");
        target.setAttribute("aria-hidden", "false");
        target.classList.add("pref-animate-in");

        if (!reduceMotion) {
          setTimeout(
            () => target.classList.remove("pref-animate-in"),
            PREF_IN_MS + 40
          );
        } else {
          target.classList.remove("pref-animate-in");
        }

        // make pref1 required when visible and populate/selects
        const pref1 =
          target.querySelector(".member-pref1") ||
          target.querySelector("#pref1");
        if (pref1) pref1.setAttribute("required", "required");
        target.querySelectorAll("select").forEach(populatePrefOptions);
        enforcePrefUniquenessFor(target);
      } else if (!show && !target.classList.contains("pref-hidden")) {
        target.classList.remove("pref-animate-in");
        target.classList.add("pref-animate-out");

        const hideNow = () => {
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
        };

        if (!reduceMotion) setTimeout(hideNow, PREF_OUT_MS + 40);
        else hideNow();
      }
    }

    // evaluate each member's mlsc radio and toggle the corresponding prefs container
    // member 1 uses preferencesSection, members 2..4 use preferences_member_X ids
    for (let i = 1; i <= 4; i++) {
      const mlscVal =
        document.querySelector(`input[name="mlsc_member_${i}"]:checked`)
          ?.value || "";
      const show = mlscVal === "yes" || mlscVal === "not-sure";
      const target =
        i === 1
          ? document.getElementById("preferencesSection")
          : document.getElementById(`preferences_member_${i}`);
      togglePrefContainer(target, show);
    }
  }

  // Prevent duplicate preference choice per member by disabling
  // an already-selected option in the other selects for that member.
  function enforcePrefUniquenessFor(container) {
    if (!container) return;
    // find all selects inside this member preferences container
    const selects = Array.from(container.querySelectorAll("select"));
    if (!selects.length) return;

    // collect chosen values (excluding empty)
    const chosen = selects.map((s) => s.value).filter((v) => v && v.length > 0);

    // for each select, enable all options then disable the ones chosen by others
    selects.forEach((s) => {
      const opts = Array.from(s.options || []);
      opts.forEach((o) => (o.disabled = false));
      opts.forEach((o) => {
        if (!o.value) return; // skip placeholder
        // if this option is chosen in another select, disable it here
        const usedElsewhere = chosen.includes(o.value) && s.value !== o.value;
        o.disabled = usedElsewhere;
      });
    });
  }

  // Wire radio listeners (and call evaluate when they change)
  function wireMlscRadios() {
    const radios = document.querySelectorAll(ML_R);
    radios.forEach((r) => {
      r.addEventListener("change", () => {
        evaluatePreferencesVisibility();
        autoSaveDraft();
      });
    });
  }

  // Project idea count
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

  // Collect form into object including members
  function collectFormObject() {
    const fd = new FormData(form);
    const obj = {};
    for (const [k, v] of fd.entries()) {
      if (obj[k] !== undefined) {
        if (!Array.isArray(obj[k])) obj[k] = [obj[k]];
        obj[k].push(v);
      } else obj[k] = v;
    }
    // members 2..4 structured
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
  // Load draft (if any)
  function loadDraft() {
    try {
      const raw = localStorage.getItem("mlsc_registration_draft");
      if (!raw) return;
      const data = JSON.parse(raw);
      // simple mapping for main fields
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
        // per-member prefs
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
      // mlsc member 1 radio
      if (data["mlsc_member_1"]) {
        const r = document.querySelector(
          `input[name="mlsc_member_1"][value="${data["mlsc_member_1"]}"]`
        );
        if (r) r.checked = true;
      }
      // members array in _members
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
      // project idea count update
      if (ideaEl && ideaEl.value)
        ideaCountEl.textContent = ideaEl.value.length + " / 1000";
    } catch (e) {
      console.warn("load draft failed", e);
    }
  }

  // Submit handler
  function submitRegistration() {
    const errors = [];
    const name = form.querySelector("#name").value.trim();
    const email = form.querySelector("#email").value.trim();
    const roll = form.querySelector("#roll").value.trim();
    const discord = (form.querySelector("#discord")?.value || "").trim();
    const year = form.querySelector("#year").value;
    const phone = (form.querySelector("#phone")?.value || "").replace(
      /\D/g,
      ""
    );
    const joinmlsc =
      document.querySelector('input[name="mlsc_member_1"]:checked')?.value ||
      "";
    const teamName = (form.querySelector("#teamName")?.value || "").trim();

    if (!name || name.length < 3) errors.push("Name is required (min 3 chars)");
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      errors.push("A valid email is required");
    if (!roll) errors.push("Roll number is required");
    if (!discord) errors.push("Discord username is required");
    if (!year) errors.push("Year is required");
    if (!phone || phone.length < 8)
      errors.push("Phone number is required (min 8 digits)");

    const pref1 = document.getElementById("pref1")?.value || "";
    if ((joinmlsc === "yes" || joinmlsc === "not-sure") && !pref1)
      errors.push("Primary preference is required when joining MLSC");

    // Team name is required unconditionally per updated requirements
    if (!teamName) errors.push("Team name is required");

    const agree1 = document.getElementById("agree1").checked;
    const agree2 = document.getElementById("agree2").checked;
    const agree3 = document.getElementById("agree3").checked;
    if (!agree1 || !agree2 || !agree3)
      errors.push("All agreements must be accepted");

    // Member-level checks: members 2..4 are optional. Validate each only if any field for that member is present.
    for (let i = 2; i <= 4; i++) {
      const mname = form.querySelector(`[name="member${i}_name"]`)?.value || "";
      const memail =
        form.querySelector(`[name="member${i}_email"]`)?.value || "";
      const mroll = form.querySelector(`[name="member${i}_roll"]`)?.value || "";
      const mdiscord =
        form.querySelector(`[name="member${i}_discord"]`)?.value || "";
      const mphone = (
        form.querySelector(`[name="member${i}_phone"]`)?.value || ""
      ).replace(/\D/g, "");
      const myear = form.querySelector(`[name="member${i}_year"]`)?.value || "";
      const mmlsc =
        document.querySelector(`input[name="mlsc_member_${i}"]:checked`)
          ?.value || "";
      const mpref1 = (
        form.querySelector(`[name="member${i}_pref1"]`)?.value || ""
      ).trim();

      const hasAny = !!(
        mname ||
        memail ||
        mroll ||
        mdiscord ||
        mphone ||
        myear ||
        mmlsc ||
        mpref1 ||
        form.querySelector(`[name="member${i}_pref2"]`)?.value ||
        form.querySelector(`[name="member${i}_pref3"]`)?.value
      );

      if (!hasAny) continue; // skip validation for this member

      if (!mname) errors.push(`Member ${i}: name is required`);
      if (!memail || !/^\S+@\S+\.\S+$/.test(memail))
        errors.push(`Member ${i}: valid email required`);
      if (!mroll) errors.push(`Member ${i}: roll number is required`);
      if (!mdiscord) errors.push(`Member ${i}: discord is required`);
      if (!mphone || mphone.length < 8)
        errors.push(`Member ${i}: phone is required (min 8 digits)`);
      if (!myear) errors.push(`Member ${i}: year is required`);
      if (!mmlsc)
        errors.push(
          `Member ${i}: join MLSC (yes/not-sure/no) selection is required`
        );
      const mmlscVal = (mmlsc || "").toLowerCase();
      if ((mmlscVal === "yes" || mmlscVal === "not-sure") && !mpref1)
        errors.push(`Member ${i}: primary preference is required`);
    }

    if (errors.length) {
      errors.forEach((m, idx) => showToast(m, { timeout: 3500 + idx * 600 }));
      return;
    }

    const payload = collectFormObject();

    // map fields to backend expected names (existing mapping)
    const projectIdea = (payload.projectIdea || "").toString().trim();
    if (projectIdea.length > 0 && projectIdea.length < 5) {
      showToast("Short idea should be at least 5 characters if provided", {
        timeout: 3000,
      });
      return;
    }

    const fd = new FormData();
    fd.append("name", payload.name || "");
    fd.append("email", payload.email || "");
    // sanitize phone: keep digits only
    const rawPhone = (payload.phone || "").toString();
    const phoneDigits = rawPhone.replace(/\D/g, "");
    fd.append("phone", phoneDigits);
    // map year to backend enum
    const yearMap = { 1: "First Year", 2: "Second Year" };
    fd.append(
      "yearOfStudy",
      yearMap[payload.year || payload.yearOfStudy || ""] || ""
    );

    // domain preferences (allow empty strings to satisfy schema presence)
    fd.append("pref1", payload.pref1 || "");
    fd.append("pref2", payload.pref2 || "");
    fd.append("pref3", payload.pref3 || "");

    // include teamName, roll, discord, joinmlsc for member1 and team
    fd.append("teamName", payload.teamName || teamName || "");
    fd.append("roll", payload.roll || "");
    fd.append("discord", payload.discord || "");
    // member1 mlsc
    fd.append("mlsc_member_1", payload.mlsc_member_1 || joinmlsc || "");

    // members: append member fields (required per new rule)
    for (let i = 2; i <= 4; i++) {
      const fields = ["name", "email", "roll", "phone", "discord", "year"];
      fields.forEach((f) => {
        const key = `member${i}_${f}`;
        if (payload[key] !== undefined) fd.append(key, payload[key]);
        else fd.append(key, "");
      });
      // add member prefs (ensure pref1 exists)
      ["pref1", "pref2", "pref3"].forEach((p) => {
        const key = `member${i}_${p}`;
        if (payload[key] !== undefined) fd.append(key, payload[key]);
        else fd.append(key, "");
      });
      const mlscKey = `mlsc_member_${i}`;
      if (payload[mlscKey]) fd.append(mlscKey, payload[mlscKey]);
      else fd.append(mlscKey, "");
    }

    // projects / motivation
    const projects =
      (payload.projectTitle || "") +
      (payload.projectLink ? " | " + payload.projectLink : "");
    fd.append("projects", projects);
    fd.append("motivation", projectIdea);

    // agreements: read directly from the DOM to avoid missing name attributes
    fd.append("agree1", document.getElementById("agree1")?.checked ? "on" : "");
    fd.append("agree2", document.getElementById("agree2")?.checked ? "on" : "");
    fd.append("agree3", document.getElementById("agree3")?.checked ? "on" : "");

    // timestamp (optional)
    fd.append("submittedAt", new Date().toISOString());

    try {
      localStorage.setItem(
        "mlsc_registration_preview",
        JSON.stringify(payload, null, 2)
      );
    } catch (e) {}

    // POST to backend
    fetch("/register", {
      method: "POST",
      headers: {
        // request JSON response on validation errors
        Accept: "application/json",
      },
      body: fd,
    })
      .then((res) => {
        if (res.ok) {
          // Success: clear draft and show confirmation modal
          try {
            localStorage.removeItem("mlsc_registration_draft");
          } catch (e) {}
          if (confirmModal) {
            openModal();
          } else {
            showToast("Registration submitted successfully", { timeout: 3000 });
          }
          return null;
        }

        // try parse JSON errors first
        // Handle JSON error payloads consistently across status codes (400, 409, etc.)
        const tryParseJsonAndApplyFormErrors = (response) =>
          response
            .json()
            .then((json) => {
              if (json && Array.isArray(json.errors)) {
                json.errors.forEach((m, idx) =>
                  showToast(m, { timeout: 3500 + idx * 600 })
                );
              } else if (json && json.error) {
                showToast(json.error);
              } else {
                showToast("Submission failed. Please check required fields.");
              }

              if (json && json.formErrors) {
                Object.keys(json.formErrors).forEach((key) => {
                  const elById = document.getElementById(key);
                  const elByName = document.querySelector(`[name="${key}"]`);
                  const el = elById || elByName;
                  if (el) {
                    el.classList.add("input-error");
                    setTimeout(() => el.classList.remove("input-error"), 3000);
                    showFieldError(
                      el,
                      json && json.errors && json.errors.length
                        ? json.errors[0]
                        : "Invalid value"
                    );
                  }
                });
              }
            })
            .catch((err) => {
              console.error("Failed to parse JSON error response", err);
              showToast("Submission failed. Please check required fields.");
            });

        // If response has JSON content-type, use the shared parser for all non-OK statuses
        const ct = res.headers.get("content-type") || "";
        if (ct.indexOf("application/json") !== -1) {
          return tryParseJsonAndApplyFormErrors(res);
        }

        // Non-JSON fallback: return plain text and show a generic message
        return res.text().then((txt) => {
          showToast("An unexpected error occurred during submission.");
          console.error("Submit error:", res.status, txt);
        });
      })
      .catch((err) => {
        console.error("Network error:", err);
        showToast(
          "Network error while submitting. Please check your connection and try again."
        );
      });
  }

  // Toast helper (simple): appends a toast container if missing and shows messages
  function showToast(message, opts = {}) {
    const timeout = opts.timeout || 3500;
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.style.position = "fixed";
      container.style.top = "1rem";
      container.style.right = "1rem";
      container.style.zIndex = 99999;
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "0.5rem";
      document.body.appendChild(container);
    }
    const el = document.createElement("div");
    el.textContent = message;
    el.style.background = "rgba(15,23,42,0.95)";
    el.style.color = "white";
    el.style.padding = "0.6rem 0.9rem";
    el.style.borderRadius = "8px";
    el.style.boxShadow = "0 6px 20px rgba(2,6,23,0.6)";
    el.style.fontFamily =
      'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial';
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 350ms";
      setTimeout(() => el.remove(), 350);
    }, timeout);
  }

  // show inline error under a field element
  function showFieldError(el, message, timeout = 5000) {
    try {
      // remove any existing inline error for this field
      const existing = el.parentNode?.querySelector(".field-error-msg");
      if (existing) existing.remove();

      const msg = document.createElement("div");
      msg.className = "field-error-msg text-sm text-rose-400 mt-1";
      msg.textContent = message || "Invalid input";

      // insert after the field
      if (el.parentNode) el.parentNode.appendChild(msg);
      // focus the field for quick correction
      try {
        el.focus();
      } catch (e) {}

      // remove after timeout
      setTimeout(() => {
        try {
          msg.remove();
        } catch (e) {}
      }, timeout);
    } catch (e) {
      console.warn("showFieldError failed", e);
    }
  }

  // download JSON
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

  // Clear form handler: reset form and clear saved draft/preview
  function clearForm() {
    try {
      // reset the form fields
      form.reset();
      // remove autosave keys
      localStorage.removeItem("mlsc_registration_draft");
      localStorage.removeItem("mlsc_registration_preview");

      // hide preferences sections and remove required attributes
      document
        .querySelectorAll(
          ".pref-hidden, #preferencesSection, [id^=preferences_member_]"
        )
        .forEach((el) => {
          if (!el) return;
          el.classList.add("pref-hidden");
          el.setAttribute("aria-hidden", "true");
          // remove any member-pref1 required attribute
          const pref1 =
            el.querySelector(".member-pref1") || el.querySelector("#pref1");
          if (pref1) pref1.removeAttribute("required");
        });

      // re-evaluate uniqueness (clear any disabled options)
      document
        .querySelectorAll('[id^="preferences_member_"]')
        .forEach((c) => enforcePrefUniquenessFor(c));
      enforcePrefUniquenessFor(document.getElementById("preferencesSection"));

      showToast("Form cleared", { timeout: 2200 });
    } catch (e) {
      console.warn("clearForm failed", e);
      showToast("Failed to clear form", { timeout: 2200 });
    }
  }

  // init wiring
  function init() {
    wireMlscRadios();
    wireInputAutosave();
    wireIdeaCount();

    // populate all preference selects so loadDraft can set values
    document.querySelectorAll("#mlscForm select").forEach((s) => {
      if (s.name && /pref/.test(s.name)) populatePrefOptions(s);
    });

    // wire preference selects to enforce uniqueness and autosave
    document.querySelectorAll("#mlscForm select").forEach((s) => {
      if (s.name && /pref/.test(s.name)) {
        s.addEventListener("change", (e) => {
          // find parent preferences container for this select
          const container =
            s.closest(".pref-hidden") ||
            s.closest('[id^="preferences_"]') ||
            s.closest("#preferencesSection");
          enforcePrefUniquenessFor(container || s.parentNode);
          autoSaveDraft();
        });
      }
    });

    // load draft if present then evaluate visibility
    loadDraft();
    evaluatePreferencesVisibility();

    // after load/visibility, run a full pass to ensure option disabling matches loaded values
    document
      .querySelectorAll('[id^="preferences_member_"]')
      .forEach((c) => enforcePrefUniquenessFor(c));
    enforcePrefUniquenessFor(document.getElementById("preferencesSection"));

    // close modal
    closeModalBtn?.addEventListener("click", () => {
      closeModal();
    });
    // Autofill detection: listen for animationstart fired by :-webkit-autofill
    document.addEventListener(
      "animationstart",
      (e) => {
        try {
          if (e.animationName === "onAutoFillStart") {
            const el = e.target;
            if (
              el &&
              (el.tagName === "INPUT" ||
                el.tagName === "TEXTAREA" ||
                el.tagName === "SELECT")
            ) {
              el.classList.add("finput");
              try {
                // force text color and caret to our dark-theme friendly values
                el.style.setProperty("-webkit-text-fill-color", "#e6eef9");
                el.style.setProperty("color", "#e6eef9");
                el.style.setProperty("caret-color", "#e6eef9");
                // trigger reflow to force repaint
                void el.offsetHeight;
              } catch (e) {}
            }
          }
        } catch (err) {
          /* ignore */
        }
      },
      true
    );

    // Fallback/polling: run several quick scans to catch late autofill population
    (function pollAutofillFix(attemptsLeft = 6, delay = 180) {
      try {
        document
          .querySelectorAll(
            "#mlscForm input, #mlscForm textarea, #mlscForm select"
          )
          .forEach((el) => {
            try {
              if (el && el.value && el.value.toString().trim().length) {
                el.classList.add("finput");
                try {
                  el.style.setProperty("-webkit-text-fill-color", "#e6eef9");
                  el.style.setProperty("color", "#e6eef9");
                  el.style.setProperty("caret-color", "#e6eef9");
                  void el.offsetHeight;
                } catch (e) {}
              }
            } catch (e) {}
          });
      } catch (e) {}

      if (attemptsLeft > 0)
        setTimeout(() => pollAutofillFix(attemptsLeft - 1, delay), delay);
    })();
    // clear form button
    const clearBtn = document.getElementById("clearFormBtn");
    clearBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      clearForm();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") confirmModal.classList.add("hidden");
    });
  }

  // wire autosave for all inputs on change/input
  function wireInputAutosave() {
    document
      .querySelectorAll("#mlscForm input, #mlscForm select, #mlscForm textarea")
      .forEach((el) => {
        el.addEventListener("input", autoSaveDraft);
        el.addEventListener("change", autoSaveDraft);
      });
  }

  // run init
  // expose submitRegistration globally because the form's onsubmit attribute calls it
  window.submitRegistration = submitRegistration;
  init();
});
