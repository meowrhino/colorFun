export function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

export function hexToRgb(hex){
  const h = hex.replace('#','').trim();
  if(h.length===3){
    return [parseInt(h[0]+h[0],16),parseInt(h[1]+h[1],16),parseInt(h[2]+h[2],16)];
  }
  if(h.length===6){
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }
  return [128,128,128];
}
export function rgbToHex([r,g,b]){
  const to = (n)=> n.toString(16).padStart(2,'0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}
export function rgbToHsl([r,g,b]){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){ h=s=0; }
  else{
    const d=max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d + (g<b?6:0); break;
      case g: h=(b-r)/d + 2; break;
      case b: h=(r-g)/d + 4; break;
    }
    h/=6;
  }
  return [h*360, s*100, l*100];
}
export function hslToRgb([h,s,l]){
  h/=360; s/=100; l/=100;
  const hue2rgb=(p,q,t)=>{
    if(t<0) t+=1;
    if(t>1) t-=1;
    if(t<1/6) return p+(q-p)*6*t;
    if(t<1/2) return q;
    if(t<2/3) return p+(q-p)*(2/3-t)*6;
    return p;
  };
  let r,g,b;
  if(s===0){ r=g=b=l; }
  else{
    const q = l<0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l - q;
    r=hue2rgb(p,q,h+1/3);
    g=hue2rgb(p,q,h);
    b=hue2rgb(p,q,h-1/3);
  }
  return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
}
export async function copyText(text){
  try{ await navigator.clipboard.writeText(text); return true; }
  catch(e){ try{ prompt('Copiar:', text); return true; } catch(_){ return false; } }
}

export async function fetchJson(url){
  const response = await fetch(url);
  if(!response.ok) throw new Error(`HTTP ${response.status} en ${url}`);
  return response.json();
}

export function toast(msg, ms=900){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el.__t);
  el.__t = setTimeout(()=> el.classList.remove('show'), ms);
}
export function storageNS(ns){
  return {
    get(key, fallback=null){
      try{
        const raw = localStorage.getItem(`${ns}:${key}`);
        return raw ? JSON.parse(raw) : fallback;
      }catch(e){ return fallback; }
    },
    set(key, value){
      try{
        localStorage.setItem(`${ns}:${key}`, JSON.stringify(value));
        return true;
      }catch(e){
        return false;
      }
    }
  };
}
