## Fast Router

## Principle

```typescript
route1 = '/'
route2 = '/user/{uid}'
route3 = '/posts/{id}'

// The system will process these routes into the following format
(?:\\/)|(?:\\/user\\/(\\w+))|(?:\\/posts\\/(\\w+))
```

## Usage

```typescript
import FastRouter from 'fast-regexp-router'

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
// reg.setRoutes(routesList);
// Or
for(let v of routesList) {
    reg.setRoute(v);
}

const match = reg.exec('/user/123');
if(match) {
    match.handler(match.parameters);
}
```
