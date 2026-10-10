(function () {
  const uiText = JSON.parse(document.getElementById("page-text").textContent);

  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const canonicalUrl = canonicalLink ? canonicalLink.href : location.href;

  const audio = new Audio();
  audio.preload = "none";

  const nowBar = document.getElementById("now");
  const nowText = document.getElementById("now-text");
  const nowStop = document.getElementById("now-stop");

  let activeButton = null;
  let errorTimer = null;

  function buildListenButton(button) {
    button.innerHTML =
      '<svg class="glyph i-play" aria-hidden="true"><use href="#i-play"/></svg>' +
      '<svg class="glyph i-stop" aria-hidden="true"><use href="#i-stop"/></svg>' +
      '<span class="elapsed" aria-hidden="true"></span>';

    const label = document.createElement("span");
    label.className = "listen-label";
    label.textContent = uiText.listen;

    const target = document.createElement("span");
    target.className = "vh";
    target.textContent = " " + uiText.listenTo + " " + button.dataset.title;

    const loadingNote = document.createElement("span");
    loadingNote.className = "state-note";
    loadingNote.setAttribute("aria-hidden", "true");
    loadingNote.textContent = uiText.loading;

    button.append(label, target, loadingNote);
    button.dataset.state = "idle";
  }

  function blockFor(button) {
    return button.closest(".verse") || button.closest(".say");
  }

  function arabicLineFor(block) {
    return block.querySelector(".ar-wrap");
  }

  function wrapArabicLines() {
    document.querySelectorAll(".say, .verse").forEach(function (block) {
      const hasButton = block.querySelector(":scope > .controls .listen");
      const firstArabic = block.querySelector(":scope > .ar");

      if (!hasButton || !firstArabic) return;

      const wrap = document.createElement("div");
      wrap.className = "ar-wrap";

      const progress = document.createElement("span");
      progress.className = "ar-progress";
      progress.setAttribute("aria-hidden", "true");

      firstArabic.replaceWith(wrap);
      wrap.append(firstArabic, progress);
    });
  }

  function paint(button, state) {
    const block = blockFor(button);
    const arabicLine = arabicLineFor(block);
    const isActive = state !== "idle";

    button.dataset.state = state;
    button.querySelector(".listen-label").textContent = isActive ? uiText.stop : uiText.listen;
    block.classList.toggle("is-playing", isActive);

    if (arabicLine) arabicLine.classList.toggle("is-reading", isActive);

    if (!isActive) {
      button.style.removeProperty("--p");
      if (arabicLine) arabicLine.style.removeProperty("--p");
    }
  }

  function showBar() {
    nowBar.hidden = false;
    document.body.classList.add("has-player");
  }

  function hideBar() {
    nowBar.hidden = true;
    document.body.classList.remove("has-player");
  }

  function showNowPlaying(button) {
    const section = button.closest("section");
    const sectionName = section.querySelector(".h-en").textContent;

    clearTimeout(errorTimer);
    nowText.textContent = "";

    const name = document.createElement("b");
    name.textContent = button.dataset.title;

    const where = document.createElement("a");
    where.className = "now-where";
    where.href = "#" + section.id;
    where.textContent = sectionName;

    nowText.append(uiText.playing + " ", name, document.createElement("br"), where);
    nowStop.hidden = false;
    showBar();
  }

  function showError(title) {
    clearTimeout(errorTimer);
    nowText.textContent = uiText.playError.replace("{title}", title);
    nowStop.hidden = true;
    showBar();
    errorTimer = setTimeout(hideBar, 6000);
  }

  function stop() {
    if (!activeButton) return;

    const stoppedButton = activeButton;
    activeButton = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    paint(stoppedButton, "idle");
    hideBar();
  }

  function play(button) {
    const isSameButton = activeButton === button;

    stop();

    if (isSameButton) return;

    activeButton = button;
    audio.src = button.dataset.src;
    paint(button, "loading");
    showNowPlaying(button);

    if ("mediaSession" in navigator && "MediaMetadata" in window) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: button.dataset.title, album: "Sujood" });
    }

    audio.play().catch(function (error) {
      const isStillWanted = activeButton === button;
      const wasInterrupted = error && error.name === "AbortError";

      if (!isStillWanted || wasInterrupted) return;

      stop();
      showError(button.dataset.title);
    });
  }

  audio.addEventListener("playing", function () {
    if (activeButton) paint(activeButton, "playing");
  });

  audio.addEventListener("timeupdate", function () {
    const hasDuration = activeButton && isFinite(audio.duration) && audio.duration > 0;

    if (!hasDuration) return;

    const fraction = (audio.currentTime / audio.duration).toFixed(4);
    const arabicLine = arabicLineFor(blockFor(activeButton));

    activeButton.style.setProperty("--p", fraction);
    if (arabicLine) arabicLine.style.setProperty("--p", fraction);
  });

  audio.addEventListener("ended", stop);

  audio.addEventListener("error", function () {
    const failedButton = activeButton;
    const hasSource = audio.hasAttribute("src");

    if (!failedButton || !hasSource) return;

    stop();
    showError(failedButton.dataset.title);
  });

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("pause", stop);
      navigator.mediaSession.setActionHandler("stop", stop);
    } catch (unsupportedAction) {}
  }

  wrapArabicLines();

  document.querySelectorAll(".listen").forEach(function (button) {
    buildListenButton(button);
    button.addEventListener("click", function () { play(button); });
  });

  nowStop.addEventListener("click", stop);

  document.querySelectorAll(".more-btn").forEach(function (toggle) {
    const panel = document.getElementById(toggle.getAttribute("aria-controls"));

    toggle.innerHTML = '<svg aria-hidden="true"><use href="#i-plus"/></svg><span class="more-label"></span>';

    function setOpen(isOpen) {
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.querySelector(".more-label").textContent = isOpen ? uiText.hideFull : uiText.showFull;

      if (isOpen) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "until-found");
      }
    }

    setOpen(false);
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    panel.addEventListener("beforematch", function () { setOpen(true); });
  });

  const runnerLinks = document.getElementById("runner").querySelectorAll("a");

  if (!("IntersectionObserver" in window)) return;

  function markCurrent(sectionId) {
    runnerLinks.forEach(function (link) {
      const isCurrent = sectionId !== null && link.getAttribute("href") === "#" + sectionId;

      if (isCurrent) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  const sectionsInBand = new Set();

  const sectionWatcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        sectionsInBand.add(entry.target.id);
      } else {
        sectionsInBand.delete(entry.target.id);
      }
    });

    const newest = Array.from(sectionsInBand).pop();

    markCurrent(newest === undefined ? null : newest);
  }, { rootMargin: "-40% 0px -55% 0px" });

  document.querySelectorAll(".pos, .counts").forEach(function (section) {
    sectionWatcher.observe(section);
  });

  const shareButton = document.getElementById("share-btn");
  const shareStatus = document.getElementById("share-status");
  const sharePayload = {
    title: "Sujood",
    text: uiText.shareText,
    url: canonicalUrl
  };

  let shareResetTimer = null;

  function confirmCopied() {
    shareButton.textContent = uiText.linkCopied;
    shareStatus.textContent = uiText.linkCopiedStatus;

    clearTimeout(shareResetTimer);
    shareResetTimer = setTimeout(function () {
      shareButton.textContent = uiText.share;
      shareStatus.textContent = "";
    }, 2400);
  }

  shareButton.addEventListener("click", function () {
    const canShareNatively = typeof navigator.share === "function";

    if (canShareNatively) {
      navigator.share(sharePayload).catch(function () {});
      return;
    }

    function showLinkToCopy() {
      window.prompt(uiText.copyPrompt, sharePayload.url);
    }

    if (!navigator.clipboard) {
      showLinkToCopy();
      return;
    }

    navigator.clipboard.writeText(sharePayload.url).then(confirmCopied, showLinkToCopy);
  });

  const canUseServiceWorker = "serviceWorker" in navigator && window.isSecureContext;

  if (canUseServiceWorker) {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  }
})();
