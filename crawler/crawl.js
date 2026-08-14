// NhaDat Radar crawler v2 — focus BÁN + CHO THUÊ nhà/đất/căn hộ. Rich extraction + AI-style score.
const fs = require("fs");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BASE = "https://raovat.nhadat.vn";
const SEEDS = [
  "/can-ban-12/", "/can-ban-12/index2.html", "/can-ban-12/index3.html", "/can-ban-12/index4.html",
  "/nha-6/", "/nha-6/index2.html", "/nha-6/index3.html",
  "/dat-11/", "/dat-11/index2.html", "/dat-52/",
  "/can-ho-5/", "/can-ho-5/index2.html", "/can-ho-46/",
  "/cho-thue-4/", "/cho-thue-4/index2.html", "/cho-thue-4/index3.html",
  "/mat-bang-8/",
];
const MAX = 120;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function get(u){ try{ const r=await fetch(u,{headers:{"User-Agent":UA,"Accept":"text/html","Accept-Language":"vi"}}); return r.ok?await r.text():null; }catch(e){ return null; } }
const dec=(s)=>(s||"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g," ").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).trim();
const strip=(s)=>dec((s||"").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g," ").replace(/[ \t]+/g," ")).replace(/\n{2,}/g,"\n").trim();
function dd(h,l){ const re=new RegExp("<dt>\\s*"+l.replace(/[-/]/g,"\\$&")+"[^<]*<\\/dt>\\s*<dd>([\\s\\S]*?)<\\/dd>","i"); const m=h.match(re); return m?m[1]:null; }
function parsePrice(raw){ if(!raw)return null; const t=dec(raw).toLowerCase(); if(/thỏa thuận|thoa thuan|liên hệ/.test(t))return null; const n=parseFloat((t.match(/[\d.,]+/)||[])[0]?.replace(/\./g,"").replace(",",".")||""); if(!n)return null; if(/tỷ|ty\b/.test(t))return Math.round(n*1e9); if(/triệu|trieu/.test(t))return Math.round(n*1e6); if(/nghìn|ngan/.test(t))return Math.round(n*1e3); return Math.round(n); }
function parseArea(raw){ if(!raw)return null; const m=dec(raw).replace(/<sup>2<\/sup>/i,"2").match(/([\d.,]+)\s*m/i); return m?parseFloat(m[1].replace(/\./g,"").replace(",","."))||null:null; }

const AMEN=[
  {k:"pet",re:/thú cưng|thu cung|nuôi (chó|mèo|pet)|pet/i},
  {k:"furnished",re:/full nội thất|đầy đủ nội thất|nội thất cao cấp|nt đầy đủ/i},
  {k:"ac",re:/máy lạnh|điều hoà|điều hòa/i},
  {k:"parking",re:/để xe|đậu xe|hầm xe|gara|garage|ô tô|oto/i},
  {k:"security",re:/an ninh|bảo vệ|camera|thang máy/i},
  {k:"near_market",re:/gần chợ|gần trường|gần kcn|gần bệnh viện|trung tâm|mặt tiền|mặt phố/i},
  {k:"elevator",re:/thang máy/i},
  {k:"corner",re:/lô góc|căn góc|2 mặt tiền|hai mặt tiền/i},
];
function propertyType(t){ t=t.toLowerCase();
  if(/căn hộ|chung cư|can ho|chung cu|penthouse|duplex|studio|officetel/.test(t))return "can_ho";
  if(/nhà xưởng|kho xưởng|nhà kho|mặt bằng|kiốt|ki ốt|kios|shophouse|văn phòng|mbkd/.test(t))return "mat_bang";
  if(/phòng trọ|ở ghép|ktx|phòng cho thuê/.test(t))return "phong_tro";
  if(/biệt thự|villa|nhà phố|nhà riêng|nhà mặt|mặt tiền|mặt phố|dãy trọ|dãy phòng|\bnhà\b|\blầu\b|\btầng\b|hẻm|hxh|\bmt\b/.test(t))return "nha";
  if(/đất nền|lô đất|nền đất|thổ cư|phân lô|bán đất|đất mặt|đất thổ|đất vườn|\bnền\b|\bđất\b|\blô\b/.test(t))return "dat";
  return "khac";
}
function extractInt(text,re,min,max){ const m=text.match(re); if(!m)return null; const v=parseInt(m[1],10); return (v>=min&&v<=max)?v:null; }
function extractDetails(text){
  const t=text.toLowerCase();
  const bedrooms=extractInt(t,/(\d{1,2})\s*(?:phòng ngủ|pn\b|p\.ngủ|ngủ|bedroom)/,1,15);
  const bathrooms=extractInt(t,/(\d{1,2})\s*(?:phòng tắm|wc|vs\b|vệ sinh|toilet|nhà tắm)/,1,15);
  const floors=extractInt(t,/(\d{1,2})\s*(?:tầng|lầu)/,1,60);
  const dirM=t.match(/hướng\s+(đông[- ]?nam|tây[- ]?nam|đông[- ]?bắc|tây[- ]?bắc|đông|tây|nam|bắc)/);
  const direction=dirM?dirM[1].replace(/[- ]/,"-"):null;
  let legal=null;
  if(/sổ hồng/.test(t))legal="Sổ hồng"; else if(/sổ đỏ/.test(t))legal="Sổ đỏ";
  else if(/sổ riêng|shr|sổ chính chủ/.test(t))legal="Sổ riêng"; else if(/công chứng|vi bằng/.test(t))legal="Công chứng";
  else if(/pháp lý|giấy tờ đầy đủ|sổ sẵn/.test(t))legal="Pháp lý rõ ràng";
  let furnishing=null;
  if(/full nội thất|đầy đủ nội thất|nội thất cao cấp/.test(t))furnishing="Full nội thất";
  else if(/cơ bản|nội thất cơ bản/.test(t))furnishing="Cơ bản"; else if(/nhà thô|bàn giao thô/.test(t))furnishing="Bàn giao thô";
  return {bedrooms,bathrooms,floors,direction,legal,furnishing};
}
function aiScore(x){
  let s=58;
  if(x.price_vnd)s+=8; if(x.area_m2)s+=7;
  if(x.bedrooms)s+=4; if(x.bathrooms)s+=3; if(x.legal)s+=7; if(x.furnishing)s+=3;
  if((x.description||"").length>300)s+=6; if(x.amenities.length>=3)s+=4;
  if(x.price_warning)s-=16;
  return Math.max(41,Math.min(98,s));
}
function maskPhone(p){ const d=(p||"").replace(/\D/g,""); return d.length<9?null:d.slice(0,4)+" ••• "+d.slice(-3); }
function hashPhone(p){ const d=(p||"").replace(/\D/g,""); if(d.length<9)return null; let h=5381; for(const c of d)h=((h<<5)+h+c.charCodeAt(0))>>>0; return "u"+h.toString(36); }
async function pool(items,n,fn){ const out=[]; let i=0; await Promise.all(Array.from({length:n},async()=>{ while(i<items.length){ const k=i++; out[k]=await fn(items[k],k); await sleep(110);} })); return out; }

(async()=>{
  const urls=new Set();
  for(const s of SEEDS){ const h=await get(BASE+s); if(h) for(const m of h.matchAll(/href="(https:\/\/raovat\.nhadat\.vn\/[^"]*?-(\d{5,})\.html)"/g)) urls.add(m[1]); await sleep(130); }
  const list=[...urls].slice(0,MAX);
  console.error("urls",urls.size,"fetch",list.length);
  let raw=await pool(list,5,async(url)=>{
    const h=await get(url); if(!h)return null;
    const id=(url.match(/-(\d{5,})\.html/)||[])[1]||null;
    const tM=h.match(/<h2 class="posttitle[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
    const title=tM?strip(tM[1]):dec((h.match(/<title>([^<]+)</)||[])[1]||""); if(!title)return null;
    const province=strip(dd(h,"Tỉnh")||""), district=strip(dd(h,"Quận")||"");
    const area=parseArea(dd(h,"Diện tích")), price=parsePrice(dd(h,"Giá"));
    const phone=strip(dd(h,"Di động")||"")||(h.match(/\b0\d{9,10}\b/)||[])[0]||null;
    const uM=h.match(/\/members\/[^"]*?-(\d+)\.html"[^>]*>\s*<strong>([^<]+)<\/strong>/i);
    const bM=h.match(/<blockquote class="postcontent[^"]*">([\s\S]*?)<\/blockquote>/i);
    const desc=bM?strip(bM[1]).slice(0,1100):"";
    // Ảnh: gom mọi <img src> tuyệt đối là file ảnh, loại logo/icon/sprite/avatar, tối đa 8
    const images=[...h.matchAll(/<img[^>]+(?:data-src|src)="(https?:\/\/[^"]+\.(?:jpe?g|png|webp)(?:\?[^"]*)?)"/gi)]
      .map(m=>m[1])
      .filter(u=>!/logo|icon|sprite|avatar|banner|captcha|\/static\//i.test(u))
      .filter((v,i,a)=>a.indexOf(v)===i).slice(0,8);
    const text=title+" "+desc;
    const cat=(url.match(/\/(cho-thue|can-ban|can-ho|dat|nha|mat-bang)/)||[])[1]||"";
    const det=extractDetails(text);
    return { id,url,title,province,district, area_m2:area, price_vnd:price,
      listing_type:/cho-thue|cho thuê|thuê/i.test(cat+" "+title)?"cho_thue":"ban",
      property_type:propertyType(title+" "+cat),
      bedrooms:det.bedrooms,bathrooms:det.bathrooms,floors:det.floors,direction:det.direction,legal:det.legal,furnishing:det.furnishing,
      poster_id:uM?uM[1]:null, poster_name:uM?dec(uM[2]):strip(dd(h,"TK")||""),
      _phone:phone, phone_masked:maskPhone(phone), phone_hash:hashPhone(phone),
      amenities:AMEN.filter(a=>a.re.test(text)).map(a=>a.k), description:desc, images,
      price_per_m2:(price&&area)?Math.round(price/area):null,
      source:"crawl", source_site:"nhadat.vn",
      freshness_min: id? (parseInt(id.slice(-3),10)%720)+3 : 30,   // demo: phút/giờ trước, ổn định theo id
    };
  });
  let items=raw.filter(Boolean);

  // Giới hạn phạm vi 3 TP lớn (đặt CITY_ALL=1 để lấy toàn quốc)
  if(!process.env.CITY_ALL){
    const CITIES=/hà nội|hồ chí minh|hcm|sài gòn|đà nẵng/i;
    items=items.filter(x=>CITIES.test((x.province||"")+" "+(x.district||"")));
  }

  // owner/broker
  const freq={}; items.forEach(x=>{const k=x.phone_hash||x.poster_id; if(k)freq[k]=(freq[k]||0)+1;});
  items.forEach(x=>{ const k=x.phone_hash||x.poster_id; const c=k?freq[k]:1;
    const hint=/chính chủ|chinh chu|chủ nhà/i.test((x.poster_name||"")+" "+x.title);
    x.poster_listing_count=c; x.poster_role=c>=3?"moi_gioi":(hint?"chu_nha":(c===1?"chu_nha":"khong_ro")); });

  // price warning
  const g={}; items.forEach(x=>{ if(!x.price_vnd||!x.area_m2)return; const band=Math.round(x.area_m2/25); (g[[x.province,x.district,x.property_type,x.listing_type,band].join("|")]=g[[x.province,x.district,x.property_type,x.listing_type,band].join("|")]||[]).push(x); });
  Object.values(g).forEach(arr=>{ if(arr.length<2)return; const posters=new Set(arr.map(x=>x.phone_hash||x.poster_id)); if(posters.size<2)return;
    const ps=arr.map(x=>x.price_vnd).sort((a,b)=>a-b); const med=ps[Math.floor(ps.length/2)];
    arr.forEach(x=>{ const d=Math.abs(x.price_vnd-med)/med; if(d>=0.28) x.price_warning={reason:x.price_vnd>med?"cao_hon":"thap_hon",deviation_pct:Math.round(d*100),cluster_size:arr.length,distinct_posters:posters.size,median_vnd:med}; }); });

  items.forEach(x=>{ x.ai_score=aiScore(x); });

  // district stats (sale nhà/đất/căn hộ theo /m2, lọc outlier)
  const summary={ crawled_at:new Date().toISOString().slice(0,10), source:"raovat.nhadat.vn", total:items.length,
    ban:items.filter(x=>x.listing_type==="ban").length, cho_thue:items.filter(x=>x.listing_type==="cho_thue").length,
    with_price:items.filter(x=>x.price_vnd).length, brokers:items.filter(x=>x.poster_role==="moi_gioi").length,
    owners:items.filter(x=>x.poster_role==="chu_nha").length, warnings:items.filter(x=>x.price_warning).length,
    with_beds:items.filter(x=>x.bedrooms).length, with_legal:items.filter(x=>x.legal).length,
    by_type:items.reduce((a,x)=>{a[x.property_type]=(a[x.property_type]||0)+1;return a;},{}) };
  const pub=items.map(({_phone,...r})=>r);
  fs.writeFileSync("listings2.json", JSON.stringify({summary,listings:pub},null,0));
  console.error("DONE",JSON.stringify(summary));
})();
