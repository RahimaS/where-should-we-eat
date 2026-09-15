const initial=["San Carlo","Trentina","Locanda","Kabuli","Cylla","Pasture","Ciaro","Asia Asia Food Hall","Takumi"];
let data=[];
let picks=[],left=3;
const $=id=>document.getElementById(id);

function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

async function api(method="GET",body){
  const res=await fetch("/api/restaurants",{
    method,
    headers:body?{"Content-Type":"application/json"}:{},
    body:body?JSON.stringify(body):undefined
  });
  const payload=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(payload.error||"Database request failed");
  return payload;
}

async function load(){
  try{
    const payload=await api();
    data=payload.restaurants||[];
    render();
  }catch(err){
    console.error(err);
    alert("I couldn't load the shared restaurant list. Please refresh and try again.");
  }
}

function choose(){
  let pool=data.filter(r=>!r.visited&&!picks.includes(r.id));
  if(!pool.length)return null;
  return pool[Math.floor(Math.random()*pool.length)];
}

function show(){
  let r=choose();
  if(!r){
    $("pick").textContent="You've seen them all";
    $("again").disabled=true;
    return;
  }
  picks.push(r.id);
  $("pick").textContent=r.name;
  $("home").classList.add("hidden");
  $("result").classList.remove("hidden");
  trail();
  status();
}

function trail(){
  let prev=picks.slice(0,-1).map(id=>data.find(r=>r.id===id)).filter(Boolean);
  $("trail").innerHTML=prev.length
    ?'<div class="trailLabel">ALSO ON THE TABLE</div>'+prev.map(r=>`<span class="trailItem">${esc(r.name)}</span>`).join("")
    :"";
}

function status(){
  $("remaining").textContent=left===1?"1 refresh left":left+" refreshes left";
  if(left===0){
    $("again").disabled=true;
    $("again").textContent="DECISION MADE";
    $("reset").classList.remove("hidden");
  }
}

$("choose").onclick=show;
$("again").onclick=()=>{if(left>0){left--;show()}};
$("reset").onclick=()=>{
  picks=[];left=3;
  $("again").disabled=false;
  $("again").innerHTML='PICK AGAIN <b>→</b>';
  $("reset").classList.add("hidden");
  $("result").classList.add("hidden");
  $("home").classList.remove("hidden");
};

function openList(){
  $("picker").classList.remove("active");
  $("list").classList.add("active");
  render();
  scrollTo(0,0);
}
function closeList(){
  $("list").classList.remove("active");
  $("picker").classList.add("active");
  scrollTo(0,0);
}
$("ourListTop").onclick=openList;
$("ourListBottom").onclick=openList;
$("close").onclick=closeList;

$("add").onsubmit=async e=>{
  e.preventDefault();
  let n=$("name").value.trim();
  if(!n||data.some(r=>r.name.toLowerCase()===n.toLowerCase()))return;
  const input=$("name");
  input.value="";
  try{
    const payload=await api("POST",{action:"add",name:n});
    data=payload.restaurants;
    render();
  }catch(err){
    input.value=n;
    alert(err.message);
  }
};

window.toggleVisit=async id=>{
  const r=data.find(x=>x.id===id);
  if(!r)return;
  try{
    const payload=await api("POST",{action:"visit",id,visited:!r.visited});
    data=payload.restaurants;
    render();
  }catch(err){alert(err.message)}
};

window.rate=async(id,n)=>{
  try{
    const payload=await api("POST",{action:"rate",id,rating:n});
    data=payload.restaurants;
    render();
  }catch(err){alert(err.message)}
};

function row(r,v){
  let stars=v?`<div class="rating">${[1,2,3,4,5].map(n=>`<button class="star" onclick="rate(${r.id},${n})">${n<=r.rating?"★":"☆"}</button>`).join("")}</div>`:"";
  return `<div class="row"><span class="restaurant">${esc(r.name)}</span><button class="toggle ${v?"done":""}" onclick="toggleVisit(${r.id})">${v?"✓":"○"}</button>${stars}</div>`;
}

function render(){
  let a=data.filter(r=>!r.visited),b=data.filter(r=>r.visited);
  $("tryCount").textContent=a.length+" TO TRY";
  $("visitCount").textContent=b.length+" VISITED";
  $("toVisit").innerHTML=a.length?a.map(r=>row(r,false)).join(""):'<div class="empty">Nothing waiting — add somewhere new.</div>';
  $("visited").innerHTML=b.length?b.map(r=>row(r,true)).join(""):'<div class="empty">Your visited places will live here.</div>';
}

load();
