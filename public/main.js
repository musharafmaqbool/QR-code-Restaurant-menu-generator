document.addEventListener('click', function(e){
	const t = e.target;
	if (t && t.matches('[data-copy]')){
		navigator.clipboard.writeText(t.getAttribute('data-copy'));
		t.textContent = 'Copied!';
		setTimeout(()=>{ t.textContent = 'Copy link'; }, 1200);
	}
});

// Simple animated particles gradient on auth pages
(function(){
	const canvas = document.getElementById('bg-canvas');
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	let width, height; const dots=[]; const DOTS=40;
	function resize(){ width = canvas.width = canvas.offsetWidth; height = canvas.height = canvas.offsetHeight; }
	window.addEventListener('resize', resize); resize();
	for (let i=0;i<DOTS;i++){
		dots.push({
			x: Math.random()*width,
			y: Math.random()*height,
			r: 40+Math.random()*120,
			s: 0.2+Math.random()*0.6,
			c: Math.random()<.5 ? 'rgba(124,58,237,0.15)' : 'rgba(34,197,94,0.12)'
		});
	}
	function step(){
		ctx.clearRect(0,0,width,height);
		for (const d of dots){
			d.r += Math.sin(Date.now()/1000*d.s)*0.08;
			ctx.beginPath();
			const g = ctx.createRadialGradient(d.x,d.y,0,d.x,d.y,d.r);
			g.addColorStop(0,d.c);
			g.addColorStop(1,'rgba(0,0,0,0)');
			ctx.fillStyle = g; ctx.arc(d.x,d.y,d.r,0,Math.PI*2); ctx.fill();
		}
		requestAnimationFrame(step);
	}
	step();
})();

// Navbar interactions
(function(){
	const menuBtn = document.querySelector('[data-toggle-menu]');
	const nav = document.querySelector('[data-nav]');
	if (menuBtn && nav){
		menuBtn.addEventListener('click', ()=>{
			if (getComputedStyle(nav).display === 'none') nav.style.display = 'flex';
			else nav.style.display = 'none';
		});
	}
	const userBtn = document.querySelector('[data-toggle-user]');
	const userMenu = document.querySelector('[data-user-menu]');
	if (userBtn && userMenu){
		userBtn.addEventListener('click', (e)=>{
			e.preventDefault();
			userMenu.parentElement.classList.toggle('open');
		});
		document.addEventListener('click', (e)=>{
			if (!userMenu.parentElement.contains(e.target)){
				userMenu.parentElement.classList.remove('open');
			}
		});
	}
})();

// Simple 3D-like rotating food shapes on homepage
(function(){
	const canvas = document.getElementById('food-canvas');
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	let w,h; function resize(){ w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; }
	window.addEventListener('resize', resize); resize();
	const items = [];
	const colors = ['#22c55e','#1da1a9','#a3e635','#99f6e4'];
	for (let i=0;i<16;i++){
		items.push({
			x: Math.random()*w,
			y: Math.random()*h,
			r: 16+Math.random()*44,
			speed: .0015 + Math.random()*.003,
			angle: Math.random()*Math.PI*2,
			color: colors[i%colors.length]
		});
	}
	function draw(){
		ctx.clearRect(0,0,w,h);
		for (const it of items){
			it.angle += it.speed * (1 + it.r/50);
			const x = it.x + Math.cos(it.angle)*8;
			const y = it.y + Math.sin(it.angle)*8;
			const grd = ctx.createRadialGradient(x,y,4,x,y,it.r);
			grd.addColorStop(0, it.color+'33');
			grd.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = grd;
			ctx.beginPath();
			ctx.arc(x,y,it.r,0,Math.PI*2);
			ctx.fill();
		}
		requestAnimationFrame(draw);
	}
	draw();
})();


