import Koa from 'koa';
import koaBody from 'koa-body';
import cors from '@koa/cors';
import { readFile } from 'node:fs/promises'
import { getTextExtractor } from 'office-text-extractor'
import lc from 'letter-count';
import log4js from 'koa-log4';

const infoLogger = log4js.getLogger('info');
infoLogger.level = 'info';

const errorLogger = log4js.getLogger('error');
errorLogger.level = 'error';

const app = new Koa();
app.use(koaBody({ multipart: true }));
app.use(cors());

app.use(async ctx => {
  const files = ctx.request.files;
  const data = ctx.request.body;
  let name = data.name;
  if(Array.isArray(data.name)){
    name = data.name[0];
  }else{
    name = data.name;
  }

  if(!files || !data){
    ctx.body = JSON.stringify({'message' :'Please provide word file to here.'});
    return;
  }

  ctx.set('Content-Type', 'application/json; charset=utf-8');
  const filesKeys = Object.keys(files);
  let totalCount = 0;
  for(let i = 0; i < filesKeys.length; i++){
    const fileKey = filesKeys[i];
    const filePath = files[fileKey].path;
    const fileType = files[fileKey].type;
    const file = await readFile(filePath);
    const count = await countText(name, file, fileType);
    totalCount+= count;
  }
  ctx.body = JSON.stringify({name, totalCount});
});

async function countText(name, file, fileType){
  return new Promise(async (resolve, reject) => {
    const extractor = getTextExtractor();
    const text = await extractor.extractText({ input: file, type: 'buffer' });
    const regax = new RegExp('【' + name + '】([^【]+)', 'g');
    const contents = text.match(regax);
    let charsCount = 0; 
    if(contents){
      for(let i = 0; i < contents.length; i++){
        const content = contents[i];
        const extraRegax = new RegExp('(【' + name + '】)([^【]+)', 'g');
        const baseText = extraRegax.exec(content)[2];
        const cleanText = baseText.replace(/ /g, '');
        const chars = (lc.count(cleanText.trim(), '-c')).chars;
        charsCount += chars;
      }
    }else{
      const cleanText = text.replace(/ /g, '');
      const chars = (lc.count(cleanText.trim(), '-c')).chars;
      charsCount += chars;
    }
    resolve(charsCount);
  });
};

app.listen(8000, () => {
  infoLogger.info('Word Count API is now running on port 8000 ∠( ᐛ 」∠)＿');
});
