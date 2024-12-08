export type Route = {
    route: string
    handler: any
}

export type RegExpRouter = {
    pattern: string
    parameters: string[] | null
}

/**
 * FastRouter
 */
export default class FastRouter {
    public routeList: Route[] = [];

    public combinedRoutePattern: string = '';
    public combinedRouteParameters: (string[] | null)[] | null = null;
    
    protected trimChar(str: string, character: string): string {
        if(character === str.charAt(0)) {
            str = str.substring(1);
        }
        if(character === str.charAt(str.length - 1)) {
            str = str.substring(0, str.length - 1);
        }

        return str;
    }

    protected setRoutes(routeList: Route[]): void {
        this.routeList = routeList;
    }

    protected setRoute(route: Route): void {
        this.routeList.push(route);
    }

    /**
     * Parse route
     * 
     * ```
     * pattern: /home/{uid}         -> \\/home\\/(\\w+)
     * pattern: /home/{uid}/{page}  -> \\/home\\/(\\w+)\\/(\\w+)
     * pattern: /home/{uid:\\d+}    -> \\/home\\/(\\d+)
     * pattern: /home/profile       -> \\/home\\/profile
     * ```
     */
    protected parseRoute(patternString: string): RegExpRouter {
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

    protected combineRoutes(): void {
        let patterns = [];
        let parameters = [];

        for(let regExp=null, i=0, len=this.routeList.length; i<len; i++) {
            regExp = this.parseRoute(this.routeList[i].route);

            patterns.push( '(?:' + regExp.pattern + ')' );
            parameters.push(regExp.parameters);
        }

        this.combinedRoutePattern = patterns.join('|');
        this.combinedRouteParameters = parameters;
    }

    protected getSubPatternPosition(matches:RegExpExecArray): number {
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

    protected getMatchedRouteIndexByPath(path: string): number {
        let index = 0;

        let str = this.trimChar(path, '/');
        for(let i=0, len=this.routeList.length; i<len; i++) {
            if( str === this.trimChar(this.routeList[i].route, '/') ) {
                index = i;
                break;
            }
        }

        return index;
    }

    protected getMatchedRouteIndexBySubPattern(subPatternPosition: number): number {
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

    public execInOrder(route: string): {
        handler: any;
        parameters: Record<string, any> | null;
    } | null {
        let ret = null;
        let matches: RegExpExecArray | null = null

        for(let i=0, regExp=null; i<this.routeList.length; i++) {
            regExp = this.parseRoute(this.routeList[i].route);
            matches = new RegExp(regExp.pattern).exec(route);

            // not match
            if(null === matches) {
                continue;
            }

            let parameters: Record<string, any> | null = null;
            if(null !== regExp.parameters) {
                parameters = {};

                for(let x=1; x<matches.length; x++) {
                    if(undefined !== matches[x]) {
                        parameters[ regExp.parameters[x - 1] ] = matches[x];
                    }
                }
            }

            ret = {
                handler: this.routeList[i].handler,
                parameters: parameters
            };

            break;
        }

        return ret;
    }

    public exec(route: string): {
        handler: any;
        parameters: Record<string, any> | null;
    } | null {
        this.combineRoutes();
        if(null === this.combinedRouteParameters) {
            return null;
        }

        let matches = new RegExp(this.combinedRoutePattern).exec(route);
        
        // not match
        if(null === matches) {
            return null;
        }

        let subPatternPosition = this.getSubPatternPosition(matches);
        let routeIndex = -1 === subPatternPosition
            ? this.getMatchedRouteIndexByPath(matches.input)
            : this.getMatchedRouteIndexBySubPattern(subPatternPosition);

        let parameters: Record<string, any> | null = null;
        let parameterNames = this.combinedRouteParameters[routeIndex];
        if(null !== parameterNames) {
            parameters = {};

            for(let i=0,len=parameterNames.length; i<len; i++) {
                parameters[ parameterNames[i] ] =
                    matches[subPatternPosition + i];
            }
        }

        return {
            handler: this.routeList[routeIndex].handler,
            parameters: parameters
        };
    }
}
