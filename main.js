const Koa = require('koa');
const koaBody = require('koa-body');
const cors = require('@koa/cors');
const textract = require('textract');
const fs = require('fs');
const lc = require('letter-count');
const log4js = require('koa-log4')

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
  const funList = [];
  for(let i = 0; i < filesKeys.length; i++){
    const fileKey = filesKeys[i];
    const filePath = files[fileKey].path;
    const fileType = files[fileKey].type;
    const file = fs.readFileSync(filePath);
    const count = await countText(name, file, fileType);
    totalCount+= count;
  }
  ctx.body = JSON.stringify({name, totalCount});
});

function countText(name, file, fileType){
  return new Promise((resolve, reject) => {
    textract.fromBufferWithMime(fileType, file, function(error, text) {
      if(error){
        errorLogger.error(error);
      };
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
  });
};

app.listen(8000, () => {
  infoLogger.info('Word Count API is now running on port 8000 ∠( ᐛ 」∠)＿');
});
