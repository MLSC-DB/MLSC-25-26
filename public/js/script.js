let zIndexCounter = 10;
function bringToFront(win) {
  win.style.zIndex = ++zIndexCounter;
}

// Smooth, rAF-driven draggable windows (pointer events), clamped to viewport
function makeDraggable(popup, header) {
  // Prevent touch panning/zooming on the draggable header area (mobile)
  try {
    header.style.touchAction = "none";
  } catch (_) {}

  let dragging = false;
  let startX = 0,
    startY = 0,
    origX = 0,
    origY = 0,
    dx = 0,
    dy = 0,
    rafId = 0,
    activePointerId = null;

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  const animate = () => {
    rafId = 0;
    if (!dragging) return;
    const maxX = Math.max(0, window.innerWidth - popup.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - popup.offsetHeight);
    const nextX = clamp(origX + dx, 0, maxX);
    const nextY = clamp(origY + dy, 0, maxY);
    // translate relative to original for smoothness without reflow
    popup.style.transform = `translate(${nextX - origX}px, ${nextY - origY}px)`;
    rafId = requestAnimationFrame(animate);
  };

  const onPointerDown = (e) => {
    // left click / primary pointer only and avoid fullscreen drag
    if (e.button !== undefined && e.button !== 0) return;
    if (popup.dataset.state === "fullscreen") return;
    // don't start drag when interacting with window controls
    if (e.target.closest(".close-btn, .minimize-btn")) return;
    // prevent default behavior (like scroll) initiating on touch
    if (typeof e.preventDefault === "function") e.preventDefault();

    bringToFront(popup);
    const rect = popup.getBoundingClientRect();
    origX = rect.left;
    origY = rect.top;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    dy = 0;
    dragging = true;
    activePointerId = e.pointerId ?? null;

    // Freeze base position and use transform during drag
    popup.style.position = "fixed";
    popup.style.left = `${origX}px`;
    popup.style.top = `${origY}px`;
    popup.style.right = "auto";
    popup.style.bottom = "auto";
    popup.style.transition = "none";
    popup.style.willChange = "transform";
    header.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    try {
      header.setPointerCapture && header.setPointerCapture(e.pointerId);
    } catch (_) {}

    if (!rafId) rafId = requestAnimationFrame(animate);
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    // avoid scrolling while dragging on touch
    if (typeof e.preventDefault === "function") e.preventDefault();
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    if (!rafId) rafId = requestAnimationFrame(animate);
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    const maxX = Math.max(0, window.innerWidth - popup.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - popup.offsetHeight);
    const finalX = clamp(origX + dx, 0, maxX);
    const finalY = clamp(origY + dy, 0, maxY);

    popup.style.transform = "";
    popup.style.left = `${finalX}px`;
    popup.style.top = `${finalY}px`;
    popup.style.willChange = "";
    popup.style.transition = "";
    header.style.cursor = "";
    document.body.style.userSelect = "";
    // release pointer capture if set
    try {
      if (activePointerId !== null) {
        header.releasePointerCapture && header.releasePointerCapture(activePointerId);
      }
    } catch (_) {}
    activePointerId = null;
  };

  // Pointer events (covers mouse + touch + pen)
  header.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", endDrag, { passive: true });
  window.addEventListener("pointercancel", endDrag, { passive: true });
}

// function makeDraggable(popup, header) {
//   let isDragging = false,
//     startX = 0,
//     startY = 0,
//     origX = 0,
//     origY = 0;

//   header.addEventListener("mousedown", function (e) {
//     isDragging = true;
//     startX = e.clientX;
//     startY = e.clientY;
//     const rect = popup.getBoundingClientRect();
//     origX = rect.left;
//     origY = rect.top;
//     popup.style.position = "fixed";
//     document.body.style.userSelect = "none";
//   });

//   document.addEventListener("mousemove", function (e) {
//     if (!isDragging) return;
//     let dx = e.clientX - startX;
//     let dy = e.clientY - startY;
//     popup.style.left = origX + dx + "px";
//     popup.style.top = origY + dy + "px";
//   });

//   document.addEventListener("mouseup", function () {
//     isDragging = false;
//     document.body.style.userSelect = "";
//   });
// }

// Preloader Hider
window.addEventListener("DOMContentLoaded", function () {
  const preLoader = document.getElementById("pre-loader");
  if (preLoader) {
    setTimeout(() => {
      preLoader.classList.remove("opacity-100");
      preLoader.classList.add("opacity-0", "pointer-events-none");
      setTimeout(() => (preLoader.style.display = "none"), 300);
    }, 5000);
  }
});

// Popup Fullscreen/Partial Toggle
// document.getElementById("popup-min").addEventListener("click", function () {
//   const popup = document.getElementById("popup");
//   if (popup.dataset.state === "fullscreen") {
//     popup.classList.remove("w-full", "h-full", "inset-0");
//     popup.classList.add("w-[600px]", "h-[400px]");
//     popup.style.left = "calc(50% - 200px)";
//     popup.style.top = "calc(50% - 150px)";
//     popup.style.position = "fixed";
//     popup.dataset.state = "partial";
//   } else {
//     popup.classList.add("w-full", "h-full", "inset-0");
//     popup.classList.remove("w-[600px]", "h-[400px]");
//     popup.style.left = "";
//     popup.style.top = "";
//     popup.style.position = "absolute";
//     popup.dataset.state = "fullscreen";
//   }
// });

// Popup Open & Close
// const openWindow = document.querySelectorAll(".icon");
// openWindow.forEach((div) => {
//   div.addEventListener("click", function () {
//     const popup = document.getElementById("popup");
//     popup.classList.remove("hidden", "opacity-0", "scale-0");
//     setTimeout(() => {
//       popup.classList.add("opacity-100", "scale-100");
//     }, 10);
//   });
// });

// document.getElementById("popup-close").addEventListener("click", function () {
//   const popup = document.getElementById("popup");
//   popup.classList.remove("opacity-100", "scale-100");
//   popup.classList.add("opacity-0", "scale-95");
//   setTimeout(() => {
//     popup.classList.add("hidden");
//   }, 300);
// });

// Custom Right-Click Context Menu
document.addEventListener("contextmenu", function (e) {
  e.preventDefault();
  document.getElementById("start-menu").classList.add("hidden");
  const menu = document.getElementById("context-menu");
  menu.classList.remove("hidden", "scale-0");
  menu.style.left = e.clientX + "px";
  menu.style.top = e.clientY + "px";
  setTimeout(() => {
    menu.classList.add("scale-100");
  }, 10);
});

document.addEventListener("click", function (e) {
  const contextMenu = document.getElementById("context-menu");
  if (!contextMenu.contains(e.target)) {
    contextMenu.classList.add("hidden", "scale-0");
    contextMenu.classList.remove("scale-100");
  }
});

// Hide context menu on resize or scroll
["resize", "scroll"].forEach((event) => {
  window.addEventListener(event, () => {
    const contextMenu = document.getElementById("context-menu");
    contextMenu.classList.add("hidden", "scale-95");
    contextMenu.classList.remove("scale-100");
  });
});

// Hide Start Menu if clicked outside
document.addEventListener("click", function (e) {
  const startMenu = document.getElementById("start-menu");
  const startButton = document.querySelector(".start-button");
  if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
    startMenu.classList.add("hidden");
  }
});

// Context Menu Actions: About, Meet the Team, Register
document.addEventListener("click", function (e) {
  const cm = document.getElementById("context-menu");
  const closeMenu = () => {
    if (cm) {
      cm.classList.add("hidden", "scale-0");
      cm.classList.remove("scale-100");
    }
  };

  const about = e.target.closest("#context-menu .about-computer");
  const team = e.target.closest("#context-menu .mtg");
  const registerNow = e.target.closest("#context-menu .secret-menu");

  if (about) {
    e.preventDefault();
    try {
      createAppWindow("win-about", "About MLSC", "fragments/about");
    } catch (_) {}
    closeMenu();
  }
  if (team) {
    e.preventDefault();
    try {
      createAppWindow("win-team", "Meet the Team", "fragments/team");
    } catch (_) {}
    closeMenu();
  }
  if (registerNow) {
    e.preventDefault();
    window.location.href = "/register";
    closeMenu();
  }
});

// Start Menu Actions: mirror context menu behaviors for consistency
document.addEventListener("click", function (e) {
  const sm = document.getElementById("start-menu");
  if (!sm) return;

  const hideStart = () => sm.classList.add("hidden");

  const about = e.target.closest("#start-menu .about-computer");
  const team = e.target.closest("#start-menu .mtg");
  const registerNow = e.target.closest("#start-menu .secret-menu");
  const refresh = e.target.closest("#start-menu .refresh");
  const contact = e.target.closest("#start-menu .contact");

  if (about) {
    e.preventDefault();
    try {
      createAppWindow("win-about", "About MLSC", "fragments/about");
    } catch (_) {}
    hideStart();
  }
  if (team) {
    e.preventDefault();
    try {
      createAppWindow("win-team", "Meet the Team", "fragments/team");
    } catch (_) {}
    hideStart();
  }
  if (registerNow) {
    e.preventDefault();
    window.location.href = "/register";
    hideStart();
  }
  if (refresh) {
    e.preventDefault();
    hideStart();
    location.reload();
  }
  if (contact) {
    e.preventDefault();
    hideStart();
    // Open a simple contact popup if available, else fallback to mailto
    try {
      createAppWindow("win-contact", "Contact Us", "fragments/comingsoon");
    } catch (_) {
      window.location.href = "mailto:mlsc@college.edu";
    }
  }
});

// Live Clock
function updateDateTime() {
  const now = new Date();
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  document.getElementById("date-time").textContent = now.toLocaleString(
    undefined,
    options
  );
}
setInterval(updateDateTime, 1000);
updateDateTime();

// Refresh Handler
const refreshDivs = document.querySelectorAll(".refresh");
refreshDivs.forEach((div) => {
  div.addEventListener("click", () => {
    location.reload();
  });
});

// Notification Register Button -> navigate to full register page
const regBtn = document.querySelector(".register-button");
if (regBtn) {
  regBtn.addEventListener("click", function (e) {
    // allow normal anchor navigation; if it's not an anchor, navigate programmatically
    if (regBtn.tagName.toLowerCase() !== "a") {
      window.location.href = "/register";
    }
    const notification = document.getElementById("notification");
    if (notification) notification.classList.add("hidden");
  });
}

// Notification Close Button
document.querySelector(".notif-close").addEventListener("click", function () {
  const notif = document.getElementById("notification");
  notif.classList.remove("opacity-100", "scale-100");
  notif.classList.add("opacity-0", "scale-95");
});

// Utility to load HTML into popup-content
function loadPopupContent(url, title) {
  const popup = document.getElementById("popup");
  const popupContent = document.getElementById("popup-content");
  const popupTitle = document.getElementById("popup-title");
  popup.classList.add("popup-loading");
  if (popupContent) {
    // Ensure popup content area doesn't overscroll-chain and is opaque
    popupContent.style.overscrollBehavior = "contain";
    popupContent.style.backgroundColor = "#0b1020";
  }
  popupContent.innerHTML = getSkeletonHTML();
  popup.classList.remove("hidden", "opacity-0", "scale-0");
  setTimeout(() => {
    popup.classList.add("opacity-100", "scale-100");
  }, 10);
  popupTitle.textContent = title || "";

  // Create a taskbar item if not already present
  const taskbar = document.getElementById("taskbar-apps");
  const existingTaskItem = document.querySelector(`[data-task="${title}"]`);

  if (!existingTaskItem) {
    const taskItem = document.createElement("button");
    taskItem.innerText = title;
    taskItem.dataset.task = title;
    taskItem.className =
      "bg-gray-200 border mx-1 px-2 hover:bg-blue-700 hover:text-white font-mono text-sm";

    taskItem.onclick = () => {
      const popup = document.getElementById("popup");
      if (popup.classList.contains("hidden")) {
        // Show popup
        popup.classList.remove(
          "hidden",
          "opacity-0",
          "scale-0",
          "w-full",
          "h-full",
          "inset-0"
        );
        popup.classList.add("w-[600px]", "h-[400px]");
        popup.style.left = "calc(50% - 300px)";
        popup.style.top = "calc(50% - 200px)";
        popup.style.position = "fixed";
        popup.dataset.state = "partial";

        // Animate appearance
        setTimeout(() => {
          popup.classList.add("opacity-100", "scale-100");
        }, 10);
      } else {
        popup.classList.remove("opacity-100", "scale-100");
        popup.classList.add("opacity-0", "scale-95");
        setTimeout(() => popup.classList.add("hidden"), 300);
      }
    };

    taskbar.appendChild(taskItem);
  }

  fetch(url)
    .then((res) => res.text())
    .then((html) => {
      popupContent.innerHTML =
        '<div class="transition-opacity duration-200 opacity-0 h-full" style="height:100%">' +
        html +
        "</div>";
      requestAnimationFrame(() => {
        const inner = popupContent.firstElementChild;
        if (!inner) return;
        const imgs = inner.querySelectorAll("img");
        if (imgs.length) {
          let loaded = 0,
            total = imgs.length;
          const done = () => inner.classList.remove("opacity-0");
          imgs.forEach((img) => {
            if (img.complete) {
              if (++loaded === total) done();
            } else {
              const onEnd = () => {
                img.removeEventListener("load", onEnd);
                img.removeEventListener("error", onEnd);
                if (++loaded === total) done();
              };
              img.addEventListener("load", onEnd);
              img.addEventListener("error", onEnd);
            }
          });
          // safety timeout in case events don’t fire
          setTimeout(done, 4000);
        } else {
          inner.classList.remove("opacity-0");
        }
      });
      popup.classList.remove("popup-loading");
    })
    .catch(() => {
      popupContent.innerHTML = `
        <div class="p-4 text-center">
          <div class="text-red-400 mb-2">Failed to load content.</div>
          <button class="xp-btn" id="retry-load">Retry</button>
        </div>`;
      const retry = document.getElementById("retry-load");
      if (retry) retry.onclick = () => loadPopupContent(url, title);
      popup.classList.remove("popup-loading");
    });
}

// Map icons to pages and titles
const iconMap = [
  {
    selector: 'img[alt="About"]',
    url: "fragments/about",
    title: "About MLSC",
    id: "win-about",
  },
  {
    selector: 'img[alt="Registrations"]',
    action: () => {
      window.location.href = "/register";
    },
    title: "Registrations",
    id: "win-register",
  },
  {
    selector: 'img[alt="Users"]',
    url: "fragments/team",
    title: "Meet the Team",
    id: "win-team",
  },
  {
    selector: 'img[alt="Timeline"]',
    action: () => {
      window.location.href = "/timeline";
    },
    title: "Sacred Timeline",
    id: "win-timeline",
  },
  {
    selector: 'img[alt="Globe"]',
    url: "fragments/lore",
    title: "The Lore",
    id: "win-lore",
  },
];

iconMap.forEach(({ selector, url, title, id, action }) => {
  const nodes = document.querySelectorAll(selector);
  if (!nodes.length) return;
  nodes.forEach((el) => {
    const clickable = el.closest(".icon") || el.parentElement || el;
    clickable.addEventListener("click", () => {
      if (action && typeof action === "function") {
        action();
      } else if (url) {
        createAppWindow(id, title, url);
      }
    });
  });
});

// Popup close button (with animation)
// document.getElementById("popup-close").onclick = function () {
//   const popup = document.getElementById("popup");
//   popup.classList.remove("opacity-100", "scale-100");
//   popup.classList.add("opacity-0", "scale-95");
//   setTimeout(() => {
//     popup.classList.add("hidden");

//     // Remove taskbar item
//     const title = document.getElementById("popup-title").textContent;
//     const taskItem = document.querySelector(`[data-task="${title}"]`);
//     if (taskItem) taskItem.remove();
//   }, 300);
// };

// Dragging popup (yet to smoothen out)
// (function () {
//   const popup = document.getElementById("popup");
//   const header = document.getElementById("popup-header");
//   let isDragging = false,
//     startX = 0,
//     startY = 0,
//     origX = 0,
//     origY = 0;
//   let lastX = 0,
//     lastY = 0,
//     animating = false;

//   function animate() {
//     if (!isDragging) {
//       animating = false;
//       return;
//     }
//     popup.style.left = lastX + "px";
//     popup.style.top = lastY + "px";
//     popup.style.right = "auto";
//     popup.style.bottom = "auto";
//     popup.style.position = "fixed";
//     requestAnimationFrame(animate);
//   }

//   header.addEventListener("mousedown", function (e) {
//     if (popup.classList.contains("hidden")) return;
//     isDragging = true;
//     startX = e.clientX;
//     startY = e.clientY;
//     const rect = popup.getBoundingClientRect();
//     origX = rect.left;
//     origY = rect.top;
//     document.body.style.userSelect = "none";
//     lastX = origX;
//     lastY = origY;
//     if (!animating) {
//       animating = true;
//       requestAnimationFrame(animate);
//     }
//   });

//   document.addEventListener("mousemove", function (e) {
//     if (!isDragging) return;
//     let dx = e.clientX - startX;
//     let dy = e.clientY - startY;
//     lastX = origX + dx;
//     lastY = origY + dy;
//   });

//   document.addEventListener("mouseup", function () {
//     isDragging = false;
//     document.body.style.userSelect = "";
//   });
// })();

function createAppWindow(id, title, url) {
  // 1. Check if window already exists
  let existing = document.getElementById(id);
  if (existing) {
    if (existing.classList.contains("hidden")) {
      existing.classList.remove("hidden");
    }
    bringToFront(existing);
    return;
  }

  // 2. Create window container
  const popup = document.createElement("div");
  popup.id = id;
  popup.className =
    "popup fixed bg-slate-600 border-2 border-slate-100 transition-all duration-300 scale-95 opacity-0 w-[300px] h-[400px] sm:w-[600px] sm:h-[400px]";
  popup.dataset.state = "partial";

  // Center for mobile, random for desktop
  if (window.innerWidth < 640) {
    // Mobile: center
    popup.style.left = "50%";
    popup.style.top = "50%";
    popup.style.transform = "translate(-50%, -50%)";
  } else {
    // Desktop: random position
    const winWidth = 600;
    const winHeight = 400;
    const maxX = window.innerWidth - winWidth;
    const maxY = window.innerHeight - winHeight;
    const randX = Math.floor(Math.random() * maxX);
    const randY = Math.floor(Math.random() * maxY);
    popup.style.left = `${randX}px`;
    popup.style.top = `${randY}px`;
  }
  popup.style.zIndex = ++zIndexCounter;

  // 3. Window header
  const header = document.createElement("div");
  header.className =
    "header flex justify-between items-center px-1 py-1 bg-slate-100 cursor-move select-none";
  header.innerHTML = `
    <div class="ml-2 text-black font-semibold">${title}</div>
    <div class="flex gap-1">
      <button title="Toggle Size" class="minimize-btn w-6 h-6 bg-slate-400 hover:bg-slate-700 text-sm font-bold border">▭</button>
      <button title="Close" class="close-btn w-6 h-6 bg-slate-400 hover:bg-slate-700 text-sm font-bold border">X</button>
    </div>
  `;

  // 4. Window content
  const content = document.createElement("div");
  // Remove inner padding so loaded fragments render edge-to-edge
  content.className =
    "content w-full h-[calc(100%-2.5rem)] overflow-auto text-white p-0";
  // Prevent scroll chaining and ensure opaque dark background inside window
  content.style.overscrollBehavior = "contain";
  content.style.backgroundColor = "#0b1020";
  // Add loading class to show header progress bar and render a skeleton
  popup.classList.add("popup-loading");
  content.innerHTML = getSkeletonHTML();
  fetch(url)
    .then((res) => res.text())
    .then((html) => {
      content.innerHTML =
        '<div class="transition-opacity duration-200 opacity-0 h-full" style="height:100%">' +
        html +
        "</div>";
      requestAnimationFrame(() => {
        const inner = content.firstElementChild;
        if (!inner) return;
        const imgs = inner.querySelectorAll("img");
        if (imgs.length) {
          let loaded = 0,
            total = imgs.length;
          const done = () => inner.classList.remove("opacity-0");
          imgs.forEach((img) => {
            if (img.complete) {
              if (++loaded === total) done();
            } else {
              const onEnd = () => {
                img.removeEventListener("load", onEnd);
                img.removeEventListener("error", onEnd);
                if (++loaded === total) done();
              };
              img.addEventListener("load", onEnd);
              img.addEventListener("error", onEnd);
            }
          });
          setTimeout(done, 4000);
        } else {
          inner.classList.remove("opacity-0");
        }
      });
      popup.classList.remove("popup-loading");
      attachRegisterFormHandler(content);
    })
    .catch(() => {
      content.innerHTML = `
        <div class="p-4 text-center">
          <div class='text-red-400 mb-2'>Failed to load content.</div>
          <button class="xp-btn" id="retry-${id}">Retry</button>
        </div>`;
      const retryBtn = document.getElementById(`retry-${id}`);
      if (retryBtn)
        retryBtn.onclick = () => {
          popup.classList.add("popup-loading");
          content.innerHTML = getSkeletonHTML();
          // re-run fetch
          fetch(url)
            .then((res) => res.text())
            .then((html) => {
              content.innerHTML =
                '<div class="transition-opacity duration-200 opacity-0 h-full" style="height:100%">' +
                html +
                "</div>";
              requestAnimationFrame(() => {
                const inner = content.firstElementChild;
                if (!inner) return;
                const imgs = inner.querySelectorAll("img");
                if (imgs.length) {
                  let loaded = 0,
                    total = imgs.length;
                  const done = () => inner.classList.remove("opacity-0");
                  imgs.forEach((img) => {
                    if (img.complete) {
                      if (++loaded === total) done();
                    } else {
                      const onEnd = () => {
                        img.removeEventListener("load", onEnd);
                        img.removeEventListener("error", onEnd);
                        if (++loaded === total) done();
                      };
                      img.addEventListener("load", onEnd);
                      img.addEventListener("error", onEnd);
                    }
                  });
                  setTimeout(done, 4000);
                } else {
                  inner.classList.remove("opacity-0");
                }
              });
              popup.classList.remove("popup-loading");
              attachRegisterFormHandler(content);
            })
            .catch(() => {
              content.innerHTML =
                "<div class='text-red-400 p-4'>Failed to load content again. Please check your connection.</div>";
              popup.classList.remove("popup-loading");
            });
        };
    });

  // 5. Assemble popup
  popup.appendChild(header);
  popup.appendChild(content);
  document.body.appendChild(popup);

  // Lock scroll BEFORE reflow
  if (!document.body.classList.contains("lock-scroll")) {
    document.body.style.overflow = "hidden";
    document.body.classList.add("lock-scroll");
  }
  // 6. Animate in
  popup.classList.remove("hidden", "opacity-0", "scale-95");

  setTimeout(() => {
    popup.classList.add("opacity-100", "scale-100");
  }, 10);

  // 7. Add to taskbar
  const taskbar = document.getElementById("taskbar-apps");
  const taskBtn = document.createElement("button");

  taskBtn.className =
    "taskbar-btn flex items-center gap-2 text-black px-3 py-1 text-sm font-mono border border-[#808080] bg-gradient-to-b from-[#d4d0c8] to-[#b5b5b5] shadow-inner hover:brightness-90 active:translate-y-[1px] h-10 rounded-sm";

  // Create and add icon FIRST
  const iconImg = document.createElement("img");
  iconImg.src = iconMap.find((i) => i.title === title)?.selector
    ? document.querySelector(iconMap.find((i) => i.title === title).selector)
        ?.src
    : "logo.png"; // fallback icon
  iconImg.alt = "icon";
  iconImg.className = "w-10 h-10 image-render-pixelated";

  //  Add label text (disable on small screens)
  const textSpan = document.createElement("span");
  if (window.innerWidth >= 640) {
    // Show label only on screens >= 640px (sm)
    textSpan.textContent = title;
  }

  // Append icon first, then text
  taskBtn.appendChild(iconImg);
  taskBtn.appendChild(textSpan);

  //  Onclick to toggle window
  taskBtn.onclick = () => {
    const isHidden = popup.classList.contains("hidden");

    if (isHidden) {
      popup.classList.remove("hidden", "opacity-0", "scale-95");
      popup.classList.add("opacity-100", "scale-100");
      bringToFront(popup);

      // Only activate this one
      document
        .querySelectorAll(".taskbar-btn")
        .forEach((btn) => btn.classList.remove("active-task"));
      taskBtn.classList.add("active-task");

      document.body.classList.add("lock-scroll");
    } else {
      popup.classList.remove("opacity-100", "scale-100");
      popup.classList.add("opacity-0", "scale-95");
      setTimeout(() => {
        popup.classList.add("hidden");
        taskBtn.classList.remove("active-task");

        const anyStillOpen =
          document.querySelectorAll(".popup:not(.hidden)").length > 0;
        if (!anyStillOpen) {
          document.body.classList.remove("lock-scroll");
          document.body.style.overflow = "";
        }
      }, 300);
    }
  };

  // Append to taskbar at the end
  taskbar.appendChild(taskBtn);

  // 8. Bring to front on click
  popup.addEventListener("mousedown", () => bringToFront(popup));

  // 9. Close button
  header.querySelector(".close-btn").onclick = (e) => {
    e.stopPropagation();
    popup.remove();
    taskBtn.remove();

    const anyStillOpen =
      document.querySelectorAll(".popup:not(.hidden)").length > 0;
    if (!anyStillOpen) {
      document.body.classList.remove("lock-scroll");
      document.body.style.overflow = "";
    }
  };

  // 10. Minimize/restore button
  header.querySelector(".minimize-btn").onclick = (e) => {
    e.stopPropagation();
    if (popup.dataset.state === "fullscreen") {
      if (window.innerWidth < 640) {
        // Mobile: center
        popup.style.left = "50%";
        popup.style.top = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.width = "300px";
        popup.style.height = "400px";
      } else {
        popup.style.left = "calc(50% - 300px)";
        popup.style.top = "calc(50% - 200px)";
        popup.style.transform = "";
        popup.style.width = "600px";
        popup.style.height = "400px";
      }
      // Restore border if previously removed
      popup.style.border = "";
      // Restore content height relative to header height in partial mode
      content.style.height = "calc(100% - 2.5rem)";
      content.style.overscrollBehavior = "contain";
      content.style.backgroundColor = "#0b1020";
      popup.dataset.state = "partial";
    } else {
      popup.style.left = "0";
      popup.style.top = "0";
      popup.style.transform = "";
      popup.style.width = "100vw";
      popup.style.height = "100vh";
      // Remove border so the window covers the viewport edge-to-edge
      popup.style.border = "none";
      // Ensure content fills below the header without inner gaps
      content.style.padding = "0";
      // Compute content height dynamically to avoid any gap
      try {
        const hdrH = header.getBoundingClientRect().height || 40;
        content.style.height = `calc(100% - ${Math.round(hdrH)}px)`;
      } catch (_) {
        content.style.height = "calc(100% - 2.5rem)";
      }
      // Prevent overscroll chaining in fullscreen and keep opaque background
      content.style.overscrollBehavior = "contain";
      content.style.backgroundColor = "#0b1020";
      popup.dataset.state = "fullscreen";
    }
  };

  // 11. Make draggable
  makeDraggable(popup, header);

  // 12. Randomize position (already handled above for desktop)
  bringToFront(popup);
}

function attachRegisterFormHandler(content) {
  const form = content.querySelector("#register-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const formData = new FormData(form);

      fetch("/register", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.text())
        .then((html) => {
          content.innerHTML = html;
        })
        .catch(() => {
          content.innerHTML =
            "<div class='text-red-500 p-4'>Error occurred during submission</div>";
        });
    });
  } else {
    console.warn(" No #register-form found in loaded content");
  }
}

// Generate a simple, responsive skeleton layout for popup loading state
function getSkeletonHTML() {
  return `
    <div class="w-full h-full">
      <div class="grid grid-cols-3 gap-3 p-4 sm:p-6">
        <div class="col-span-3 skeleton h-40 rounded-md"></div>
        <div class="col-span-3 space-y-2">
          <div class="skeleton h-4 w-3/4 rounded"></div>
          <div class="skeleton h-4 w-full rounded"></div>
          <div class="skeleton h-4 w-2/3 rounded"></div>
        </div>
        <div class="skeleton h-16 rounded"></div>
        <div class="skeleton h-16 rounded"></div>
        <div class="skeleton h-16 rounded"></div>
      </div>
    </div>`;
}
