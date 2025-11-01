import { AuxValid } from "./helpers/auxValid.js";

// Importar la clase Validator para acceder a todos los metodos disponibles

export class Validator {
    static validatorBody(data, schema, maxDepth = 10) {
            try {
                const validated = Validator.#validateStructure(data, schema, undefined, maxDepth);
                return validated;
            }
            catch (err) {
              AuxValid.middError(err.message, 400)
            }
    }
        static validateRegex(data, validRegex, nameOfField, message) {
            if (!data || !validRegex || !nameOfField || nameOfField.trim() === '') {
                return next(auxValid_js_1.AuxValid.middError('Missing parameters in function!', 400));
            }
            const field = data[nameOfField];
            const personalizedMessage = message ? ' ' + message : '';
            if (!field || typeof field !== 'string' || field.trim() === '') {
                AuxValid.middError(`Missing ${nameOfField}`, 400)
            }
            if (!validRegex.test(field)) {
                AuxValid.middError(`Invalid ${nameOfField} format!${personalizedMessage}`, 400)
            }
            return data
    }
    static paramId(paramId, fieldName, validator) {
            const id = paramId[fieldName];
            if (!id) {
                AuxValid.middError(`Missing ${fieldName}`, 400)
            }
            const isValid = typeof validator === 'function' ? validator(id) : validator.test(id);
            if (!isValid) {
                AuxValid.middError('Invalid parameters', 400)
            }
            return id
    }
    static ValidReg = {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PASSWORD: /^(?=.*[A-Z]).{8,}$/,
        UUIDv4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        INT: /^\d+$/, // Solo enteros positivos
        OBJECT_ID: /^[0-9a-fA-F]{24}$/, // ObjectId de MongoDB
        FIREBASE_ID: /^[A-Za-z0-9_-]{20}$/, // Firebase push ID
    };
    static splitObjectProps(obj, propsToExtract = []) {
        const { rest, extracted } = Object.entries(obj).reduce(
            (acc, [key, value]) => {
            if (propsToExtract.includes(key)) acc.extracted[key] = value
            else acc.rest[key] = value
            return acc
            },
            { rest: {}, extracted: {} }
        )

        return {rest, ...extracted }
    }

    static #validateStructure(data, schema, path, maxDepth = 20, depth = 0) {
        if (depth > maxDepth) {
            throw new Error(`Schema validation exceeded maximum depth at ${path || "root"}`);
        }
        if (Array.isArray(schema)) {
            if (!Array.isArray(data)) {
                throw new Error(`Expected array at ${path || "root"}`);
            }
            return data.map((item, i) => Validator.#validateStructure(item, schema[0], `${path}[${i}]`, maxDepth, depth + 1));
        }
        if (isFieldSchema(schema)) {
            return Validator.#validateField(data, schema, path);
        }
        if (isSchema(schema)) {
            if (typeof data !== "object" || data === null || Array.isArray(data)) {
                throw new Error(`Expected object at ${path || "root"}`);
            }
            const result = {};
            for (const key in schema) {
                const fieldSchema = schema[key];
                const fullPath = path ? `${path}.${key}` : key;
                const value = data[key];
                if (!(key in data)) {
                    if (typeof fieldSchema === "object" &&
                        "default" in fieldSchema) {
                        result[key] = fieldSchema.default;
                        continue;
                    }
                    else {
                        throw new Error(`Missing field: ${key} at ${fullPath}`);
                    }
                }
                result[key] = Validator.#validateStructure(value, fieldSchema, fullPath, maxDepth, depth + 1);
            }
            return result;
        }
        if (typeof schema === "string") {
            if (!["string", "int", "float", "boolean", "array"].includes(schema)) {
                throw new Error(`Invalid type '${schema}' at ${path || "root"}`);
            }
            return Validator.#validateField(data, { type: schema }, path);
        }
        throw new Error(`Invalid schema at ${path || "root"}`);
    }
    static #validateField(value, fieldSchema, path) {
        const type = typeof fieldSchema === "string"
            ? fieldSchema
            : fieldSchema.type ?? "string";
        const sanitize = typeof fieldSchema === "object" ? fieldSchema.sanitize : undefined;
        if (value === undefined || value === null) {
            if (typeof fieldSchema === "object" && "default" in fieldSchema) {
                return fieldSchema.default;
            }
            throw new Error(`Missing required field at ${path}`);
        }
        return AuxValid.validateValue(value, type, path, null, sanitize);
    }
}

function isFieldSchema(s) {
    return typeof s === "object" && s !== null && "type" in s;
}
function isSchema(s) {
    return typeof s === "object" && s !== null && !("type" in s);
}