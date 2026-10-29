import { initPortfolioMotion } from "./portfolio.js";
import { initPresentation } from "./presentation.js";

const HANDS_FRAME_COUNT = 80;
const TITLE_FRAME_COUNT = 69;

// Title scrub window in the same 0–1 scrollFraction used by the hands sequence.
const TITLE_START = 0.0;
const TITLE_END = 1.0;

// Display size/position. Height is derived from the 1362×344 frame aspect.
const TITLE_MAX_WIDTH = 720;
const TITLE_FRAME_WIDTH = 1362;
const TITLE_FRAME_HEIGHT = 344;
const TITLE_CENTER_Y = 0.48;

// Frozen header once the title sequence finishes.
const TITLE_NAV_FRAME = 68;
const TITLE_NAV_WIDTH = 340;
const TITLE_NAV_TOP = 8;
const TITLE_NAV_MORPH_VH = 0.5;

// 1 uses all vertical overflow of the cover-scaled background across the page.
// Lower values = slower / more subtle.
const BACKGROUND_PARALLAX_STRENGTH = 0.42;
const BACKGROUND_OVERFLOW = 1.22;

function rangeProgress(progress, start, end) {
  if (end === start) return progress >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

function frameIndexFromProgress(progress, frameCount) {
  return Math.min(
    frameCount - 1,
    Math.max(0, Math.floor(progress * frameCount))
  );
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

function preloadFrames(frameCount, getSrc) {
  const images = new Array(frameCount);
  let loaded = 0;
  return new Promise((resolve) => {
    if (frameCount === 0) {
      resolve(images);
      return;
    }
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      images[i] = img;
      const done = () => {
        loaded += 1;
        if (loaded === frameCount) resolve(images);
      };
      img.onload = done;
      img.onerror = done;
      img.src = getSrc(i);
    }
  });
}

class Application {
  constructor() {
    this.hero = document.querySelector("#hero");
    this.me = document.querySelector("#me");
    this.canvas = document.querySelector("#hands");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.style.backgroundColor = "transparent";
    this.resizeHandsCanvas();

    this.titleCanvas = document.querySelector("#title");
    this.titleCtx = this.titleCanvas.getContext("2d");

    this.bg = document.querySelector("#background");

    this.images = [];
    this.titleImages = [];
    this.totalImages = HANDS_FRAME_COUNT;
    this.currentFrameIndex = 1;
    this.titleFrameIndex = 0;
    this.raf = null;
    this.bgReady = false;

    this.prepareBackground();

    Promise.all([
      preloadFrames(
        HANDS_FRAME_COUNT,
        (i) =>
          "./images/hands/frame_" +
          String(i).padStart(2, "0") +
          "_delay-0.06s.png"
      ),
      preloadFrames(
        TITLE_FRAME_COUNT,
        (i) => "./images/title/" + String(i).padStart(3, "0") + ".png"
      ),
    ]).then(([handsImages, titleImages]) => {
      this.images = handsImages;
      this.titleImages = titleImages;
      this.addEventListeners();
      this.updateFromScroll();
      this.render();
    });
  }

  prepareBackground() {
    const apply = () => {
      this.bgReady = this.bg.naturalWidth > 0;
      this.updateFromScroll();
    };
    if (this.bg.complete && this.bg.naturalWidth) apply();
    else this.bg.addEventListener("load", apply, { once: true });
  }

  getScrollMetrics() {
    const scrollTop = document.documentElement.scrollTop;
    const heroTop = this.hero.offsetTop;
    const heroRange = Math.max(
      1,
      this.hero.offsetHeight - window.innerHeight
    );
    const scrollFraction = rangeProgress(
      scrollTop,
      heroTop,
      heroTop + heroRange
    );
    const pageRange = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const pageProgress = rangeProgress(scrollTop, 0, pageRange);
    return { scrollTop, heroRange, scrollFraction, pageProgress };
  }

  resizeHandsCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  addEventListeners() {
    window.addEventListener("scroll", () => this.scheduleRender(), {
      passive: true,
    });
    window.addEventListener("resize", () => {
      this.resizeHandsCanvas();
      this.scheduleRender();
    });
  }

  scheduleRender() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = null;
      if (this.presentationLock) return;
      this.updateFromScroll();
      this.render();
    });
  }

  holdPresentation() {
    if (!this.presentationLock) {
      this.lockedPageProgress = this.getScrollMetrics().pageProgress;
    }
    this.presentationLock = true;
    this.hideHeroArt();
  }

  playHeroLoop() {
    this.presentationLock = true;
    this.heroLoop = true;
    this.canvas.style.visibility = "visible";
    this.titleCanvas.style.visibility = "visible";
    this.pingIndex = 0;
    this.pingDir = 1;
    this.pingStamp = 0;
    this.titleFrameIndex = TITLE_NAV_FRAME;
    this.syncTitleLayout(0, Math.max(this.hero.offsetHeight, window.innerHeight));
    this.renderTitle();
    if (this.pingRaf) cancelAnimationFrame(this.pingRaf);
    this.pingRaf = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      this.currentFrameIndex = 0;
      this.renderHands();
      return;
    }
    const tick = (now) => {
      if (!this.heroLoop) return;
      const last = Math.max(0, this.images.length - 1);
      if (!this.images.length) {
        this.pingRaf = requestAnimationFrame(tick);
        return;
      }
      if (!this.pingStamp) this.pingStamp = now;
      if (now - this.pingStamp >= 60) {
        this.pingStamp = now;
        this.pingIndex += this.pingDir;
        if (this.pingIndex >= last) {
          this.pingIndex = last;
          this.pingDir = -1;
        } else if (this.pingIndex <= 0) {
          this.pingIndex = 0;
          this.pingDir = 1;
        }
        this.currentFrameIndex = this.pingIndex;
      }
      this.renderHands();
      this.pingRaf = requestAnimationFrame(tick);
    };
    this.pingRaf = requestAnimationFrame(tick);
  }

  hideHeroArt() {
    this.heroLoop = false;
    if (this.pingRaf) cancelAnimationFrame(this.pingRaf);
    this.pingRaf = null;
    this.canvas.style.visibility = "hidden";
    this.titleCanvas.style.visibility = "hidden";
  }

  releasePresentation() {
    this.hideHeroArt();
    this.presentationLock = false;
    this.canvas.style.visibility = "";
    this.titleCanvas.style.visibility = "";
    this.updateFromScroll();
    this.render();
  }

  updateFromScroll() {
    if (this.presentationLock) return;
    const { scrollTop, heroRange, scrollFraction, pageProgress } =
      this.getScrollMetrics();

    this.currentFrameIndex = frameIndexFromProgress(
      scrollFraction,
      HANDS_FRAME_COUNT
    );

    const titleProgress = rangeProgress(
      scrollFraction,
      TITLE_START,
      TITLE_END
    );
    this.titleFrameIndex =
      titleProgress >= 1
        ? TITLE_NAV_FRAME
        : frameIndexFromProgress(titleProgress, TITLE_FRAME_COUNT);

    this.syncHandsVisibility();
    this.syncTitleLayout(scrollTop, heroRange);
    this.syncBackground(pageProgress);
  }

  syncHandsVisibility() {
    const meTop = this.me.getBoundingClientRect().top;
    // Stay fixed in the viewport; the opaque ME section covers the wrists.
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0px";
    this.canvas.style.left = "0px";
    this.canvas.style.transform = "none";
    this.canvas.style.visibility = meTop <= 0 ? "hidden" : "visible";
  }

  syncTitleLayout(scrollTop, heroRange) {
    const morphT = smoothstep(
      rangeProgress(
        scrollTop,
        heroRange,
        heroRange + window.innerHeight * TITLE_NAV_MORPH_VH
      )
    );

    const dpr = window.devicePixelRatio || 1;
    const introWidth = Math.min(TITLE_MAX_WIDTH, window.innerWidth * 0.9);
    const navWidth = Math.min(TITLE_NAV_WIDTH, window.innerWidth * 0.72);
    const width = lerp(introWidth, navWidth, morphT);
    const height = width * (TITLE_FRAME_HEIGHT / TITLE_FRAME_WIDTH);
    const introCenterY = window.innerHeight * TITLE_CENTER_Y;
    const navCenterY = TITLE_NAV_TOP + height / 2;
    const centerY = lerp(introCenterY, navCenterY, morphT);

    this.titleCanvas.style.width = width + "px";
    this.titleCanvas.style.height = height + "px";
    this.titleCanvas.style.left = "50%";
    this.titleCanvas.style.top = centerY + "px";
    this.titleCanvas.style.transform = "translate(-50%, -50%)";

    const pixelW = Math.round(width * dpr);
    const pixelH = Math.round(height * dpr);
    if (this.titleCanvas.width !== pixelW || this.titleCanvas.height !== pixelH) {
      this.titleCanvas.width = pixelW;
      this.titleCanvas.height = pixelH;
    }
  }

  syncBackground(pageProgress) {
    if (!this.bgReady) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const iw = this.bg.naturalWidth;
    const ih = this.bg.naturalHeight;
    const coverScale = Math.max(vw / iw, vh / ih);
    const scale = Math.max(coverScale, (vh * BACKGROUND_OVERFLOW) / ih);
    const displayW = iw * scale;
    const displayH = ih * scale;
    const overflowY = Math.max(0, displayH - vh);
    const overflowX = Math.max(0, displayW - vw);
    const travel = overflowY * BACKGROUND_PARALLAX_STRENGTH;
    const translateY = -pageProgress * travel;
    const translateX = -overflowX / 2;

    this.bg.style.width = displayW + "px";
    this.bg.style.height = displayH + "px";
    this.bg.style.transform =
      "translate3d(" + translateX + "px, " + translateY + "px, 0)";
  }

  render() {
    this.renderHands();
    this.renderTitle();
  }

  renderHands() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const img = this.images[this.currentFrameIndex];
    if (!img || !img.complete || !img.naturalWidth) return;

    this.ctx.drawImage(
      img,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    // for website scaling
    const canvasRatio = this.canvas.width / this.canvas.height;
    const imgRatio = img.width / img.height;

    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawWidth = this.canvas.width;
      drawHeight = drawWidth / imgRatio;
      offsetY = (this.canvas.height - drawHeight) / 2;
    } else {
      drawHeight = this.canvas.height;
      drawWidth = drawHeight * imgRatio;
      offsetX = (this.canvas.width - drawWidth) / 2;
    }
    this.ctx.drawImage(
      img,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    /*
    this.ctx.save();
    if (this.totalImages - this.currentFrameIndex < 10) {
      this.ctx.globalAlpha = (this.totalImages - this.currentFrameIndex) / 10
    }
    this.ctx.globalAlpha = 1;
    this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    this.ctx.restore(); */
  }

  renderTitle() {
    const ctx = this.titleCtx;
    const canvas = this.titleCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = this.titleImages[this.titleFrameIndex];
    if (!img || !img.complete || !img.naturalWidth) return;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
}

class SideNav {
  constructor() {
    this.nav = document.querySelector(".side-nav");
    this.toggle = document.querySelector(".side-nav__toggle");
    this.panel = document.querySelector("#side-nav-panel");
    this.current = document.querySelector("#nav-current");
    this.links = [...this.panel.querySelectorAll("a")];
    this.sections = [...document.querySelectorAll("[data-nav-section]")];
    this.spyRaf = null;

    this.toggle.addEventListener("click", () => this.setOpen(!this.isOpen()));
    this.links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const id = link.getAttribute("href");
        const target = document.querySelector(id);
        if (!target) return;
        event.preventDefault();
        this.setOpen(false);
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.pushState(null, "", id);
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.setOpen(false);
    });
    document.addEventListener("click", (event) => {
      if (!this.nav.contains(event.target)) this.setOpen(false);
    });

    this.observer = new IntersectionObserver(() => this.refreshActive(), {
      root: null,
      rootMargin: "-12% 0px -70% 0px",
      threshold: [0, 0.2, 0.5, 1],
    });
    this.sections.forEach((section) => this.observer.observe(section));
    window.addEventListener(
      "scroll",
      () => {
        if (this.spyRaf) return;
        this.spyRaf = requestAnimationFrame(() => {
          this.spyRaf = null;
          this.refreshActive();
        });
      },
      { passive: true }
    );
    this.refreshActive();
  }

  isOpen() {
    return this.toggle.getAttribute("aria-expanded") === "true";
  }

  setOpen(open) {
    this.toggle.setAttribute("aria-expanded", open ? "true" : "false");
    this.panel.hidden = !open;
  }

  refreshActive() {
    const spy = window.innerHeight * 0.22;
    let active = this.sections[0];
    this.sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= spy) active = section;
    });

    const label = active.dataset.navLabel || "";
    this.current.textContent = label;
    this.links.forEach((link) => {
      const href = link.getAttribute("href");
      link.classList.toggle("is-active", href === "#" + active.id);
    });
  }
}

window.onload = () => {
  window.app = new Application();
  window.sideNav = new SideNav();
  initPortfolioMotion();
  initPresentation();
};
