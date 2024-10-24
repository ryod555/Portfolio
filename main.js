
class Application{
  constructor() {
    this.canvas = document.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.backgroundColor = 'transparent';
    this.images = [];
    this.loadedImages = 0;

    this.totalImages = 80;
    this.currentFrameIndex = 1;

    for (let i = 0; i < this.totalImages; i++) {
      const img = new Image();
      img.onload = () => {
        this.loadedImages++;
        if (this.loadedImages === this.totalImages) {
          this.addEventListeners();
          this.render()
        }
      };
      img.src = "./images/dance/frame_" + String(i).padStart(2,'0') + "_delay-0.05s.gif"
      this.images.push(img);
    }
  }
  addEventListeners() {
    window.addEventListener('scroll', () => {
      const scrollTop = document.documentElement.scrollTop;
      const maxScrollTop = (document.documentElement.scrollHeight - window.innerHeight) / 3;
      const scrollFraction = scrollTop / maxScrollTop;
      const frameCount = this.totalImages;
      const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(scrollFraction * frameCount)
      );
      this.currentFrameIndex = frameIndex;
      this.render();
      // console.log(scrollTop)
      if (scrollTop > 900) {
        console.log("yup")
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "1310px";

      } else {
        this.canvas.style.position = "fixed";
        this.canvas.style.top = "50%";
        this.canvas.style.left = "50%";
      }

    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.images[this.currentFrameIndex], 0, 0, this.canvas.width, this.canvas.height);

    const img = this.images[this.currentFrameIndex];
    if (!img) return;

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
    this.ctx.drawImage(this.images[this.currentFrameIndex], 0, 0, this.canvas.width, this.canvas.height);
    /*
    this.ctx.save();
    if (this.totalImages - this.currentFrameIndex < 10) {
      this.ctx.globalAlpha = (this.totalImages - this.currentFrameIndex) / 10
    }
    this.ctx.globalAlpha = 1;
    this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    this.ctx.restore(); */
  }
} 

window.addEventListener('scroll', function(){ // parallax
  var value = window.scrollY;
  var her_opacity = document.getElementById("hermes");

  const scrollTop = document.documentElement.scrollTop;
  let bg = document.getElementById("background");
  let container = document.getElementsByTagName("a");
  let wing = document.getElementById("wing");


  if (scrollTop > 900) {
    bg.style.top = -value * .5 + 400 + 'px';
    her_opacity.style.opacity = "1";
  } else {
    bg.style.position = "fixed";
    bg.style.top = 100;
    her_opacity.style.opacity = (scrollTop / 750);
  }
  console.log(window.scrollY);

})

window.onload = () => {
  console.log("heyy");
  window.app = new Application();

  const scrollTop = document.documentElement.scrollTop;



}

console.log("JavaScript is linked properly!");