const FastRouter = require('../index');

const routesList = [
    {
        route: '/',
        handler: () => {
            console.log('index route requested')
        }
    },
    {
        route: '/user/{uid}',
        handler: (params) => {
            console.log('user requested, uid is: ' + params.uid);
        }
    },
    {
        route: '/posts/{id}',
        handler: (params) => {
            console.log('article requested, id is: ' + params.id);
        }
    }
];

const reg = new FastRouter();
// 设置路由
// reg.setRoutesList(routesList);
// 或者依次设置路由
for(let v of routesList) {
    reg.setRoute(v.route, v.handler);
}

// 进行路由匹配
// 在进行路由匹配的时候 系统会先将用户预先准备的路由进行合并
// 这样可以大大缩短正则匹配次数
const match = reg.exec('/user/123');
if(match) {
    match.handler(match.parameters);
}

// 不合并路由 依次执行正则匹配
const match2 = reg.execInOrder('/posts/10');
if(match2) {
    match2.handler(match2.parameters);
}