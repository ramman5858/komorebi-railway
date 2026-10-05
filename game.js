const $=id=>document.getElementById(id);
const KEY='komorebi-railway-v1';
const towns=[{name:'はじまり',x:.15,y:.57,color:'#d9a569'},{name:'森のまち',x:.39,y:.29,color:'#82a16c'},{name:'湖畔',x:.64,y:.57,color:'#8eafbb'},{name:'花の丘',x:.83,y:.27,color:'#c690a3'},{name:'港まち',x:.89,y:.75,color:'#b6a074'}];
let state={coins:20,speed:1,capacity:6,unlocked:2,delivered:0};
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Number.isFinite(saved.coins)&&saved.coins>=0&&Number.isInteger(saved.unlocked)&&saved.unlocked>=2&&saved.unlocked<=5&&Number.isInteger(saved.speed)&&saved.speed>=1&&saved.speed<=8&&Number.isInteger(saved.capacity)&&saved.capacity>=6&&saved.capacity<=30&&Number.isFinite(saved.delivered)&&saved.delivered>=0)state=saved}catch{}
let from=0,to=1,position=0,direction=1,aboard=0,passengerOrigin=null,dockedStation=null,paused=false,boost=0,totalTime=0,last=0,toastTimer;
const canvas=$('map'),ctx=canvas.getContext('2d');let w=1000,h=430;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{$('saved').textContent='この環境では保存できません'}}
function notify(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2300)}
const speedCost=()=>Math.round(40*1.65**(state.speed-1));const capacityCost=()=>Math.round(60*1.5**((state.capacity-6)/3));const expandCost=()=>[0,0,120,260,480][state.unlocked];
function updateUI(){ $('coins').textContent=Math.floor(state.coins).toLocaleString();$('delivered').textContent=state.delivered.toLocaleString();$('stations').textContent=state.unlocked;$('route-label').textContent=`こもれび線 / ${state.unlocked}駅`;$('speed-level').textContent=`レベル ${state.speed} / 8`;$('capacity-level').textContent=`定員 ${state.capacity}人`;$('speed-price').textContent=state.speed>=8?'MAX':`◉ ${speedCost()}`;$('capacity-price').textContent=state.capacity>=30?'MAX':`◉ ${capacityCost()}`;$('speed').disabled=state.speed>=8;$('capacity').disabled=state.capacity>=30;const next=towns[state.unlocked];$('expand-name').textContent=next?`${next.name}駅を開放`:'全駅がつながりました！';$('expand-description').textContent=next?'新しい街へ。乗客と運賃が増えます。':'こもれび線、全線開通。列車を育て続けよう。';$('expand-price').textContent=next?`◉ ${expandCost()}`:'COMPLETE';$('expand').disabled=!next;}
function buy(cost,action,message){if(state.coins<cost){notify(`あと ${Math.ceil(cost-state.coins)} コイン。乗客を届けて貯めよう！`);return}state.coins-=cost;action();save();updateUI();notify(message)}
$('speed').onclick=()=>{if(state.speed<8)buy(speedCost(),()=>state.speed++,'電車のスピードがアップ！')};$('capacity').onclick=()=>{if(state.capacity<30)buy(capacityCost(),()=>state.capacity+=3,'新しい車両がつながりました！')};$('expand').onclick=()=>{if(state.unlocked<5)buy(expandCost(),()=>state.unlocked++, '新しい駅が開業しました！')};
const heldPointers=new Set();let keyboardHeld=false;
function drive(){if(paused)return;dockedStation=null;boost=1}
function nextLeg(){from=to;if(from===state.unlocked-1)direction=-1;if(from===0)direction=1;to=from+direction}
function dock(){
 if(boost||paused)return;
 // The platform occupies the first/last 8% of the current track segment.
 let station=null;
 if(position<=.08){station=from;position=0}
 else if(position>=.92){station=to;nextLeg();position=0}
 if(station===null){dockedStation=null;return}
 dockedStation=station;
 if(aboard>0&&passengerOrigin!==station){
  const delivered=aboard,revenue=delivered*(3+state.unlocked);
  state.delivered+=delivered;state.coins+=revenue;
  notify(`${towns[station].name}駅に停車！ +${revenue} コイン`);
  aboard=0;save();updateUI();
 }
 aboard=state.capacity;passengerOrigin=station;
}
function stopDriving(){heldPointers.clear();keyboardHeld=false;boost=0}
for(const target of [canvas,$('boost')]){
 target.addEventListener('pointerdown',event=>{
  if(event.button!==0||paused)return;
  event.preventDefault();target.setPointerCapture(event.pointerId);
  heldPointers.add(event.pointerId);drive();
 });
 const release=event=>{heldPointers.delete(event.pointerId);boost=heldPointers.size||keyboardHeld?1:0;if(!boost)dock()};
 target.addEventListener('pointerup',release);
 target.addEventListener('pointercancel',release);
 target.addEventListener('lostpointercapture',release);
 target.addEventListener('contextmenu',event=>event.preventDefault());
}
$('boost').addEventListener('keydown',event=>{
 if(event.code!=='Space'&&event.code!=='Enter')return;
 event.preventDefault();if(paused)return;
 if(!keyboardHeld){keyboardHeld=true;drive()}
});
$('boost').addEventListener('keyup',event=>{
 if(event.code!=='Space'&&event.code!=='Enter')return;
 event.preventDefault();keyboardHeld=false;boost=heldPointers.size?1:0;if(!boost)dock();
});
$('boost').addEventListener('blur',()=>{keyboardHeld=false;boost=heldPointers.size?1:0});
$('pause').onclick=()=>{paused=!paused;stopDriving();$('pause').textContent=paused?'▶ 運行を再開':'Ⅱ 一時停止';$('pause').setAttribute('aria-label',paused?'運行を再開':'運行を一時停止')};
document.addEventListener('visibilitychange',stopDriving);
window.addEventListener('blur',stopDriving);
$('reset').onclick=()=>{if(!confirm('街と列車の進行状況をリセットしますか？'))return;state={coins:20,speed:1,capacity:6,unlocked:2,delivered:0};from=0;to=1;position=0;direction=1;aboard=0;passengerOrigin=null;dockedStation=null;stopDriving();dock();save();updateUI();notify('新しい鉄道の旅がはじまります')};
function resize(){const rect=canvas.getBoundingClientRect();w=rect.width;h=rect.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}new ResizeObserver(resize).observe(canvas);
function point(t){return{x:t.x*w,y:t.y*(h-65)+10}}function line(a,b,t){const p=point(a),q=point(b);return{x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t}}
function round(x,y,width,height,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,width,height,r);ctx.fill()}
function tree(x,y,s=1){ctx.fillStyle='#98ad78';ctx.fillRect(x-2*s,y,4*s,13*s);ctx.fillStyle='#86a86d';ctx.beginPath();ctx.ellipse(x,y-5*s,10*s,14*s,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#95b67b';ctx.beginPath();ctx.ellipse(x-3*s,y-9*s,7*s,9*s,0,0,Math.PI*2);ctx.fill()}
function house(x,y,c,s=1){round(x-10*s,y,20*s,18*s,2*s,'#f7f0d9');ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x-14*s,y+2*s);ctx.lineTo(x,y-11*s);ctx.lineTo(x+14*s,y+2*s);ctx.closePath();ctx.fill();round(x-3*s,y+7*s,5*s,11*s,1,'#bcae8c');round(x+5*s,y+5*s,4*s,5*s,1,'#a3bbc0')}
function draw(){ctx.clearRect(0,0,w,h);ctx.fillStyle='#dfebc9';ctx.fillRect(0,0,w,h);
ctx.fillStyle='#d3e3ba';for(let i=0;i<9;i++){ctx.beginPath();ctx.ellipse((i*.173%1)*w,((i*.31+.2)%1)*h,65+(i%3)*20,32, -.4,0,Math.PI*2);ctx.fill()}
ctx.fillStyle='#b6d8d8';ctx.beginPath();ctx.ellipse(w*.67,h*.75,w*.17,h*.16,-.18,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#cde7df';ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(w*.67,h*.75,30+i*19,5+i*4,-.15,.3,2.1);ctx.stroke()}
for(let i=0;i<36;i++){const x=((i*137+55)%997)/997*w,y=((i*91+40)%401)/401*(h-65);if(towns.every(t=>Math.hypot(x-point(t).x,y-point(t).y)>48))tree(x,y,.6+(i%3)*.17)}
for(let i=0;i<towns.length-1;i++){const a=point(towns[i]),b=point(towns[i+1]);ctx.setLineDash(i+1>=state.unlocked?[5,8]:[]);ctx.strokeStyle=i+1>=state.unlocked?'#afbe9f':'#b5b79b';ctx.lineWidth=i+1>=state.unlocked?3:14;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);if(i+1<state.unlocked){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);ctx.strokeStyle='#747f69';ctx.lineWidth=2;for(let d=0;d<len;d+=11){const x=a.x+dx*d/len,y=a.y+dy*d/len;ctx.beginPath();ctx.moveTo(x-dy/len*8,y+dx/len*8);ctx.lineTo(x+dy/len*8,y-dx/len*8);ctx.stroke()}ctx.strokeStyle='#ecebd9';ctx.lineWidth=2;for(const n of [-4,4]){ctx.beginPath();ctx.moveTo(a.x-dy/len*n,a.y+dx/len*n);ctx.lineTo(b.x-dy/len*n,b.y+dx/len*n);ctx.stroke()}}}
towns.forEach((town,i)=>{const p=point(town),active=i<state.unlocked;ctx.globalAlpha=active?1:.45;for(let j=0;j<3+(active?Math.min(3,Math.floor(state.delivered/35)):0);j++){house(p.x+(j%3-1)*25,p.y-50-Math.floor(j/3)*26,town.color,.75)}round(p.x-27,p.y-15,54,28,6,active?'#f8f4df':'#d5dec7');round(p.x-21,p.y-10,42,7,2,town.color);ctx.fillStyle='#7d8e70';ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();ctx.font='600 11px "Noto Sans JP",sans-serif';ctx.textAlign='center';const label=active?town.name+'駅':'🔒 '+town.name;const tw=ctx.measureText(label).width;round(p.x-tw/2-9,p.y+21,tw+18,24,12,'#fffff0df');ctx.fillStyle='#536849';ctx.fillText(label,p.x,p.y+37);if(active){for(let j=0;j<3;j++){const x=p.x+34+j*7,y=p.y-4+Math.sin(totalTime*1.4+j)*1.5;ctx.fillStyle=['#cf9368','#7291a0','#bcac68'][j];ctx.beginPath();ctx.arc(x,y-4,2.2,0,Math.PI*2);ctx.fill();round(x-2,y,4,6,1,ctx.fillStyle)}}ctx.globalAlpha=1});
const p=line(towns[from],towns[to],position),a=point(towns[from]),b=point(towns[to]),angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);const cars=1+Math.floor((state.capacity-6)/6);for(let j=cars-1;j>=0;j--){const x=-j*28;round(x-14,-9,26,20,5,'#77946555');round(x-15,-13,26,18,4,'#fff6de');round(x-15,-3,26,6,2,'#d39d4e');round(x-10,-10,7,6,1,'#759ca4');round(x+1,-10,6,6,1,'#759ca4')}round(8,-10,5,11,2,'#285947');ctx.restore();if(boost>0){ctx.strokeStyle='#f7f8e8';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(p.x-22-i*7,p.y+14);ctx.lineTo(p.x-29-i*7,p.y+14);ctx.stroke()}}
}
function tick(now){
const dt=Math.min((now-last)/1000||0,.08);last=now;
if(!paused&&!document.hidden){
 totalTime+=dt;
 if(boost>0){
  position+=dt*(.055+state.speed*.014)*2.5;
  // Keep the remaining movement when passing a station; never pause to board.
  while(position>=1){position-=1;nextLeg()}
 }
}
const nearStation=position<=.08?from:position>=.92?to:null;
$('status').textContent=paused?'運行を一時停止中':boost>0?(nearStation!==null?'指を離すと駅に停車':`${towns[to].name}駅へ運行中`):dockedStation!==null?`${towns[dockedStation].name}駅で乗車完了`:'駅の近くで指を離して停車';
$('passengers').textContent=`${aboard} / ${state.capacity}人`;$('progress').style.width=`${position*100}%`;
$('boost').firstChild.textContent=boost>0?'➜ 走行中！ ':'➜ 押している間走る ';draw();requestAnimationFrame(tick)
}
updateUI();resize();dock();requestAnimationFrame(tick);
