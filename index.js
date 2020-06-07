module.exports = (function () {
    function FastRegExpRouter() {
        this.routesList = [];
        this.combinedRoutePattern = '';
        this.combinedRouteParameters = null;
    }
    FastRegExpRouter.prototype.trimChar = function (str, character) {
        if (character === str.charAt(0)) {
            str = str.substring(1);
        }
        if (character === str.charAt(str.length - 1)) {
            str = str.substring(0, str.length - 1);
        }
        return str;
    };
    FastRegExpRouter.prototype.setRoutesList = function (routesList) {
        this.routesList = routesList;
    };
    FastRegExpRouter.prototype.setRoute = function (route, handler) {
        this.routesList.push({
            route: route,
            handler: handler
        });
    };
    FastRegExpRouter.prototype.toRegExpRouter = function (patternString) {
        var parameters = null;
        var pattern = patternString.replace(/\{/g, '(').replace(/\}/g, ')');
        var matchedParams = pattern.match(/\(\w+:?/g);
        if (null !== matchedParams) {
            parameters = [];
            for (var i = 0, len = matchedParams.length; i < len; i++) {
                pattern = pattern.replace(matchedParams[i], '(');
                pattern = pattern.replace('()', '(\\w+)');
                matchedParams[i] = matchedParams[i].replace(':', '');
                parameters.push(matchedParams[i].substring(1));
            }
        }
        pattern = this.trimChar(pattern, '/');
        pattern = '^\\/' + pattern.replace(/\//g, '\\/') + '\\/?$';
        return {
            pattern: pattern,
            parameters: parameters
        };
    };
    FastRegExpRouter.prototype.combineRoutes = function () {
        var patterns = [];
        var parameters = [];
        for (var regExp = null, i = 0, len = this.routesList.length; i < len; i++) {
            regExp = this.toRegExpRouter(this.routesList[i].route);
            patterns.push('(?:' + regExp.pattern + ')');
            parameters.push(regExp.parameters);
        }
        this.combinedRoutePattern = patterns.join('|');
        this.combinedRouteParameters = parameters;
    };
    FastRegExpRouter.prototype.execInOrder = function (route) {
        var ret = null;
        for (var i = 0, regExp = null, matches = null; i < this.routesList.length; i++) {
            regExp = this.toRegExpRouter(this.routesList[i].route);
            matches = new RegExp(regExp.pattern).exec(route);
            if (null === matches) {
                continue;
            }
            var parameters = null;
            if (null !== regExp.parameters) {
                parameters = {};
                for (var x = 1; x < matches.length; x++) {
                    if (undefined !== matches[x]) {
                        parameters[regExp.parameters[x - 1]] = matches[x];
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
    };
    FastRegExpRouter.prototype.exec = function (route) {
        this.combineRoutes();
        var matches = new RegExp(this.combinedRoutePattern).exec(route);
        if (null === matches) {
            return null;
        }
        var subPatternPosition = this.getSubPatternPosition(matches);
        var routeIndex = -1 === subPatternPosition
            ? this.getMatchedRouteIndexByPath(matches.input)
            : this.getMatchedRouteIndexBySubPattern(subPatternPosition);
        var parameters = null;
        var parameterNames = this.combinedRouteParameters[routeIndex];
        if (null !== parameterNames) {
            parameters = {};
            for (var i = 0, len = parameterNames.length; i < len; i++) {
                parameters[parameterNames[i]] =
                    matches[subPatternPosition + i];
            }
        }
        return {
            handler: this.routesList[routeIndex].handler,
            parameters: parameters
        };
    };
    FastRegExpRouter.prototype.getSubPatternPosition = function (matches) {
        var position = -1;
        for (var i = 1, len = matches.length; i < len; i++) {
            if (undefined !== matches[i]) {
                position = i;
                break;
            }
        }
        return position;
    };
    FastRegExpRouter.prototype.getMatchedRouteIndexByPath = function (path) {
        var index = 0;
        var str = this.trimChar(path, '/');
        for (var i = 0, len = this.routesList.length; i < len; i++) {
            if (str === this.trimChar(this.routesList[i].route, '/')) {
                index = i;
                break;
            }
        }
        return index;
    };
    FastRegExpRouter.prototype.getMatchedRouteIndexBySubPattern = function (subPatternPosition) {
        var find = 0;
        var str = '';
        var pattern = this.combinedRoutePattern;
        for (var i = 0, len = pattern.length - 1; i < len; i++) {
            if ('(' === pattern[i] && '?' !== pattern[i + 1]) {
                find += 1;
            }
            if (find === subPatternPosition) {
                str = pattern.substring(0, i);
                break;
            }
        }
        find = 0;
        for (var i = 0, len = str.length; i < len; i++) {
            if ('|' === str[i]) {
                find += 1;
            }
        }
        return find;
    };
    return FastRegExpRouter;
}());
