'use client';
import {useEffect} from 'react';

export function useDialogAccessibility(){
 useEffect(()=>{
  let active:HTMLElement|null=null,previous:HTMLElement|null=null;
  const overflow=document.body.style.overflow;
  const focusable=()=>active?Array.from(active.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length>0):[];
  const update=()=>{
   const dialogs=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'));
   const next=dialogs.at(-1)||null;if(next===active)return;
   if(!active&&next)previous=document.activeElement as HTMLElement;
   active=next;document.body.style.overflow=active?'hidden':overflow;
   if(active){
    if(!active.contains(document.activeElement)){
     const items=focusable();
     const target=items.find(el=>el.hasAttribute('data-dialog-initial-focus'))||items[0]||active;
     target.focus({preventScroll:true});
    }
   }
   else if(previous?.isConnected)previous.focus({preventScroll:true});
  };
  const keydown=(e:KeyboardEvent)=>{
   if(!active)return;
   if(e.key==='Escape'){
    const close=active.querySelector<HTMLButtonElement>('button[aria-label="关闭"]');
    if(close&&!close.disabled){e.preventDefault();e.stopPropagation();close.click();}return;
   }
   if(e.key!=='Tab')return;
   const items=focusable(),first=items[0],last=items.at(-1);
   if(!first){e.preventDefault();return;}
   if(e.shiftKey&&(document.activeElement===first||!active.contains(document.activeElement))){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||!active.contains(document.activeElement))){e.preventDefault();first.focus();}
  };
  const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true});update();
  document.addEventListener('keydown',keydown,true);
  return()=>{observer.disconnect();document.removeEventListener('keydown',keydown,true);document.body.style.overflow=overflow;};
 },[]);
}
