export async function extractPdf(buffer,onProgress=(page=0,total=0)=>{}){
 if(buffer.byteLength>8*1024*1024)throw Error('请选择8MB以内的PDF');
 const pdf=await import('pdfjs-dist/legacy/build/pdf.mjs');pdf.GlobalWorkerOptions.workerSrc='/pdf-assets/pdf.worker.min.mjs';
 const loading=pdf.getDocument({data:new Uint8Array(buffer),cMapUrl:'/pdf-assets/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdf-assets/standard_fonts/',wasmUrl:'/pdf-assets/wasm/',isEvalSupported:false,enableXfa:false});
 let document;try{document=await loading.promise;if(document.numPages>120)throw Error('PDF超过120页，请拆分后导入');const pages=[];let count=0;for(let i=1;i<=document.numPages;i++){const page=await document.getPage(i),content=await page.getTextContent();let text='';for(const item of content.items)if('str'in item)text+=item.str+(item.hasEOL?'\n':' ');count+=text.length;if(count>30000)throw Error('提取文字超过30000字，请缩小PDF范围后再导入');pages.push({page:i,text});onProgress(i,document.numPages);page.cleanup();}if(count<20)throw Error('未提取到足够文字。这可能是扫描版PDF，请先进行OCR识别；没有生成计划。');return pages;}catch(e){if(e.name==='PasswordException')throw Error('PDF已加密，请先解锁后重新导入');throw e;}finally{await loading.destroy();}
}
