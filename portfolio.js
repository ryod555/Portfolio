const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initPortfolioMotion() {
  initReveals();
  initVideos();
  initScrollLinked();
  initPortraitCarousel();
  initCardDecks();
  initLightbox();
}

function initReveals() {
  const nodes = [...document.querySelectorAll("[data-reveal]")];
  if (!nodes.length) return;

  if (prefersReducedMotion()) {
    nodes.forEach((node) => node.classList.add("is-in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  nodes.forEach((node) => observer.observe(node));
}

function initVideos() {
  const videos = [...document.querySelectorAll("video[data-src]")].filter((video) => {
    if (prefersReducedMotion()) return true;
    return !video.closest("[data-card-deck]");
  });
  if (!videos.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          if (!video.getAttribute("src") && video.dataset.src) {
            video.src = video.dataset.src;
          }
          const play = video.play();
          if (play && typeof play.catch === "function") play.catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    },
    { rootMargin: "30% 0px 30% 0px", threshold: 0.2 }
  );

  videos.forEach((video) => observer.observe(video));
}

function initScrollLinked() {
  const nodes = [
    ...document.querySelectorAll("[data-scroll-rotate], [data-scroll-shift], [data-parallax]"),
  ];
  if (!nodes.length || prefersReducedMotion()) return;

  let raf = null;
  const update = () => {
    raf = null;
    const vh = window.innerHeight;
    nodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const center = (rect.top + rect.height / 2) / vh;
      const t = Math.min(1, Math.max(-1, 1 - center * 2));

      const mobile = window.innerWidth < 900;
      const rotate = mobile ? 0 : Number(node.dataset.scrollRotate || 0);
      const shift = mobile ? 0 : Number(node.dataset.scrollShift || 0);
      const parallax = mobile ? 0 : Number(node.dataset.parallax || 0);
      const y = parallax ? t * parallax * 80 : shift ? t * shift : 0;
      const r = rotate ? t * rotate : 0;
      node.style.transform = `translate3d(0, ${y}px, 0) rotate(${r}deg)`;
    });
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  update();
}

function initPortraitCarousel() {
  const root = document.querySelector("[data-portrait-carousel]");
  if (!root) return;
  const track = root.querySelector(".portrait-carousel__track");
  const slides = [...root.querySelectorAll(".portrait-carousel__slide")];
  const status = root.querySelector("[data-carousel-status]");
  const dots = [...root.querySelectorAll("[data-carousel-dot]")];
  if (!track || slides.length < 2) return;

  let index = 0;

  const render = () => {
    const width = slides[0].getBoundingClientRect().width;
    track.style.transform = `translate3d(${-index * width}px, 0, 0)`;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      const button = slide.querySelector("button");
      if (button) button.tabIndex = active ? 0 : -1;
    });
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    if (status) {
      const label = `${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
      status.textContent = label;
    }
  };

  const go = (next) => {
    index = (next + slides.length) % slides.length;
    render();
  };

  root.querySelector("[data-carousel-prev]")?.addEventListener("click", () => go(index - 1));
  root.querySelector("[data-carousel-next]")?.addEventListener("click", () => go(index + 1));
  dots.forEach((dot) => {
    dot.addEventListener("click", () => go(Number(dot.dataset.carouselDot)));
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    }
  });
  window.addEventListener("resize", render);

  render();
}

function initCardDecks() {
  const decks = [...document.querySelectorAll("[data-card-deck]")];
  if (!decks.length || prefersReducedMotion()) return;

  const holdRatio = 0.9;
  const tailRatio = 0.4;

  decks.forEach((deck) => {
    const pin = deck.querySelector(".card-deck__pin");
    const cards = [...deck.querySelectorAll(".deck-card")];
    const live = deck.querySelector(".deck-live-caption");
    const dots = deck.querySelector(".deck-dots");
    if (!pin || cards.length < 2) return;

    const measure = () => {
      const vh = window.innerHeight;
      const hold = vh * holdRatio;
      const tail = vh * tailRatio;
      deck.style.height = `${pin.offsetHeight + hold * cards.length + tail}px`;
    };

    let raf = null;
    let lastIndex = -1;

    const update = () => {
      raf = null;
      const deckRect = deck.getBoundingClientRect();
      const stick = parseFloat(getComputedStyle(pin).top) || 0;
      const tail = window.innerHeight * tailRatio;
      const cycle = Math.max(1, deck.offsetHeight - pin.offsetHeight - tail);
      const entered = stick - deckRect.top;
      const progress = Math.min(1, Math.max(0, entered / cycle));
      const count = cards.length;
      const scaled = progress * Math.max(count - 1, 1);
      const active = Math.min(count - 1, Math.max(0, Math.floor(scaled + 0.22)));
      const visible = deckRect.bottom > 0 && deckRect.top < window.innerHeight;

      cards.forEach((card, i) => {
        const local = scaled - i;
        let x = 0;
        let opacity = 1;
        let z = i;
        if (local < 0) {
          z = 12;
        } else if (local < 0.55 || i === count - 1) {
          z = 20;
        } else {
          const t = Math.min(1, (local - 0.55) / 0.45);
          const eased = t * t * (3 - 2 * t);
          x = -104 * eased;
          opacity = 1 - eased;
          z = 30;
        }
        card.style.transform = `translate3d(${x}%, 0, 0)`;
        card.style.opacity = String(opacity);
        card.style.zIndex = String(z);
        card.setAttribute("aria-hidden", i === active ? "false" : "true");
        card.querySelector(".deck-card__caption")?.setAttribute("aria-hidden", "true");
      });

      if (dots) dots.style.setProperty("--deck-index", String(active));

      if (!visible) {
        cards.forEach((card) => {
          const video = card.querySelector("video");
          if (video && !video.paused) video.pause();
        });
        lastIndex = -1;
        return;
      }

      if (active === lastIndex) return;
      lastIndex = active;
      cards.forEach((card, i) => {
        const video = card.querySelector("video");
        if (!video) return;
        if (i === active) {
          if (!video.getAttribute("src") && video.dataset.src) video.src = video.dataset.src;
          const play = video.play();
          if (play && typeof play.catch === "function") play.catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      });
      const caption = cards[active].querySelector(".deck-card__caption");
      if (live && caption) {
        let text = live.querySelector(".deck-specific__text");
        if (!text) {
          text = document.createElement("div");
          text.className = "deck-specific__text";
          live.replaceChildren(text);
        }
        text.innerHTML = caption.innerHTML;
        text.classList.remove("is-swap");
        void text.offsetWidth;
        text.classList.add("is-swap");
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    const onResize = () => {
      measure();
      lastIndex = -1;
      update();
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    update();
  });
}

function initLightbox() {
  const dialog = document.querySelector("#lightbox");
  if (!dialog) return;
  const img = dialog.querySelector("img");
  const close = dialog.querySelector(".lightbox__close");

  document.querySelectorAll(".artwork-open[data-lightbox]").forEach((button) => {
    if (button.closest(".portrait-carousel")) return;
    if (!button.closest("[data-present]")) return;
    const zoom = document.createElement("button");
    zoom.type = "button";
    zoom.className = "artwork-zoom";
    zoom.dataset.lightbox = button.dataset.lightbox;
    zoom.setAttribute("aria-label", "Zoom image");
    zoom.textContent = "Zoom";
    button.removeAttribute("data-lightbox");
    button.after(zoom);
  });

  document.querySelectorAll("[data-lightbox]").forEach((button) => {
    button.addEventListener("click", () => {
      img.src = button.dataset.lightbox;
      img.alt = button.querySelector("img")?.alt || "";
      if (typeof dialog.showModal === "function") dialog.showModal();
    });
  });

  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
