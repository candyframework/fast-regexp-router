/**
 * 快速正则路由
 */
module.exports = class FastRegExpRouter {
    constructor() {
        /**
         * @property {Array} routesList
         *
         * [
         *      {route: '/home', handler: func1},
         *      {route: '/user/{uid}', handler: func2},
         * ]
         */
        this.routesList = [];

        /**
         * @property {String} combinedRoutePattern
         */
        this.combinedRoutePattern = '';

        /**
         * @property {Array} combinedRouteParameters
         */
        this.combinedRouteParameters = null;
    }

    /**
     * 删除两端字符
     *
     * @param {String} str 待处理的字符串
     * @param {String} character 要删除的字符
     * @return {String} 处理后的字符串
     */
    trimChar(str, character) {
        if(character === str.charAt(0)) {
            str = str.substring(1);
        }
        if(character === str.charAt(str.length - 1)) {
            str = str.substring(0, str.length - 1);
        }

        return str;
    }

    /**
     * 设置路由
     *
     * @param {Array} routesList
     */
    setRoutes(routesList) {
        this.routesList = routesList;
    }

    /**
     * 设置一条路由
     *
     * @param {String} route
     * @param {any} handler
     */
    setRoute(route, handler) {
        this.routesList.push({
            route: route,
            handler: handler
        });
    }

    /**
     * 解析正则路由
     *
     * @param {String} patternString 路由
     *
     * 由于反斜线的转译影响 元字符需要两个反斜线
     *
     * pattern: /home/{uid}         -> \\/home\\/(\\w+)
     * pattern: /home/{uid}/{page}  -> \\/home\\/(\\w+)\\/(\\w+)
     * pattern: /home/{uid:\\d+}    -> \\/home\\/(\\d+)
     * pattern: /home/profile       -> \\/home\\/profile
     *
     * @return {Object}
     *
     * {
     *      pattern: '',
     *      parameters: [uid, ...]
     * }
     */
    toRegExpRouter(patternString) {
        let parameters = null;

        // format /home/(uid)/(page:\\d+)
        let pattern = patternString.replace(/\{/g, '(').replace(/\}/g, ')');

        // search parameters [ '(uid', '(page:' ]
        let matchedParams = pattern.match(/\(\w+:?/g);

        // replace parameters
        if(null !== matchedParams) {
            parameters = [];

            for(let i=0,len=matchedParams.length; i<len; i++) {
                // () or (\\d+)
                pattern = pattern.replace(matchedParams[i], '(');
                pattern = pattern.replace('()', '(\\w+)');

                matchedParams[i] = matchedParams[i].replace(':', '');

                parameters.push( matchedParams[i].substring(1) );
            }
        }

        pattern = this.trimChar(pattern, '/');
        pattern = '^\\/' + pattern.replace(/\//g, '\\/') + '\\/?$';

        return {
            pattern: pattern,
            parameters: parameters
        };
    }

    /**
     * 合并路由
     */
    combineRoutes() {
        let patterns = [];
        let parameters = [];

        for(let regExp=null, i=0, len=this.routesList.length; i<len; i++) {
            regExp = this.toRegExpRouter(this.routesList[i].route);

            patterns.push( '(?:' + regExp.pattern + ')' );
            parameters.push(regExp.parameters);
        }

        this.combinedRoutePattern = patterns.join('|');
        this.combinedRouteParameters = parameters;
    }

    /**
     * 依次进行路由匹配
     *
     * @param {String} route 路由
     * @return null | Object
     */
    execInOrder(route) {
        let ret = null;

        for(let i=0, regExp=null, matches=null; i<this.routesList.length; i++) {
            regExp = this.toRegExpRouter(this.routesList[i].route);
            matches = new RegExp(regExp.pattern).exec(route);

            // 没有匹配到路由
            if(null === matches) {
                continue;
            }

            let parameters = null;
            if(null !== regExp.parameters) {
                parameters = {};

                for(let x=1; x<matches.length; x++) {
                    if(undefined !== matches[x]) {
                        parameters[ regExp.parameters[x - 1] ] = matches[x];
                    }
                }
            }

            ret = {
                handler: this.routesList[i].handler,
                parameters: parameters
            };

            break;
        }

        return ret;
    }

    /**
     * 执行路由匹配
     *
     * @param {String} route 路由
     * @return null | Object
     */
    exec(route) {
        this.combineRoutes();

        let matches = new RegExp(this.combinedRoutePattern).exec(route);
        // 没有匹配到路由
        if(null === matches) {
            return null;
        }

        // 匹配到路由
        let subPatternPosition = this.getSubPatternPosition(matches);
        let routeIndex = -1 === subPatternPosition
            ? this.getMatchedRouteIndexByPath(matches.input)
            : this.getMatchedRouteIndexBySubPattern(subPatternPosition);

        let parameters = null;
        let parameterNames = this.combinedRouteParameters[routeIndex];
        if(null !== parameterNames) {
            parameters = {};

            for(let i=0,len=parameterNames.length; i<len; i++) {
                parameters[ parameterNames[i] ] =
                    matches[subPatternPosition + i];
            }
        }

        return {
            handler: this.routesList[routeIndex].handler,
            parameters: parameters
        };
    }

    /**
     * 查找匹配到的子模式位置
     */
    getSubPatternPosition(matches) {
        let position = -1;

        // matches: [ '/path/123', undefined, '/path/123', 123]
        for(let i=1,len=matches.length; i<len; i++) {
            if(undefined !== matches[i]) {
                position = i;
                break;
            }
        }

        return position;
    }

    /**
     * find route position which has no parameters
     *
     * @param {String} path
     * @return {Number}
     */
    getMatchedRouteIndexByPath(path) {
        let index = 0;

        let str = this.trimChar(path, '/');
        for(let i=0, len=this.routesList.length; i<len; i++) {
            if( str === this.trimChar(this.routesList[i].route, '/') ) {
                index = i;
                break;
            }
        }

        return index;
    }

    /**
     * 查找匹配的路由位置
     *
     * @param {Number} subPatternPosition 匹配的子模式位置
     * @return {Number}
     */
    getMatchedRouteIndexBySubPattern(subPatternPosition) {
        let find = 0;
        let str = '';
        let pattern = this.combinedRoutePattern;

        for(let i=0, len=pattern.length - 1; i<len; i++) {
            if('(' === pattern[i] && '?' !== pattern[i + 1]) {
                find += 1;
            }

            if(find === subPatternPosition) {
                str = pattern.substring(0, i);
                break;
            }
        }

        find = 0;
        for(let i=0, len=str.length; i<len; i++) {
            if('|' === str[i]) {
                find += 1;
            }
        }

        return find;
    }
}
