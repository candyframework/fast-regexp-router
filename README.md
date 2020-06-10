## 快速正则路由

在现阶段的前端项目中，我们大量使用了前端路由，而这些路由中的参数都是使用正则表达式匹配出来的，随着项目的增大，一个用户请求可能需要 N 次正则匹配才能够找到与之对应的处理程序

本库就是为了解决这个匹配问题，我们将用户的所有路由进行预先合并，使其成为一个大路由，这样一个请求只需要进行一次匹配即可，大大减少了正则开销。

```
// 比如我们有如下几个路由
route1 = '/'
route2 = '/user/{uid}'
route3 = '/posts/{id}'

如果一个请求 为 `/posts/1` 那么需要三次才能找到正确匹配
```

FastRouter 的处理过程

```
// 比如我们有如下几个路由
route1 = '/'
route2 = '/user/{uid}'
route3 = '/posts/{id}'

// 首先系统会将删除路由进行合并，结果类似如下格式

(?:\\/)|(?:\\/home\\/(\\w+))|(?:\\/posts\\/(\\w+))
```

## 使用

```
const FastRouter = require('../index');

const routesList = [
    {
        route: '/',
        handler: () => {
            console.log('index route requested')
        }
    },
    {
        // 路由使用 大括号 识别参数
        // 而且可以限定参数类型 比如 '/user/{uid:\\d+}' 可以限制 uid 是数字
        // 如果不限定参数 那么默认参数可以为 字母 数字 或者 下划线
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
// reg.setRoutes(routesList);
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

// 也可以使用 execInOrder 方法进行逐个匹配
// 这样系统就不会对路由进行合并
const match2 = reg.execInOrder('/posts/10');
if(match2) {
    match2.handler(match2.parameters);
}
```