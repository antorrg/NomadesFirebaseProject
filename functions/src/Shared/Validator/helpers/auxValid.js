export class AuxValid {
    static middError(message, status) {
        const error = new Error(message);
        error.status = status || 500;
        throw error;
    }
    // Nueva función para manejar valores por defecto según el tipo
    static #getDefaultValue(type) {
        switch (type) {
            case 'boolean': return false;
            case 'int': return 1;
            case 'float': return 1.0;
            case 'string': return '';
            default: return null;
        }
    }
    static #validateBoolean(value) {
        if (typeof value === 'boolean')
            return value;
        if (value === 'true')
            return true;
        if (value === 'false')
            return false;
        throw new Error('Invalid boolean value');
    }
    static #validateInt(value) {
        const intValue = Number(value);
        if (isNaN(intValue) || !Number.isInteger(intValue))
            throw new Error('Invalid integer value');
        return intValue;
    }
    static #validateFloat(value) {
        const floatValue = parseFloat(value);
        if (isNaN(floatValue))
            throw new Error('Invalid float value');
        return floatValue;
    }
    static #escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\//g, '&#x2F;')
            .replace(/\\/g, '&#x5C;')
            .replace(/`/g, '&#96;');
    }
    static #trimString(str) {
        return String(str).trim();
    }
    static validateValue(value, fieldType, fieldName, itemIndex, sanitize) {
        const indexInfo = itemIndex !== null ? ` in item[${itemIndex}]` : '';
        if (typeof value === 'object') {
            if (value instanceof String || value instanceof Number || value instanceof Boolean) {
                value = value.valueOf();
            }
        }
        switch (fieldType) {
            case 'boolean':
                return AuxValid.#validateBoolean(value);
            case 'int':
                return AuxValid.#validateInt(value);
            case 'float':
                return AuxValid.#validateFloat(value);
            case 'array':
                if (!Array.isArray(value)) {
                    throw new Error(`Invalid array value for field ${fieldName}${indexInfo}`);
                }
                return value;
            case 'string':
            default:
                if (typeof value !== 'string') {
                    throw new Error(`Invalid string value for field ${fieldName}${indexInfo}`);
                }
                if (sanitize) {
                    if (sanitize.trim)
                        value = AuxValid.#trimString(value);
                    if (sanitize.escape)
                        value = AuxValid.#escapeHTML(value);
                    if (sanitize.lowercase)
                        value = value.toLowerCase();
                    if (sanitize.uppercase)
                        value = value.toUpperCase();
                }
                return value;
        }
    }
}
