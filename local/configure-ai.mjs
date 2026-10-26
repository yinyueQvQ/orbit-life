import {saveKey,secretFile} from './credentials.mjs';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
if(process.argv.includes('--stdin')){const rl=createInterface({input:process.stdin}); const value=await new Promise(r=>rl.once('line',r));rl.close();if(value.length>1000)throw Error('输入过长');await saveKey(value);console.log('密钥已加密保存到项目外，未写入项目。');process.exit(0);}
else{
 const command="$ErrorActionPreference='Stop'; $s=Read-Host 'DeepSeek API Key (hidden)' -AsSecureString; $d=Split-Path -Parent $env:ORBIT_SECRET_PATH; [IO.Directory]::CreateDirectory($d)|Out-Null; [IO.File]::WriteAllText($env:ORBIT_SECRET_PATH,(ConvertFrom-SecureString $s)); Write-Host 'Saved securely.'";
 const child=spawn('powershell.exe',['-NoProfile','-Command',command],{env:{...process.env,PSModulePath:(process.env.SystemRoot||'C:/Windows')+'/System32/WindowsPowerShell/v1.0/Modules',ORBIT_SECRET_PATH:secretFile()},stdio:'inherit'});child.on('close',code=>{process.exitCode=code||0;});
}
