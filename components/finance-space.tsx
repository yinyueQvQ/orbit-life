'use client';
import {useState} from 'react';
import LedgerManager from './ledger-manager';
import Planner from './planner';
export default function FinanceSpace({data,onChange,initialTab='ledger'}:{initialTab?:string;data:any;onChange:()=>void}){
 const [tab,setTab]=useState(initialTab);
 return <section><div className="space-tabs" role="tablist" aria-label="财务空间">{[['ledger','实际收支'],['savings','储蓄目标'],['forecast','下月规划']].map(([id,label])=><button key={id} id={'finance-'+id} role="tab" aria-selected={tab===id} aria-controls="finance-panel" tabIndex={tab===id?0:-1} onKeyDown={e=>{const keys=['ledger','savings','forecast'];let next=keys.indexOf(tab);if(e.key==='ArrowRight')next=(next+1)%3;else if(e.key==='ArrowLeft')next=(next+2)%3;else if(e.key==='Home')next=0;else if(e.key==='End')next=2;else return;e.preventDefault();setTab(keys[next]);document.getElementById('finance-'+keys[next])?.focus();}} onClick={()=>setTab(id)}>{label}</button>)}</div><p className="space-help">收支记录实际发生的钱；储蓄目标追踪积累；下月规划预估未来。关联收支会自动更新目标进度。</p><div id="finance-panel" role="tabpanel" aria-labelledby={'finance-'+tab}>{tab==='ledger'?<LedgerManager data={data} onChange={onChange}/>:<Planner key={tab} mode={tab as 'savings'|'forecast'}/>}</div></section>;
}
