import {env} from 'cloudflare:workers';
import {createAccountAPI,callDeepSeek} from '../server/accounts.mjs';
import {d1Store} from '../server/store.mjs';
export async function cloudAPI(request:Request){if(!env.DB)return Response.json({error:'数据库尚未就绪'},{status:503});return createAccountAPI({store:d1Store(env.DB),complete:callDeepSeek})(request);}
