'use client';
import {useState} from 'react';
import LedgerManager from './ledger-manager';
import Planner from './planner';
export default function FinanceSpace({data,onChange}:{data:any;onChange:()=>void}){
 const [tab,setTab]=useState('ledger');
 return <section><div className="space-tabs" role="tablist" aria-label="财务空间">{[['ledger','实际收支'],['savings','储蓄目标'],['forecast','下月规划']].map(([id,label])=><button key={id} id={'finance-'+id} role="tab" aria-selected={tab===id} aria-controls="finance-panel" onClick={()=>setTab(id)}>{label}</button>)}</div><p className="space-help">收支记录实际发生的钱；储蓄目标追踪积累；下月规划预估未来。关联收支会自动更新目标进度。</p><div id="finance-panel" role="tabpanel" aria-labelledby={'finance-'+tab}>{tab==='ledger'?<LedgerManager data={data} onChange={onChange}/>:<Planner key={tab} mode={tab as 'savings'|'forecast'}/>}</div></section>;
}
