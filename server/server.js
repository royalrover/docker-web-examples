const Koa = require('koa');
const Router = require('koa-router');
const redis = require('redis');
const { promisify } = require('util');


let app = new Koa();
let router = new Router();
let redisClient = createRedisClient({
    // ip为docker-compose.yml配置的redis-server别名 rd，可在应用所在容器查看dns配置
    ip: 'rd',
    port: 6379,
    prefix: '',
    db: 1,
    password: null
});

function createRedisClient({port, ip, prefix, db}) {
    let client = redis.createClient(port, ip, {
        prefix,
        db,
        no_ready_check: true
    });
    
    client.on('reconnecting', (err)=>{
        console.warn(`redis client reconnecting, delay ${err.delay}ms and attempt ${err.attempt}`);
    });
    
    client.on('error', function (err) {
        console.error('Redis error!',err);
    });
    
    client.on('ready', function() {
        console.info(`redis初始化完成,就绪: ${ip}:${port}/${db}`);
    });
    return client;
}

function execReturnPromise(cmd, args) {
    return new Promise((res,rej)=>{
        redisClient.send_command(cmd, args, (e,reply)=>{
            if(e){
                rej(e);
            }else{
                res(reply);
            }
        });
    });
}

function batchReturnPromise() {
    return new Promise((res,rej)=>{
        let b = redisClient.batch();
        b.exec = promisify(b.exec);
        res(b);
    });
}


router.get('/', async (ctx, next) => {
    await execReturnPromise('set',['testkey','helloworld']);
    let ret = await execReturnPromise('get',['testkey']);
    ctx.body = {
        status: 'ok',
        result: ret,
    };
});

router.get('/batch', async (ctx, next) => {
    await execReturnPromise('set',['testkey','helloworld, batch!']);
    let batch = await batchReturnPromise();
    for(let i=0;i < 10;i++){
        batch.get('testkey');
    }
    let ret = await batch.exec();
    ctx.body = {
        status: 'ok',
        result: ret,
    };
});

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8090);