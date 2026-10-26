import {actions,applyChange,beijingDay,confirmProposal,propose,publicState,readScope} from './domain.mjs';
const tools=[{type:'function',function:{name:'read_workspace',description:'按范围读取用户真实记录。可读取习惯与打卡、账本、备忘录目标、下月收支规划或宠物状态。只读。',parameters:{type:'object',properties:{scope:{type:'string',enum:['overview','habits','money','goals','forecast','pet']}},required:['scope']}}},{type:'function',function:{name:'propose_change',description:'生成待用户确认的更改。不会立即执行。金额字段单位为分，日期 YYYY-MM-DD。先读取记录确定ID，不可猜测ID。支持新增/更新/删除习惯、打卡、账目、预算、目标、关联目标的备忘录、下月收入储蓄规划、宠物喂食。新增habit需要name,goal,category(健康/学习/生活),icon；check需要id,date,done；transaction需要amount,kind(income/expense),category,note,date；goal需要title,target,saved,deadline；note需要title,content,goalId,due；forecast可设置salary,bonus,deductions,other,expenses,savingTarget,currentSavings；budget需要amount；feed无其他字段；updateNote/updateGoal需要id和要更新的字段；删除需要id。',parameters:{type:'object',properties:{action:{type:'string',enum:actions},id:{type:'string'},name:{type:'string'},goal:{type:'string'},category:{type:'string'},icon:{type:'string'},date:{type:'string'},done:{type:'boolean'},amount:{type:'integer'},kind:{type:'string'},note:{type:'string'},title:{type:'string'},content:{type:'string'},goalId:{type:'string'},due:{type:'string'},target:{type:'integer'},saved:{type:'integer'},deadline:{type:'string'},salary:{type:'integer'},bonus:{type:'integer'},deductions:{type:'integer'},other:{type:'integer'},expenses:{type:'integer'},savingTarget:{type:'integer'},currentSavings:{type:'integer'},minutes:{type:'integer'}},required:['action']}}}];
const persona=()=>`你是星轨 ORBIT 里的小宠物团团，一只温柔、活泼、偶尔俏皮的星尘精灵。使用中文自然对话，回复通常2到5句，少量表情。今天北京时间 ${beijingDay()}。你能通过工具查询习惯、打卡、账本、备忘录、目标、下月收入与储蓄预测及宠物状态。涉及数据必须先查工具再回答，不可编造记录。写入必须调用 propose_change，明确告知用户需点击确认；不得说已完成或已保存。用户拒绝就不要重提。删除也必须确认。规划是估算，不能将预计收入记成实际到账；不做资金转账和投资交易。金额工具单位分；用户说元时乘100。缺少必要信息先询问；不得虚构收入和扣款。每轮最多提出5项更改。你只能操作本应用数据，不能访问电脑文件或执行代码。`;
export function createWorkspace({load,save,complete,configured}){
 let busy=false,last=0;
 const out=(status,data)=>({status,data});
 const chatView=s=>({configured:configured(),provider:'DeepSeek',model:'deepseek-flash',messages:s.messages.slice(-60),pending:s.pending.filter(x=>x.expires>Date.now())});
 return async function handle(path,method,b={}){
 try{const s=load();
 if(method==='GET'&&path==='/api/life')return out(200,publicState(s));
 if(method==='GET'&&path==='/api/chat')return out(200,chatView(s));
 if(busy)return out(429,{error:'团团正在思考，请稍等片刻再操作。'});
 if(path==='/api/life'&&method==='POST'){save(applyChange(s,b));return out(200,{ok:true});}
 if(path==='/api/chat/actions'&&method==='POST'){
 const p=s.pending.find(p=>p.id===b.id);if(!p)return out(404,{error:'建议不存在或已处理'});
 if(typeof b.accept!=='boolean')return out(400,{error:'确认状态无效'});
 const next=b.accept?confirmProposal(s,b.id):{...s,pending:s.pending.filter(p=>p.id!==b.id)};
 next.messages.push({role:'assistant',content:b.accept?'已按你的确认完成操作。可以在对应页面查看更新。✨':'好呀，这项建议已取消，你的记录没有改变。'});save(next);return out(200,{ok:true,...chatView(next)});
 }
 if(path==='/api/chat'&&method==='DELETE'){s.messages=[];s.pending=[];save(s);return out(200,{ok:true});}
 if(path!=='/api/chat'||method!=='POST')return out(404,{error:'接口不存在'});
 if(!configured())return out(503,{error:'请先配置 DeepSeek 密钥。',code:'AI_NOT_CONFIGURED'});
 if(Date.now()-last<1500)return out(429,{error:'请稍等片刻再发送。'});
 if(typeof b.message!=='string'||!b.message.trim()||b.message.length>2000)return out(400,{error:'消息须为1到2000字'});
 if(/sk-[a-zA-Z0-9_-]{16,}/.test(b.message))return out(400,{error:'不要在聊天里发送密钥，请使用安全配置入口。'});
 busy=true;last=Date.now();
 try{
 const messages=[{role:'system',content:persona()},...s.messages.slice(-12).map(({role,content})=>({role,content})),{role:'user',content:b.message.trim()}];
 const pending=[];let reply='';
 for(let round=0;round<4;round++){
 const result=await complete({model:'deepseek-flash',messages,tools,thinking:{type:'disabled'},max_tokens:1200,stream:false});
 const message=result?.choices?.[0]?.message;if(!message)throw Error('服务商返回不完整，请重试');
 if(message.tool_calls?.length){
 messages.push({role:'assistant',content:message.content||null,tool_calls:message.tool_calls});
 for(const call of message.tool_calls.slice(0,6)){
 let value;try{const args=JSON.parse(call.function.arguments);if(call.function.name==='read_workspace')value=readScope(s,args.scope);else if(call.function.name==='propose_change'){if(pending.length>=5)throw Error('每轮最多5项更改');const p=propose(s,args);pending.push(p);value={status:'awaiting_user_confirmation',proposalId:p.id,change:p.change};}else value={error:'工具不存在'};}catch(e){value={error:e.message};}
 messages.push({role:'tool',tool_call_id:call.id,content:JSON.stringify(value)});
 }
 continue;
 }
 reply=typeof message.content==='string'?message.content.trim():'';break;
 }
 if(!reply)reply=pending.length?'我已准备好下面的操作建议，请核对后点击确认。✨':'这次涉及的步骤有点多，我们可以一次处理一件事。你想先处理哪一项？';
 reply=reply.replace(/sk-[a-zA-Z0-9_-]{12,}/g,'[已隐藏]').slice(0,10000);
 s.pending=[...s.pending.filter(x=>x.expires>Date.now()),...pending].slice(-20);
 s.messages.push({role:'user',content:b.message.trim()},{role:'assistant',content:reply});s.messages=s.messages.slice(-60);save(s);return out(200,{reply,...chatView(s)});
 }finally{busy=false;}
 }catch(e){return out(400,{error:e instanceof Error?e.message:'操作失败'});}
 };
}
