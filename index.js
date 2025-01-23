"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var FastRouter = (function () {
    function FastRouter() {
        this.routeList = [];
        this.combinedRoutePattern = '';
        this.combinedRouteParameters = null;
    }
    FastRouter.prototype.trimChar = function (str, character) {
        if (character === str.charAt(0)) {
            str = str.substring(1);
        }
        if (str.length > 0 && character === str.charAt(str.length - 1)) {
            str = str.substring(0, str.length - 1);
        }
        return str;
    };
    FastRouter.prototype.setRoutes = function (routeList) {
        this.routeList = routeList;
    };
    FastRouter.prototype.setRoute = function (route) {
        this.routeList.push(route);
    };
    FastRouter.prototype.parseRoute = function (patternString) {
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
            parameters: parameters,
        };
    };
    FastRouter.prototype.combineRoutes = function () {
        var patterns = [];
        var parameters = [];
        for (var regExp = null, i = 0, len = this.routeList.length; i < len; i++) {
            regExp = this.parseRoute(this.routeList[i].route);
            patterns.push('(?:' + regExp.pattern + ')');
            parameters.push(regExp.parameters);
        }
        this.combinedRoutePattern = patterns.join('|');
        this.combinedRouteParameters = parameters;
    };
    FastRouter.prototype.getSubPatternPosition = function (matches) {
        var position = -1;
        for (var i = 1, len = matches.length; i < len; i++) {
            if (undefined !== matches[i]) {
                position = i;
                break;
            }
        }
        return position;
    };
    FastRouter.prototype.getMatchedRouteIndexByPath = function (path) {
        var index = 0;
        var str = this.trimChar(path, '/');
        for (var i = 0, len = this.routeList.length; i < len; i++) {
            if (str === this.trimChar(this.routeList[i].route, '/')) {
                index = i;
                break;
            }
        }
        return index;
    };
    FastRouter.prototype.getMatchedRouteIndexBySubPattern = function (subPatternPosition) {
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
    FastRouter.prototype.execInOrder = function (route) {
        var ret = null;
        var matches = null;
        for (var i = 0, regExp = null; i < this.routeList.length; i++) {
            regExp = this.parseRoute(this.routeList[i].route);
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
                handler: this.routeList[i].handler,
                parameters: parameters,
            };
            break;
        }
        return ret;
    };
    FastRouter.prototype.exec = function (route) {
        this.combineRoutes();
        if (null === this.combinedRouteParameters) {
            return null;
        }
        var matches = new RegExp(this.combinedRoutePattern).exec(route);
        if (null === matches) {
            return null;
        }
        var subPatternPosition = this.getSubPatternPosition(matches);
        var routeIndex = -1 === subPatternPosition
            ? this.getMatchedRouteIndexByPath(matches.input)
            : this.getMatchedRouteIndexBySubPattern(subPatternPosition);
        var parameterNames = this.combinedRouteParameters[routeIndex];
        var parameters = null;
        if (null !== parameterNames) {
            parameters = {};
            for (var i = 0, len = parameterNames.length; i < len; i++) {
                parameters[parameterNames[i]] = matches[subPatternPosition + i];
            }
        }
        return {
            handler: this.routeList[routeIndex].handler,
            parameters: parameters,
        };
    };
    return FastRouter;
}());
exports.default = FastRouter;
