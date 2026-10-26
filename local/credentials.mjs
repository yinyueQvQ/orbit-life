import process from 'node:process';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
const directory=()=>path.join(process.env.LOCALAPPDATA||path.join(process.env.USERPROFILE,'AppData/Local'),'Orbit');
export const secretFile=()=>path.join(directory(),'deepseek.key.dpapi');
export const hasKey=()=>Boolean(process.env.DEEPSEEK_API_KEY)||existsSync(secretFile());
export async function readKey(){
 if(process.env.DEEPSEEK_API_KEY)return process.env.DEEPSEEK_API_KEY.trim();
 if(!existsSync(secretFile()))return null;
 const command="$ErrorActionPreference='Stop'; $s=Get-Content -Raw -LiteralPath $env:ORBIT_SECRET_PATH | ConvertTo-SecureString; $p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try {[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($p))} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}";
 return await new Promise((resolve,reject)=>{const p=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,env:{...process.env,PSModulePath:(process.env.SystemRoot||'C:/Windows')+'/System32/WindowsPowerShell/v1.0/Modules',ORBIT_SECRET_PATH:secretFile()},stdio:['ignore','pipe','ignore']});let result='';const timer=setTimeout(()=>{p.kill();reject(Error('credential unavailable'));},10000);p.stdout.on('data',c=>{result+=c;});p.on('error',()=>{clearTimeout(timer);reject(Error('credential unavailable'));});p.on('close',code=>{clearTimeout(timer);code===0?resolve(result.trim()):reject(Error('credential unavailable'));});});
}
export async function saveKey(input){
 if(process.platform!=='win32')throw Error('加密配置仅支持 Windows，其他系统请使用 DEEPSEEK_API_KEY');
 const command="$ErrorActionPreference='Stop'; $d=Split-Path -Parent $env:ORBIT_SECRET_PATH; [IO.Directory]::CreateDirectory($d)|Out-Null; $value=[Console]::In.ReadToEnd().Trim(); if($value.Length -lt 12){throw 'Invalid key'}; $s=ConvertTo-SecureString -String $value -AsPlainText -Force; [IO.File]::WriteAllText($env:ORBIT_SECRET_PATH,(ConvertFrom-SecureString $s)); $value=$null;";
 await new Promise((resolve,reject)=>{const p=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,env:{...process.env,PSModulePath:(process.env.SystemRoot||'C:/Windows')+'/System32/WindowsPowerShell/v1.0/Modules',ORBIT_SECRET_PATH:secretFile()},stdio:['pipe','ignore','ignore']});const timer=setTimeout(()=>{p.kill();reject(Error('配置超时'));},10000);p.on('error',()=>{clearTimeout(timer);reject(Error('无法保存凭据'));});p.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(Error('无法保存凭据'));});p.stdin.end(input);});
}
