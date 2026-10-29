export async function prepareImage(bytes,type='image/jpeg'){
 if(bytes.byteLength>8*1024*1024)throw Error('请选择8MB以内的图片');
 const blob=new Blob([bytes],{type}),url=URL.createObjectURL(blob),image=new Image();
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('无法识别图片，请选择JPEG、PNG或WebP'));image.src=url});let scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');let output;for(let attempt=0;attempt<7;attempt++){canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const context=canvas.getContext('2d');if(!context)throw Error('设备不支持图片处理');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);output=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));if(output&&output.size<=300000)break;scale*=.8;}if(!output||output.size>400000)throw Error('图片压缩失败，请换一张图片');const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(output)});return {id:crypto.randomUUID(),dataUrl,width:canvas.width,height:canvas.height};}finally{URL.revokeObjectURL(url)}
}
export async function uploadGuestImages(state,api){
 const ids=[...new Set((state.journal||[]).flatMap(e=>e.images||[]))];for(const id of ids){const image=await api('/api/guest/media/'+id);await api('/api/media',image);}return ids.length;
}
