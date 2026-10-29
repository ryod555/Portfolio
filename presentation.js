const STORAGE_KEY = "hermes-view-mode";

const SECTION_LABEL = {
  hero: "Hero",
  me: "Me",
  website: "Website Works",
  design: "Design Works",
  contact: "Contact",
};

const SCENES = [
  { id: "hero", section: "hero", kind: "hero" },
  { id: "me-edu", section: "me", kind: "me", project: "me", source: ".about-edu", portrait: true },
  { id: "me-exp", section: "me", kind: "me", project: "me", source: ".about-experience" },
  { id: "me-skills", section: "me", kind: "me", project: "me", source: ".about-skills" },
  { id: "selva-0", section: "website", project: "selva", exhibit: 0, root: "#selvacuts" },
  { id: "selva-1", section: "website", project: "selva", exhibit: 1, root: "#selvacuts" },
  { id: "selva-2", section: "website", project: "selva", exhibit: 2, root: "#selvacuts" },
  { id: "selva-3", section: "website", project: "selva", exhibit: 3, root: "#selvacuts" },
  { id: "tuv-0", section: "website", project: "tuv", exhibit: 0, root: "#unpopular-view" },
  { id: "tuv-1", section: "website", project: "tuv", exhibit: 1, root: "#unpopular-view" },
  { id: "tuv-2", section: "website", project: "tuv", exhibit: 2, root: "#unpopular-view" },
  { id: "tuv-3", section: "website", project: "tuv", exhibit: 3, root: "#unpopular-view" },
  { id: "spring-0", section: "design", project: "spring", exhibit: 0, root: "#spring", figure: "#spring .spread__front" },
  { id: "spring-1", section: "design", project: "spring", exhibit: 1, root: "#spring", figure: "#spring .spread__emblem" },
  { id: "spring-2", section: "design", project: "spring", exhibit: 2, root: "#spring", figure: "#spring .spread__mark" },
  { id: "fall-0", section: "design", project: "fall", exhibit: 0, root: "#fall", figure: "#fall .spread__back" },
  { id: "fall-1", section: "design", project: "fall", exhibit: 1, root: "#fall", figure: "#fall .spread__front-print" },
  { id: "thrift-0", section: "design", project: "thrift", exhibit: 0, root: "#thrift", figure: "#thrift .poster--lead" },
  { id: "thrift-1", section: "design", project: "thrift", exhibit: 1, root: "#thrift", figure: "#thrift .poster--offset" },
  { id: "contact", section: "contact", kind: "contact" },
];

const HASH_SCENE = {
  hero: "hero",
  me: "me-edu",
  "website-works": "selva-0",
  selvacuts: "selva-0",
  "unpopular-view": "tuv-0",
  "design-works": "spring-0",
  spring: "spring-0",
  fall: "fall-0",
  thrift: "thrift-0",
  contact: "contact",
};

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pad = (n) => String(n).padStart(2, "0");

export function initPresentation() {
  const root = document.querySelector("#presentation");
  if (!root) return;

  const stage = root.querySelector(".presentation__stage");
  const progress = root.querySelector("[data-present-progress]");
  const dots = root.querySelector("[data-present-dots]");
  const prev = root.querySelector("[data-present-prev]");
  const next = root.querySelector("[data-present-next]");
  const sectionButtons = [...root.querySelectorAll("[data-present-section]")];

  const homes = new Map();
  let index = 0;
  let open = false;
  let savedScroll = 0;
  let lastFocus = null;
  let direction = 1;
  let portraitIndex = 0;
  let wheelLock = false;

  document.querySelectorAll("[data-present]").forEach((el) => {
    if (el.id && ["spring", "fall", "thrift"].includes(el.id)) return;
    if (el.querySelector(":scope > .present-cue")) return;
    const cue = document.createElement("span");
    cue.className = "present-cue";
    cue.setAttribute("aria-hidden", "true");
    cue.textContent = "View fullscreen ↗";
    el.append(cue);
  });

  const sceneById = (id) => SCENES.find((scene) => scene.id === id);

  const park = (node) => {
    if (!node || homes.has(node)) return;
    homes.set(node, { parent: node.parentNode, next: node.nextSibling });
  };

  const restoreNode = (node) => {
    const home = homes.get(node);
    if (!home?.parent) return;
    if (node.tagName === "VIDEO") {
      node.pause();
      node.controls = false;
    }
    node.onclick = null;
    home.parent.insertBefore(node, home.next);
    homes.delete(node);
  };

  const restoreAll = () => {
    [...homes.keys()].forEach(restoreNode);
  };

  const setInert = (on) => {
    [".page", ".side-nav", "#hero", ".skip-link"].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node) node.inert = on;
    });
  };

  const showHeroArt = (on) => {
    document.body.classList.toggle("is-present-hero", on);
    if (!window.app) return;
    if (on) window.app.playHeroLoop();
    else window.app.hideHeroArt();
  };

  const render = () => {
    const scene = SCENES[index];
    restoreAll();
    document.querySelectorAll("video").forEach((video) => {
      if (!video.paused) video.pause();
    });

    stage.replaceChildren();
    const same = stage.dataset.project === (scene.project || scene.id);
    stage.dataset.project = scene.project || scene.id;

    if (scene.kind === "hero") {
      showHeroArt(true);
      const hero = document.createElement("div");
      hero.className = "present-hero";
      hero.innerHTML = `
        <p class="present-hero__name">Ryan (Ryo) Dang</p>
        <p class="present-hero__hint">Use the arrows to move through the work.</p>
      `;
      stage.append(hero);
    } else {
      showHeroArt(false);
      if (scene.kind === "me") stage.append(renderMe(scene));
      else if (scene.kind === "contact") stage.append(renderContact());
      else if (scene.section === "website") stage.append(renderWebsite(scene, same));
      else if (scene.section === "design") stage.append(renderDesign(scene, same));
    }

    if (!reducedMotion()) {
      stage.classList.remove("is-swap", "is-back");
      void stage.offsetWidth;
      stage.classList.toggle("is-back", direction < 0);
      stage.classList.add("is-swap");
    }

    const total = SCENES.length;
    const group = scene.project
      ? SCENES.filter((item) => item.project === scene.project)
      : [scene];
    const groupIndex = Math.max(0, group.findIndex((item) => item.id === scene.id));
    const section = SECTION_LABEL[scene.section];
    progress.textContent = group.length > 1
      ? `${section} · ${pad(groupIndex + 1)} / ${pad(group.length)}`
      : `${section} · ${pad(index + 1)} / ${pad(total)}`;
    progress.dataset.overall = `${pad(index + 1)} / ${pad(total)}`;

    dots.replaceChildren();
    if (group.length > 1) {
      group.forEach((item, dotIndex) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "presentation__dot";
        button.setAttribute("aria-label", `${section} exhibit ${dotIndex + 1}`);
        if (item.id === scene.id) button.setAttribute("aria-current", "true");
        button.addEventListener("click", () => goTo(SCENES.indexOf(item)));
        dots.append(button);
      });
    }

    sectionButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.presentSection === scene.section);
    });
    prev.disabled = index === 0;
    next.disabled = index === SCENES.length - 1;
    root.hidden = false;
    document.body.classList.add("is-presenting");
  };

  const renderMe = (scene) => {
    const wrap = document.createElement("div");
    wrap.className = "present-split present-split--me";
    const copy = cloneClean(scene.source);
    copy.classList.add("present-panel");
    if (scene.portrait) {
      const shots = [...document.querySelectorAll(".portrait-carousel__slide img")];
      const figure = document.createElement("figure");
      figure.className = "present-media present-portrait";
      const img = document.createElement("img");
      const shot = shots[portraitIndex] || shots[0];
      if (shot) {
        img.src = shot.currentSrc || shot.src;
        img.alt = shot.alt;
      }
      figure.append(img);
      const controls = document.createElement("div");
      controls.className = "present-portrait__controls";
      const prevShot = document.createElement("button");
      prevShot.type = "button";
      prevShot.textContent = "Previous";
      const nextShot = document.createElement("button");
      nextShot.type = "button";
      nextShot.textContent = "Next";
      const zoom = document.createElement("button");
      zoom.type = "button";
      zoom.textContent = "Zoom";
      const step = (delta) => {
        if (!shots.length) return;
        portraitIndex = (portraitIndex + delta + shots.length) % shots.length;
        const nextImg = shots[portraitIndex];
        img.src = nextImg.currentSrc || nextImg.src;
        img.alt = nextImg.alt;
      };
      prevShot.addEventListener("click", () => step(-1));
      nextShot.addEventListener("click", () => step(1));
      zoom.addEventListener("click", () => openViewer(img.src, img.alt));
      img.addEventListener("click", () => openViewer(img.src, img.alt));
      controls.append(prevShot, nextShot, zoom);
      figure.append(controls);
      wrap.append(figure);
    }
    wrap.append(copy);
    return wrap;
  };

  const renderWebsite = (scene, sameProject) => {
    const split = document.createElement("div");
    split.className = "present-split";
    const column = document.createElement("div");
    column.className = "present-copy";
    const overview = cloneClean(`${scene.root} .deck-overview`);
    overview.classList.add("present-panel", "present-overview");
    if (sameProject) overview.classList.add("is-steady");
    const card = document.querySelectorAll(`${scene.root} .deck-card`)[scene.exhibit];
    const feature = document.createElement("div");
    feature.className = "present-panel present-feature";
    const caption = card?.querySelector(".deck-card__caption");
    if (caption) feature.append(cloneCleanNode(caption));
    column.append(overview, feature);

    const figure = document.createElement("figure");
    figure.className = "present-media";
    const media = card?.querySelector("video, img");
    if (media) {
      park(media);
      if (media.tagName === "VIDEO") {
        media.controls = true;
        if (!media.getAttribute("src") && media.dataset.src) media.src = media.dataset.src;
        const play = media.play();
        if (play && typeof play.catch === "function") play.catch(() => {});
      }
      media.onclick = onMediaClick;
      figure.append(media);
    }
    split.append(column, figure);
    return split;
  };

  const renderDesign = (scene, sameProject) => {
    const split = document.createElement("div");
    split.className = "present-split";
    const column = document.createElement("div");
    column.className = "present-copy";
    const overview = cloneClean(`${scene.root} .design-copy`);
    overview.classList.add("present-panel", "present-overview");
    if (sameProject) overview.classList.add("is-steady");
    const figureNode = document.querySelector(scene.figure);
    const feature = document.createElement("div");
    feature.className = "present-panel present-feature";
    const kicker = document.createElement("p");
    kicker.className = "glass-caption__index";
    kicker.textContent = figureNode?.dataset.exhibitKicker || "";
    const title = document.createElement("h4");
    title.className = "glass-caption__title";
    title.textContent = figureNode?.dataset.exhibitTitle || "";
    const body = document.createElement("p");
    body.className = "glass-caption__body";
    body.textContent = figureNode?.querySelector("img")?.alt || "";
    feature.append(kicker, title, body);
    column.append(overview, feature);

    const figure = document.createElement("figure");
    figure.className = "present-media";
    const media = figureNode?.querySelector("img");
    if (media) {
      park(media);
      media.onclick = onMediaClick;
      figure.append(media);
    }
    split.append(column, figure);
    return split;
  };

  const renderContact = () => {
    const wrap = document.createElement("div");
    wrap.className = "present-contact";
    wrap.innerHTML = `
      <div class="present-wings" aria-hidden="true">
        <div class="wing-slot wing-slot--left"><img src="./images/wings.png" alt="" /></div>
        <div class="wing-slot wing-slot--right"><img src="./images/wings.png" alt="" /></div>
      </div>
    `;
    const card = cloneClean(".contact-card");
    card.classList.add("present-panel");
    wrap.append(card);
    return wrap;
  };

  const onMediaClick = (event) => {
    const media = event.currentTarget;
    if (media.tagName === "IMG") openViewer(media.currentSrc || media.src, media.alt);
    else if (typeof media.requestFullscreen === "function") {
      media.requestFullscreen().catch(() => {});
    }
  };

  const openViewer = (src, alt) => {
    const dialog = document.querySelector("#lightbox");
    const img = dialog?.querySelector("img");
    if (!dialog || !img) return;
    img.src = src;
    img.alt = alt || "";
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
  };

  const goTo = (nextIndex, dir) => {
    const clamped = Math.min(SCENES.length - 1, Math.max(0, nextIndex));
    if (clamped === index && open) return;
    direction = dir || (clamped >= index ? 1 : -1);
    index = clamped;
    if (SCENES[index].kind !== "me" || !SCENES[index].portrait) portraitIndex = 0;
    history.replaceState(null, "", "#present-" + SCENES[index].id);
    render();
  };

  const enter = (id, focus) => {
    const scene = sceneById(id) || SCENES[0];
    index = Math.max(0, SCENES.indexOf(scene));
    if (!open) {
      savedScroll = window.scrollY;
      lastFocus = focus || document.activeElement;
      document.body.style.top = `-${savedScroll}px`;
      document.body.style.position = "fixed";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      window.app?.holdPresentation();
      setInert(true);
      open = true;
      try { localStorage.setItem(STORAGE_KEY, "presentation"); } catch (error) { /* ignore */ }
    }
    direction = 1;
    history.replaceState(null, "", "#present-" + SCENES[index].id);
    render();
    root.querySelector("[data-present-exit]")?.focus();
  };

  const exit = () => {
    if (!open) return;
    open = false;
    restoreAll();
    showHeroArt(false);
    window.app?.releasePresentation();
    root.hidden = true;
    stage.replaceChildren();
    document.body.classList.remove("is-presenting", "is-present-hero");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    setInert(false);
    window.scrollTo(0, savedScroll);
    try { localStorage.setItem(STORAGE_KEY, "normal"); } catch (error) { /* ignore */ }
    if (location.hash.startsWith("#present-")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  };

  document.addEventListener("click", (event) => {
    if (open) return;
    if (event.target.closest("a, input, textarea, select, .artwork-zoom, .portrait-carousel__controls, .portrait-carousel .artwork-open, .presentation, .lightbox")) {
      return;
    }
    const host = event.target.closest("[data-present]");
    if (!host) return;
    enter(host.dataset.present, host);
  });

  root.querySelector("[data-present-exit]").addEventListener("click", exit);
  prev.addEventListener("click", () => goTo(index - 1, -1));
  next.addEventListener("click", () => goTo(index + 1, 1));
  sectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = SCENES.find((scene) => scene.section === button.dataset.presentSection);
      if (target) goTo(SCENES.indexOf(target));
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!open) return;
    const dialog = document.querySelector("#lightbox");
    if (event.key === "Escape") {
      if (dialog?.open) {
        dialog.close();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      exit();
      return;
    }
    if (event.target.closest("input, textarea, select")) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1, 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0, -1);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(SCENES.length - 1, 1);
    }
  }, true);

  root.addEventListener("wheel", (event) => {
    if (!open) return;
    const scroller = event.target.closest(".present-panel, .presentation__stage");
    if (scroller && scroller.scrollHeight > scroller.clientHeight + 8) {
      const atTop = scroller.scrollTop <= 0;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      if ((event.deltaY > 0 && !atBottom) || (event.deltaY < 0 && !atTop)) return;
    }
    event.preventDefault();
    if (wheelLock || Math.abs(event.deltaY) < 28) return;
    wheelLock = true;
    goTo(index + (event.deltaY > 0 ? 1 : -1), event.deltaY > 0 ? 1 : -1);
    window.setTimeout(() => { wheelLock = false; }, 700);
  }, { passive: false });

  const hashScene = () => {
    const present = location.hash.match(/^#present-(.+)$/);
    if (present && sceneById(present[1])) return present[1];
    const id = location.hash.replace("#", "");
    return HASH_SCENE[id] || "";
  };

  const boot = hashScene();
  let prefer = false;
  try { prefer = localStorage.getItem(STORAGE_KEY) === "presentation"; } catch (error) { /* ignore */ }
  if (location.hash.startsWith("#present-") && boot) enter(boot);
  else if (prefer) enter(boot || "hero");
}

function cloneClean(selector) {
  const node = document.querySelector(selector);
  return node ? cloneCleanNode(node) : document.createElement("div");
}

function cloneCleanNode(node) {
  const copy = node.cloneNode(true);
  copy.querySelectorAll(".present-cue, .portrait-carousel, .artwork-zoom").forEach((child) => child.remove());
  copy.removeAttribute("data-present");
  copy.removeAttribute("data-reveal");
  return copy;
}
