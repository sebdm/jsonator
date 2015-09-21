/* Expand $refs in json schema, generates "empty object" json from json schema.
 * Does not implement the full json schema standard. Work in progress.
 * @author slind
 */
(function(definition) {
    module.exports = definition(require('lodash'));
})
(function(_) {
    var Jsonator = function(schema) {
        this.originalSchema = schema;
        this.refs = {};
        this.expandedSchema = _.merge({}, this.originalSchema);
        this.expandSchema(this.expandedSchema);
    };

    Jsonator.prototype.getExpandedSchema = function() {
        return this.expandedSchema;
    };

    Jsonator.prototype.buildRefs = function(path) {
        if (this.refs.hasOwnProperty(path)) {
            return;
        }
        var parser = this._parse(path);
        this.refs[path] = parser(this.originalSchema);
        this.expandSchema(this.refs[path]);
    };

    Jsonator.prototype.expandSchema = function(schema) {
        var self = this;
        _.each(schema, function(prop, key, obj) {
            if (_.isObject(prop)) {
                self.expandSchema(prop);
            }

            if (key === '$ref' && prop.indexOf('#/') === 0) {
                self.buildRefs(prop);
                delete obj.$ref;
                _.extend(obj, self.refs[prop]);
            }
        });
    };

    Jsonator.prototype._parse = function(path) {
        var split = path.substr(2).split('/');
        return function(obj) {
            _.each(split, function(part) {
                if (!obj) {
                    obj = null;
                    return;
                }
                obj = obj[part];
            });
            return obj;
        };
    };

    Jsonator.prototype.generateObjectForSchema = function() {
        return this.generateObject(this.expandedSchema);
    };

    Jsonator.prototype.generateObject = function(obj, required) {
        if (!obj) {
            return null;
        }
        var self = this;
        required = _.isUndefined(required) ? true : required;
        // specific null default value means we don't want any node... implicit null (no default at all) means we go with null
        if (obj.default === null) {
            return undefined;
        }

        if (obj.type === 'object') {
            var resulting = {};
            _.each(obj.properties, function(prop, key, obj) {
                var objRequired = obj.required && obj.required.indexOf(key) >= 0;
                var propValue = self.generateObject(prop, objRequired);

                // generate no node for specifically nulled properties
                if (!_.isUndefined(propValue)) {
                    resulting[key] = propValue;
                }
            });
            return resulting;
        } else {

            return obj.default || obj.default === false ?
                obj.default
                : null;
        }
    };

    Jsonator.prototype.defaultFor = function(type) {
        switch (type) {
            case 'string':
                return null;
            case 'boolean':
                return null;
            case 'number':
            case 'integer':
                return null;
            case 'array':
                return null;
        }
    };

    return Jsonator;
});