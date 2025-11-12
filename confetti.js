// simple confetti / graffiti spark effect
export default {
  _ctx: null,
  _w:0,_h:0,
  init(canvas){
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this._ctx = canvas.getContext('2d');
    this._w = canvas.width; this._h = canvas.height;
    window.addEventListener('resize', ()=>{ canvas.width = window.innerWidth; canvas.height = window.innerHeight; this._w = canvas.width; this._h = canvas.height; });
    this._particles = [];
    this._running = false;
  },
  _rand(min,max){ return Math.random()*(max-min)+min; },
  shoot(count=80){
    if (!this._ctx) return;
    for (let i=0;i<count;i++){
      this._particles.push({
        x: this._rand(0,this._w),
        y: -10 - this._rand(0,200),
        vx: this._rand(-1.5,1.5),
        vy: this._rand(1,4),
        size: Math.round(this._rand(4,10)),
        life: this._rand(60,160),
        color: `hsl(${Math.round(this._rand(0,360))},80%,60%)`,
        rot: this._rand(0,Math.PI*2)
      });
    }
    if (!this._running) this._loop();
  },
  _loop(){
    this._running = true;
    const ctx = this._ctx;
    const that = this;
    function frame(){
      ctx.clearRect(0,0,that._w,that._h);
      const p = that._particles;
      for (let i=p.length-1;i>=0;i--){
        const o = p[i];
        o.x += o.vx;
        o.y += o.vy;
        o.vy += 0.06; // gravity
        o.rot += 0.1;
        o.life--;
        ctx.save();
        ctx.translate(o.x,o.y);
        ctx.rotate(o.rot);
        ctx.fillStyle = o.color;
        ctx.fillRect(-o.size/2,-o.size/2,o.size,o.size*0.6);
        ctx.restore();
        if (o.y > that._h + 50 || o.life <= 0) p.splice(i,1);
      }
      if (p.length>0) requestAnimationFrame(frame);
      else that._running = false;
    }
    requestAnimationFrame(frame);
  }
};
